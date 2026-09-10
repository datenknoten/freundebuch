<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Tests\Integration\Auth;

use Freundebuch\DAV\Auth\AppPasswordBackend;
use Freundebuch\DAV\Principal\FreundebuchPrincipalBackend;
use Freundebuch\DAV\Tests\Integration\IntegrationTestCase;
use PHPUnit\Framework\Attributes\Test;
use ReflectionClass;
use Sabre\HTTP\Request;
use Sabre\HTTP\Response;

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
    public function validateUserPassPreservesRawDashesThatArePartOfBase64Url(): void
    {
        // Regression: previous implementation ran str_replace('-', '', $password)
        // which corrupted ~42% of generated passwords whose base64url raw
        // contains '-' (a valid base64url char), yielding intermittent 401s.
        $user = $this->createTestUser('user@example.com');
        // Raw: 32-char base64url with embedded '-' at index 4.
        // "AAAA" | "-BBB" | "CCCC" | "DDDD" | "EEEE" | "FFFF" | "GGGG" | "HHHH"
        // → formatted "AAAA--BBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH"
        $rawPassword = 'AAAA-BBBCCCCDDDDEEEEFFFFGGGGHHHH';
        $formattedPassword = 'AAAA--BBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH';
        $this->createAppPassword((int) $user['id'], 'Test Device', $rawPassword);

        $result = $this->callValidateUserPass('user@example.com', $formattedPassword);

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
            'password_prefix' => substr(hash('sha256', 'abcd1234'), 0, 16),
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
    public function validateUserPassIsEmailCaseInsensitive(): void
    {
        // Addresses are stored lowercase (CHECK constraint); a DAV client sends
        // whatever the user typed, so the lookup lowercases the input.
        $user = $this->createTestUser('user@example.com');
        $this->createAppPassword((int) $user['id'], 'Test Device', 'abcd1234efgh5678');

        $this->assertTrue($this->callValidateUserPass('user@example.com', 'abcd1234efgh5678'));
        $this->assertTrue($this->callValidateUserPass('User@Example.com', 'abcd1234efgh5678'));
        $this->assertTrue($this->callValidateUserPass('USER@EXAMPLE.COM', 'abcd1234efgh5678'));
    }

    #[Test]
    public function nonAsciiUppercaseLoginAuthenticatesAndMatchesItsPrincipal(): void
    {
        // Postgres lower() is locale-aware (the datcollate is a UTF-8 locale)
        // and auth."user" is constrained to `email = lower(email)`; PHP
        // strtolower() is byte-wise. A login as MÜLLER@… therefore used to
        // authenticate and then be handed principals/mÜller@…, which no
        // principal row matches, so the ACL plugin denied every resource.
        $user = $this->createTestUser('müller@example.com');
        $this->createAppPassword((int) $user['id'], 'Test Device', 'abcd1234efgh5678');

        $this->assertTrue($this->callValidateUserPass('MÜLLER@example.com', 'abcd1234efgh5678'));

        $request = new Request('PROPFIND', '/addressbooks');
        $request->addHeader(
            'Authorization',
            'Basic ' . base64_encode('MÜLLER@example.com:abcd1234efgh5678')
        );

        $principal = (new FreundebuchPrincipalBackend($this->getPdo()))
            ->getPrincipalByPath('principals/müller@example.com');

        $this->assertNotNull($principal);
        $this->assertSame(
            [true, $principal['uri']],
            $this->backend->check($request, new Response())
        );
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

    #[Test]
    public function storedPrefixIsHashedNotThePlaintextPrefix(): void
    {
        $user = $this->createTestUser('user@example.com');
        $appPassword = $this->createAppPassword((int) $user['id'], 'Test Device', 'abcd1234efgh5678');

        $stmt = $this->getPdo()->prepare('SELECT password_prefix FROM auth.app_passwords WHERE id = :id');
        $stmt->execute(['id' => $appPassword['id']]);
        $stored = $stmt->fetch()['password_prefix'];

        // Cross-language contract: the backend's hashAppPasswordPrefix() produces
        // the same value for the same input (see the TypeScript unit test).
        $this->assertSame('e9cee71ab932fde8', substr(hash('sha256', 'abcd1234'), 0, 16));
        $this->assertSame('e9cee71ab932fde8', $stored);
        $this->assertNotSame('abcd1234', $stored);

        // …and it still authenticates.
        $this->assertTrue($this->callValidateUserPass('user@example.com', 'abcd1234efgh5678'));
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
