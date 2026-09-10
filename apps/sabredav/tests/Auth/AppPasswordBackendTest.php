<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Tests\Auth;

use Freundebuch\DAV\Auth\AppPasswordBackend;
use PDO;
use PDOStatement;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use Sabre\HTTP\Request;
use Sabre\HTTP\Response;

class AppPasswordBackendTest extends TestCase
{
    private PDO&MockObject $pdo;
    private AppPasswordBackend $backend;

    protected function setUp(): void
    {
        $this->pdo = $this->createMock(PDO::class);
        $this->backend = new AppPasswordBackend($this->pdo);
    }

    #[Test]
    public function validateUserPassReturnsFalseForUnknownUser(): void
    {
        $userStmt = $this->createMock(PDOStatement::class);
        $userStmt->method('execute')->willReturn(true);
        $userStmt->method('fetch')->willReturn(false); // No user found

        $this->pdo->method('prepare')->willReturn($userStmt);

        // Use reflection to call the protected method
        $result = $this->callValidateUserPass('unknown@example.com', 'any-password');

        $this->assertFalse($result);
    }

    #[Test]
    public function validateUserPassReturnsFalseForNoMatchingPrefix(): void
    {
        $userStmt = $this->createMock(PDOStatement::class);
        $userStmt->method('execute')->willReturn(true);
        $userStmt->method('fetch')->willReturn([
            'id' => 1,
            'external_id' => 'user-uuid',
            'email' => 'user@example.com',
        ]);

        $passwordStmt = $this->createMock(PDOStatement::class);
        $passwordStmt->method('execute')->willReturn(true);
        $passwordStmt->method('fetch')->willReturn(false); // No matching passwords

        $this->pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($userStmt, $passwordStmt);

        $result = $this->callValidateUserPass('user@example.com', 'abcd1234-efgh-5678-ijkl');

        $this->assertFalse($result);
    }

    #[Test]
    public function validateUserPassReturnsFalseForWrongPassword(): void
    {
        $userStmt = $this->createMock(PDOStatement::class);
        $userStmt->method('execute')->willReturn(true);
        $userStmt->method('fetch')->willReturn([
            'id' => 1,
            'external_id' => 'user-uuid',
            'email' => 'user@example.com',
        ]);

        // Create a hash for a different password
        $correctPasswordHash = password_hash('correctpassword1234', PASSWORD_BCRYPT);

        $passwordStmt = $this->createMock(PDOStatement::class);
        $passwordStmt->method('execute')->willReturn(true);
        $passwordStmt->method('fetch')
            ->willReturnOnConsecutiveCalls(
                ['id' => 1, 'password_hash' => $correctPasswordHash],
                false // No more rows
            );

        $this->pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($userStmt, $passwordStmt);

        // Try with wrong password
        $result = $this->callValidateUserPass('user@example.com', 'wrongpas-swor-d123-4567');

        $this->assertFalse($result);
    }

    #[Test]
    public function validateUserPassReturnsTrueForCorrectPassword(): void
    {
        $rawPassword = 'abcd1234efgh5678';
        $passwordHash = password_hash($rawPassword, PASSWORD_BCRYPT);

        $userStmt = $this->createMock(PDOStatement::class);
        $userStmt->method('execute')->willReturn(true);
        $userStmt->method('fetch')->willReturn([
            'id' => 1,
            'external_id' => 'user-uuid',
            'email' => 'user@example.com',
        ]);

        $passwordStmt = $this->createMock(PDOStatement::class);
        $passwordStmt->method('execute')->willReturn(true);
        $passwordStmt->method('fetch')
            ->willReturnOnConsecutiveCalls(
                ['id' => 1, 'password_hash' => $passwordHash],
                false
            );

        $updateStmt = $this->createMock(PDOStatement::class);
        $updateStmt->method('execute')->willReturn(true);

        $this->pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($userStmt, $passwordStmt, $updateStmt);

        // Try with correct password (with dashes)
        $result = $this->callValidateUserPass('user@example.com', 'abcd-1234-efgh-5678');

        $this->assertTrue($result);
    }

