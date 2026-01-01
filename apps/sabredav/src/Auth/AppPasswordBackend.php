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
 */
class AppPasswordBackend extends AbstractBasic
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
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
        // Remove dashes from formatted password (xxxx-xxxx-xxxx-xxxx -> xxxxxxxxxxxxxxxx)
        $rawPassword = str_replace('-', '', $password);
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

        return false;
    }
}
