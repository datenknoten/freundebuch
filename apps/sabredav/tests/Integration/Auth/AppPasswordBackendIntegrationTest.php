<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Tests\Integration\Auth;

use Freundebuch\DAV\Auth\AppPasswordBackend;
use Freundebuch\DAV\Tests\Integration\IntegrationTestCase;
use PHPUnit\Framework\Attributes\Test;
use ReflectionClass;

/**
 * Integration tests for AppPasswordBackend.
 *
 * Tests the authentication backend against a real PostgreSQL database.
 */
class AppPasswordBackendIntegrationTest extends IntegrationTestCase
{
    private AppPasswordBackend $backend;

    protected function setUp(): void
    {
        parent::setUp();
        $this->backend = new AppPasswordBackend($this->getPdo());
    }

    #[Test]
    public function validateUserPassReturnsFalseForNonExistentUser(): void
    {
        $result = $this->callValidateUserPass('nonexistent@example.com', 'anypassword12345678');

        $this->assertFalse($result);
    }

    #[Test]
    public function validateUserPassReturnsFalseForUserWithNoAppPasswords(): void
    {
        $this->createTestUser('user@example.com');

        $result = $this->callValidateUserPass('user@example.com', 'anypassword12345678');

        $this->assertFalse($result);
    }

    #[Test]
    public function validateUserPassReturnsFalseForNonMatchingPrefix(): void
    {
        $user = $this->createTestUser('user@example.com');
        $this->createAppPassword((int) $user['id'], 'Test Device', 'abcd1234efgh5678');

        // Different prefix
        $result = $this->callValidateUserPass('user@example.com', 'xxxx1234efgh5678');

        $this->assertFalse($result);
    }

    #[Test]
    public function validateUserPassReturnsFalseForWrongPassword(): void
    {
        $user = $this->createTestUser('user@example.com');
        $this->createAppPassword((int) $user['id'], 'Test Device', 'abcd1234efgh5678');

        // Same prefix, wrong rest of password
        $result = $this->callValidateUserPass('user@example.com', 'abcd1234wrongpwd!');

        $this->assertFalse($result);
    }

    #[Test]
    public function validateUserPassReturnsTrueForCorrectPassword(): void
    {
        $user = $this->createTestUser('user@example.com');
        $this->createAppPassword((int) $user['id'], 'Test Device', 'abcd1234efgh5678');

        $result = $this->callValidateUserPass('user@example.com', 'abcd1234efgh5678');

        $this->assertTrue($result);
    }

    #[Test]
    public function validateUserPassAcceptsPasswordWithDashes(): void
    {
        $user = $this->createTestUser('user@example.com');
        $this->createAppPassword((int) $user['id'], 'Test Device', 'abcd1234efgh5678');

        // Formatted with dashes
        $result = $this->callValidateUserPass('user@example.com', 'abcd-1234-efgh-5678');

        $this->assertTrue($result);
    }

    #[Test]
    public function validateUserPassUpdatesLastUsedAt(): void
    {
        $user = $this->createTestUser('user@example.com');
        $appPassword = $this->createAppPassword((int) $user['id'], 'Test Device', 'abcd1234efgh5678');

        // Verify last_used_at is initially null
        $stmt = $this->getPdo()->prepare('SELECT last_used_at FROM auth.app_passwords WHERE id = :id');
        $stmt->execute(['id' => $appPassword['id']]);
        $before = $stmt->fetch();
        $this->assertNull($before['last_used_at']);

        // Authenticate
        $this->callValidateUserPass('user@example.com', 'abcd1234efgh5678');

        // Verify last_used_at is now set
        $stmt->execute(['id' => $appPassword['id']]);
        $after = $stmt->fetch();
        $this->assertNotNull($after['last_used_at']);
    }

    #[Test]
    public function validateUserPassRejectsRevokedPassword(): void
    {
        $user = $this->createTestUser('user@example.com');
        $appPassword = $this->createAppPassword((int) $user['id'], 'Test Device', 'abcd1234efgh5678');

        // Revoke the password
        $this->getPdo()->prepare('UPDATE auth.app_passwords SET revoked_at = NOW() WHERE id = :id')
            ->execute(['id' => $appPassword['id']]);

        $result = $this->callValidateUserPass('user@example.com', 'abcd1234efgh5678');

        $this->assertFalse($result);
    }