    #[Test]
    public function validateUserPassHandlesPasswordWithDashes(): void
    {
        $rawPassword = 'abcd1234efgh5678';
        $passwordHash = password_hash($rawPassword, PASSWORD_BCRYPT);

        $userStmt = $this->createMock(PDOStatement::class);
        $userStmt->method('execute')->willReturn(true);
        $userStmt->method('fetch')->willReturn([
            'id' => 1,
            'external_id' => 'user-uuid',
            'email' => 'user@example.com',
        ]);

        $passwordStmt = $this->createMock(PDOStatement::class);
        $passwordStmt->method('execute')->willReturn(true);
        $passwordStmt->method('fetch')
            ->willReturnOnConsecutiveCalls(
                ['id' => 1, 'password_hash' => $passwordHash],
                false
            );

        $updateStmt = $this->createMock(PDOStatement::class);
        $updateStmt->method('execute')->willReturn(true);

        $this->pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($userStmt, $passwordStmt, $updateStmt);

        // Password with dashes should work the same as without
        $result = $this->callValidateUserPass('user@example.com', 'abcd-1234-efgh-5678');

        $this->assertTrue($result);
    }

    #[Test]
    public function validateUserPassPreservesRawDashesThatArePartOfBase64Url(): void
    {
        // Regression: previous implementation stripped every '-' from the input,
        // corrupting ~42% of generated passwords whose base64url raw contains
        // '-'. Now only format-separator dashes are removed.
        // Raw: "AAAA-BBBCCCCDDDDEEEEFFFFGGGGHHHH" (32 chars, '-' at index 4).
        // Formatted: "AAAA--BBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH".
        $rawPassword = 'AAAA-BBBCCCCDDDDEEEEFFFFGGGGHHHH';
        $formattedPassword = 'AAAA--BBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH';
        $passwordHash = password_hash($rawPassword, PASSWORD_BCRYPT);

        $userStmt = $this->createMock(PDOStatement::class);
        $userStmt->method('execute')->willReturn(true);
        $userStmt->method('fetch')->willReturn([
            'id' => 1,
            'external_id' => 'user-uuid',
            'email' => 'user@example.com',
        ]);

        $passwordStmt = $this->createMock(PDOStatement::class);
        $passwordStmt->method('execute')->willReturn(true);
        $passwordStmt->method('fetch')
            ->willReturnOnConsecutiveCalls(
                ['id' => 1, 'password_hash' => $passwordHash],
                false
            );

        $updateStmt = $this->createMock(PDOStatement::class);
        $updateStmt->method('execute')->willReturn(true);

        $this->pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($userStmt, $passwordStmt, $updateStmt);

        $result = $this->callValidateUserPass('user@example.com', $formattedPassword);

        $this->assertTrue($result);
    }

    #[Test]
    public function validateUserPassHandlesNodeJsBcryptPrefix(): void
    {
        $rawPassword = 'abcd1234efgh5678';
        // Node.js bcrypt uses $2b$ prefix
        $hash = password_hash($rawPassword, PASSWORD_BCRYPT);
        $nodeJsHash = str_replace('$2y$', '$2b$', $hash);

        $userStmt = $this->createMock(PDOStatement::class);
        $userStmt->method('execute')->willReturn(true);
        $userStmt->method('fetch')->willReturn([
            'id' => 1,
            'external_id' => 'user-uuid',
            'email' => 'user@example.com',
        ]);

        $passwordStmt = $this->createMock(PDOStatement::class);
        $passwordStmt->method('execute')->willReturn(true);
        $passwordStmt->method('fetch')
            ->willReturnOnConsecutiveCalls(
                ['id' => 1, 'password_hash' => $nodeJsHash],
                false
            );

        $updateStmt = $this->createMock(PDOStatement::class);
        $updateStmt->method('execute')->willReturn(true);

        $this->pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($userStmt, $passwordStmt, $updateStmt);

        $result = $this->callValidateUserPass('user@example.com', 'abcd-1234-efgh-5678');

        $this->assertTrue($result);
    }

