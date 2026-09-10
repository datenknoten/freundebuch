<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Auth;

use PDO;
use Sabre\DAV\Auth\Backend\AbstractBasic;
use Sabre\HTTP\RequestInterface;
use Sabre\HTTP\ResponseInterface;

/**
 * HTTP Basic Auth backend using app-specific passwords.
 *
 * This backend validates credentials against the auth.app_passwords table.
 * Users authenticate with their email and an app-specific password.
 *
 * SECURITY NOTE: Brute force protection should be implemented at the
 * infrastructure level (nginx, WAF, or load balancer) using:
 * - Rate limiting per IP address (e.g., 10 attempts per minute)
 * - Automatic IP blocking after repeated failures
 * - CAPTCHA after N failed attempts
 *
 * This backend logs failed authentication attempts for monitoring and alerting.
 */
class AppPasswordBackend extends AbstractBasic
{
    private const FORMAT_CHUNK_SIZE = 4;
    private const FORMAT_STRIDE = self::FORMAT_CHUNK_SIZE + 1;
    private const PREFIX_LENGTH = 8;

    /**
     * Bcrypt hash of the string 'dummy' at cost 10 (the cost the backend uses
     * for real app passwords). Compared against on the rejection paths that
     * would otherwise return without any bcrypt work, so an unknown email
     * costs the same as a wrong password.
     */
    private const DUMMY_HASH = '$2y$10$DN8Uky1VqK6OaPPi84DNAeMFrQ3TFJxWjLYkI1fr5nBMmHVItXd4i';

    private PDO $pdo;

    /**
     * Address of the row that validateUserPass() last matched, exactly as
     * auth."user".email stores it.
     */
    private ?string $canonicalEmail = null;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * The principal backend exposes principals/<stored email>, while Basic Auth
     * carries whatever casing the client typed. The ACL plugin compares
     * principal URIs byte-for-byte, so an upper-case login would authenticate
     * and then be denied access to its own address book.
     *
     * The canonical form is the stored address itself, not strtolower() of the
     * typed one: auth."user" is constrained to `email = lower(email)` with
     * Postgres' locale-aware lower(), and the lookup below matches through the
     * same function. PHP strtolower() is byte-wise ASCII-only, so it maps
     * 'MÜLLER@example.com' to 'mÜller@example.com' and produced a principal URI
     * no principal backend row could ever match. Echoing the matched row makes
     * both sides identical by construction.
     *
     * @return array{0: bool, 1: string}
     */
    public function check(RequestInterface $request, ResponseInterface $response): array
    {
        $this->canonicalEmail = null;
        $result = parent::check($request, $response);
        if ($result[0] === true && $this->canonicalEmail !== null) {
            $result[1] = $this->principalPrefix . $this->canonicalEmail;
        }

        return $result;
    }

    /**
     * Invert the server-side formatPassword (4-char chunks joined with '-').
     *
     * Base64url — the alphabet used for raw passwords — includes '-' as a
     * valid character, so naive `str_replace('-', '', ...)` corrupts passwords
     * whose raw contains '-'. Walk the input and strip only the dashes that
     * sit at separator positions. Fall back to full strip for malformed input
     * so bcrypt still gets a deterministic value (and fails the compare).
     */
    private function unformatPassword(string $input): string
    {
        $len = strlen($input);
        $wellFormatted = $len >= self::FORMAT_STRIDE && ($len + 1) % self::FORMAT_STRIDE === 0;
        if (!$wellFormatted) {
            return str_replace('-', '', $input);
        }
        $out = '';
        for ($i = 0; $i < $len; $i++) {
            if ($i % self::FORMAT_STRIDE === self::FORMAT_CHUNK_SIZE) {
                if ($input[$i] !== '-') {
                    return str_replace('-', '', $input);
                }
                continue;
            }
            $out .= $input[$i];
        }
        return $out;
    }

    /**
     * Validates a username and password.
     *
     * @param string $username The user's email address
     * @param string $password The app-specific password (may include dashes)
     * @return bool True if valid, false otherwise
     */
    protected function validateUserPass($username, $password): bool
    {
        $rawPassword = $this->unformatPassword($password);
        // Stored lookup key: left(sha256(<raw 8-char prefix>), 16 hex chars).
        // Must stay in sync with hashAppPasswordPrefix() in
        // apps/backend/src/services/app-passwords.service.ts.
        $prefix = substr(hash('sha256', substr($rawPassword, 0, self::PREFIX_LENGTH)), 0, 16);

        // Find user by email
        // auth."user" is the identity of record; auth.users only anchors the
        // integer FKs (ADR 0003).
        $stmt = $this->pdo->prepare('
            SELECT u.id, u.external_id, bu.email
            FROM auth.users u
            JOIN auth."user" bu ON bu.id = u.external_id::text
            WHERE bu.email = lower(:email)
        ');
        $stmt->execute(['email' => $username]);
        $user = $stmt->fetch();

        if (!$user) {
            // Spend the same bcrypt round a real candidate would have cost.
            password_verify($rawPassword, self::DUMMY_HASH);
            $this->logFailedAttempt($username, 'user_not_found');
            return false;
        }

        // Find matching app passwords by prefix
        $stmt = $this->pdo->prepare('
            SELECT id, password_hash
            FROM auth.app_passwords
            WHERE user_id = :user_id
              AND password_prefix = :prefix
              AND revoked_at IS NULL
        ');
        $stmt->execute([
            'user_id' => $user['id'],
            'prefix' => $prefix,
        ]);

        // Try each matching password
        $candidates = 0;
        while ($row = $stmt->fetch()) {
            $candidates++;
            // Node.js bcrypt uses $2b$ prefix, PHP uses $2y$ - they are compatible
            $hash = str_replace('$2b$', '$2y$', $row['password_hash']);
            if (password_verify($rawPassword, $hash)) {
                // Update last_used_at
                $updateStmt = $this->pdo->prepare('
                    UPDATE auth.app_passwords
                    SET last_used_at = NOW()
                    WHERE id = :id
                ');
                $updateStmt->execute(['id' => $row['id']]);

                $this->canonicalEmail = (string) $user['email'];

                return true;
            }
        }

        if ($candidates === 0) {
            // No stored prefix matched: spend the same bcrypt round a real
            // candidate would have cost.
            password_verify($rawPassword, self::DUMMY_HASH);
        }

        $this->logFailedAttempt($username, 'invalid_password');
        return false;
    }

    /**
     * Log a failed authentication attempt for security monitoring.
     *
     * @param string $username The attempted username
     * @param string $reason The reason for failure
     */
    private function logFailedAttempt(string $username, string $reason): void
    {
        $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

        // Log to PHP error log for monitoring/alerting
        error_log(sprintf(
            '[AUTH_FAILED] email=%s reason=%s ip=%s user_agent=%s',
            $username,
            $reason,
            $clientIp,
            substr($userAgent, 0, 100)
        ));
    }
}