    #[Test]
    public function validateUserPassTriesMultiplePasswordsWithSamePrefix(): void
    {
        $user = $this->createTestUser('user@example.com');

        // Create two passwords with the same prefix
        $this->createAppPassword((int) $user['id'], 'Device 1', 'abcd1234wrongpwd1');
        $this->createAppPassword((int) $user['id'], 'Device 2', 'abcd1234correct!');

        // Should find the correct password among multiple candidates
        $result = $this->callValidateUserPass('user@example.com', 'abcd1234correct!');

        $this->assertTrue($result);
    }

    #[Test]
    public function validateUserPassHandlesNodeJsBcryptPrefix(): void
    {
        $user = $this->createTestUser('user@example.com');
        $rawPassword = 'abcd1234efgh5678';

        // Create a bcrypt hash with Node.js prefix ($2b$)
        $hash = password_hash($rawPassword, PASSWORD_BCRYPT);
        $nodeJsHash = str_replace('$2y$', '$2b$', $hash);

        $stmt = $this->getPdo()->prepare('
            INSERT INTO auth.app_passwords (user_id, name, password_hash, password_prefix)
            VALUES (:user_id, :name, :password_hash, :password_prefix)
        ');
        $stmt->execute([
            'user_id' => $user['id'],
            'name' => 'Node.js Device',
            'password_hash' => $nodeJsHash,
            'password_prefix' => 'abcd1234',
        ]);

        $result = $this->callValidateUserPass('user@example.com', 'abcd1234efgh5678');

        $this->assertTrue($result);
    }

    #[Test]
    public function validateUserPassUpdatesCorrectPasswordLastUsedAt(): void
    {
        $user = $this->createTestUser('user@example.com');

        // Create two passwords with the same prefix
        $appPassword1 = $this->createAppPassword((int) $user['id'], 'Device 1', 'abcd1234wrongpwd1');
        $appPassword2 = $this->createAppPassword((int) $user['id'], 'Device 2', 'abcd1234correct!');

        // Authenticate with the second password
        $this->callValidateUserPass('user@example.com', 'abcd1234correct!');

        // First password should not have last_used_at set
        $stmt = $this->getPdo()->prepare('SELECT last_used_at FROM auth.app_passwords WHERE id = :id');
        $stmt->execute(['id' => $appPassword1['id']]);
        $this->assertNull($stmt->fetch()['last_used_at']);

        // Second password should have last_used_at set
        $stmt->execute(['id' => $appPassword2['id']]);
        $this->assertNotNull($stmt->fetch()['last_used_at']);
    }

    #[Test]
    public function validateUserPassIsEmailCaseSensitive(): void
    {
        $user = $this->createTestUser('User@Example.com');
        $this->createAppPassword((int) $user['id'], 'Test Device', 'abcd1234efgh5678');

        // Different case should fail (emails are stored as-is)
        $result = $this->callValidateUserPass('user@example.com', 'abcd1234efgh5678');
        $this->assertFalse($result);

        // Exact case should work
        $result = $this->callValidateUserPass('User@Example.com', 'abcd1234efgh5678');
        $this->assertTrue($result);
    }

    #[Test]
    public function userCanHaveMultipleActivePasswords(): void
    {
        $user = $this->createTestUser('user@example.com');

        $this->createAppPassword((int) $user['id'], 'iPhone', 'iphone12password!');
        $this->createAppPassword((int) $user['id'], 'Mac', 'macbook1password!');
        $this->createAppPassword((int) $user['id'], 'Android', 'android1password!');

        // All passwords should work
        $this->assertTrue($this->callValidateUserPass('user@example.com', 'iphone12password!'));
        $this->assertTrue($this->callValidateUserPass('user@example.com', 'macbook1password!'));
        $this->assertTrue($this->callValidateUserPass('user@example.com', 'android1password!'));
    }

    #[Test]
    public function passwordForOneUserDoesNotWorkForAnother(): void
    {
        $user1 = $this->createTestUser('user1@example.com');
        $user2 = $this->createTestUser('user2@example.com');

        $this->createAppPassword((int) $user1['id'], 'User1 Device', 'abcd1234efgh5678');

        // Should work for user1
        $this->assertTrue($this->callValidateUserPass('user1@example.com', 'abcd1234efgh5678'));

        // Should not work for user2
        $this->assertFalse($this->callValidateUserPass('user2@example.com', 'abcd1234efgh5678'));
    }

    /**
     * Helper to call the protected validateUserPass method.
     */
    private function callValidateUserPass(string $username, string $password): bool
    {
        $reflection = new ReflectionClass($this->backend);
        $method = $reflection->getMethod('validateUserPass');
        $method->setAccessible(true);
        return $method->invoke($this->backend, $username, $password);
    }
}