    #[Test]
    public function validateUserPassUpdatesLastUsedAt(): void
    {
        $rawPassword = 'abcd1234efgh5678';
        $passwordHash = password_hash($rawPassword, PASSWORD_BCRYPT);

        $userStmt = $this->createMock(PDOStatement::class);
        $userStmt->method('execute')->willReturn(true);
        $userStmt->method('fetch')->willReturn([
            'id' => 1,
            'external_id' => 'user-uuid',
            'email' => 'user@example.com',
        ]);

        $passwordStmt = $this->createMock(PDOStatement::class);
        $passwordStmt->method('execute')->willReturn(true);
        $passwordStmt->method('fetch')
            ->willReturnOnConsecutiveCalls(
                ['id' => 1, 'password_hash' => $passwordHash],
                false
            );

        $updateStmt = $this->createMock(PDOStatement::class);
        // Verify the update statement is called with correct params
        $updateStmt->expects($this->once())
            ->method('execute')
            ->with(['id' => 1])
            ->willReturn(true);

        $this->pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($userStmt, $passwordStmt, $updateStmt);

        $this->callValidateUserPass('user@example.com', 'abcd-1234-efgh-5678');
    }

    #[Test]
    public function validateUserPassTriesMultiplePasswordsWithSamePrefix(): void
    {
        $correctPassword = 'abcd1234correct1';
        $correctHash = password_hash($correctPassword, PASSWORD_BCRYPT);
        $wrongHash = password_hash('abcd1234wrongone', PASSWORD_BCRYPT);

        $userStmt = $this->createMock(PDOStatement::class);
        $userStmt->method('execute')->willReturn(true);
        $userStmt->method('fetch')->willReturn([
            'id' => 1,
            'external_id' => 'user-uuid',
            'email' => 'user@example.com',
        ]);

        $passwordStmt = $this->createMock(PDOStatement::class);
        $passwordStmt->method('execute')->willReturn(true);
        // First call returns wrong password, second returns correct one
        $passwordStmt->method('fetch')
            ->willReturnOnConsecutiveCalls(
                ['id' => 1, 'password_hash' => $wrongHash],
                ['id' => 2, 'password_hash' => $correctHash],
                false
            );

        $updateStmt = $this->createMock(PDOStatement::class);
        $updateStmt->expects($this->once())
            ->method('execute')
            ->with(['id' => 2]) // Should update the second password
            ->willReturn(true);

        $this->pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($userStmt, $passwordStmt, $updateStmt);

        $result = $this->callValidateUserPass('user@example.com', 'abcd-1234-corr-ect1');

        $this->assertTrue($result);
    }

    #[Test]
    public function validateUserPassLooksUpTheHashedPrefix(): void
    {
        $userStmt = $this->createMock(PDOStatement::class);
        $userStmt->method('execute')->willReturn(true);
        $userStmt->method('fetch')->willReturn([
            'id' => 1,
            'external_id' => 'user-uuid',
            'email' => 'user@example.com',
        ]);

        $passwordStmt = $this->createMock(PDOStatement::class);
        // The stored column holds left(sha256(<raw 8-char prefix>), 16 hex chars),
        // so that is what the lookup must send — never the plaintext prefix.
        $passwordStmt->expects($this->once())
            ->method('execute')
            ->with(['user_id' => 1, 'prefix' => 'e9cee71ab932fde8'])
            ->willReturn(true);
        $passwordStmt->method('fetch')->willReturn(false);

        $this->pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($userStmt, $passwordStmt);

        // Raw prefix 'abcd1234' -> sha256 'e9cee71a…' (same value as the
        // TypeScript hashAppPasswordPrefix() unit test asserts).
        $this->assertSame('e9cee71ab932fde8', substr(hash('sha256', 'abcd1234'), 0, 16));
        $this->assertFalse($this->callValidateUserPass('user@example.com', 'abcd-1234-efgh-5678'));
    }

