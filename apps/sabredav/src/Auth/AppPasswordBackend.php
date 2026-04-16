<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Auth;

use PDO;
use Sabre\DAV\Auth\Backend\AbstractBasic;

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

    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
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
        $prefix = substr($rawPassword, 0, 8);

        // Find user by email
        $stmt = $this->pdo->prepare('
            SELECT id, external_id, email
            FROM auth.users
            WHERE email = :email
        ');
        $stmt->execute(['email' => $username]);
        $user = $stmt->fetch();

        if (!$user) {
            $this->logFailedAttempt($username, 'user_not_found');
            return false;
        }

        // Find matching app passwords by prefix
        $stmt = $this->pdo->prepare('
            SELECT id, password_hash, password_prefix
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
        while ($row = $stmt->fetch()) {
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

                return true;
            }
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