    #[Test]
    public function dummyHashIsAUsableBcryptHashAtTheProductionCost(): void
    {
        // The rejection paths compare against this constant so that an unknown
        // email costs the same bcrypt round as a wrong password. A malformed or
        // cheaper hash would defeat that.
        $reflection = new ReflectionClass(AppPasswordBackend::class);
        $dummyHash = $reflection->getConstant('DUMMY_HASH');

        $this->assertIsString($dummyHash);
        $this->assertTrue(password_verify('dummy', $dummyHash));
        $this->assertSame(10, password_get_info($dummyHash)['options']['cost']);
    }

    #[Test]
    public function checkReturnsALowercasePrincipalUri(): void
    {
        $rawPassword = 'abcd1234efgh5678';

        $userStmt = $this->createMock(PDOStatement::class);
        $userStmt->method('execute')->willReturn(true);
        $userStmt->method('fetch')->willReturn([
            'id' => 1,
            'external_id' => 'user-uuid',
            'email' => 'user@example.com',
        ]);

        $passwordStmt = $this->createMock(PDOStatement::class);
        $passwordStmt->method('execute')->willReturn(true);
        $passwordStmt->method('fetch')->willReturnOnConsecutiveCalls(
            ['id' => 1, 'password_hash' => password_hash($rawPassword, PASSWORD_BCRYPT)],
            false
        );

        $updateStmt = $this->createMock(PDOStatement::class);
        $updateStmt->method('execute')->willReturn(true);

        $this->pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($userStmt, $passwordStmt, $updateStmt);

        $request = new Request('PROPFIND', '/addressbooks');
        $request->addHeader(
            'Authorization',
            'Basic ' . base64_encode('User@Example.com:' . $rawPassword)
        );

        // The principal backend only knows the stored lowercase email, and the
        // ACL plugin compares principal URIs byte-for-byte.
        $this->assertSame(
            [true, 'principals/user@example.com'],
            $this->backend->check($request, new Response())
        );
    }

    #[Test]
    public function checkReturnsTheStoredPrincipalForANonAsciiUppercaseLogin(): void
    {
        $rawPassword = 'abcd1234efgh5678';

        $userStmt = $this->createMock(PDOStatement::class);
        $userStmt->method('execute')->willReturn(true);
        $userStmt->method('fetch')->willReturn([
            'id' => 1,
            'external_id' => 'user-uuid',
            'email' => 'müller@example.com',
        ]);

        $passwordStmt = $this->createMock(PDOStatement::class);
        $passwordStmt->method('execute')->willReturn(true);
        $passwordStmt->method('fetch')->willReturnOnConsecutiveCalls(
            ['id' => 1, 'password_hash' => password_hash($rawPassword, PASSWORD_BCRYPT)],
            false
        );

        $updateStmt = $this->createMock(PDOStatement::class);
        $updateStmt->method('execute')->willReturn(true);

        $this->pdo->method('prepare')
            ->willReturnOnConsecutiveCalls($userStmt, $passwordStmt, $updateStmt);

        $request = new Request('PROPFIND', '/addressbooks');
        $request->addHeader(
            'Authorization',
            'Basic ' . base64_encode('MÜLLER@example.com:' . $rawPassword)
        );

        // strtolower() is byte-wise: it would answer principals/mÜller@… and
        // the ACL plugin would deny the user their own address book. The
        // matched row is the only form the principal backend ever exposes.
        $this->assertSame(
            [true, 'principals/müller@example.com'],
            $this->backend->check($request, new Response())
        );
    }

    /**
     * Helper to call the protected validateUserPass method
     */
    private function callValidateUserPass(string $username, string $password): bool
    {
        $reflection = new ReflectionClass($this->backend);
        $method = $reflection->getMethod('validateUserPass');
        $method->setAccessible(true);
        return $method->invoke($this->backend, $username, $password);
    }
}
