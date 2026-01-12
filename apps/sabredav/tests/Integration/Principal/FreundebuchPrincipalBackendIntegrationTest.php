<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Tests\Integration\Principal;

use Freundebuch\DAV\Principal\FreundebuchPrincipalBackend;
use Freundebuch\DAV\Tests\Integration\IntegrationTestCase;
use PHPUnit\Framework\Attributes\Test;

/**
 * Integration tests for FreundebuchPrincipalBackend.
 *
 * Tests the Principal backend against a real PostgreSQL database.
 */
class FreundebuchPrincipalBackendIntegrationTest extends IntegrationTestCase
{
    private FreundebuchPrincipalBackend $backend;

    protected function setUp(): void
    {
        parent::setUp();
        $this->backend = new FreundebuchPrincipalBackend($this->getPdo());
    }

    #[Test]
    public function getPrincipalsByPrefixReturnsEmptyForNonPrincipalsPrefix(): void
    {
        $this->createTestUser('user@example.com');

        $principals = $this->backend->getPrincipalsByPrefix('users');

        $this->assertEmpty($principals);
    }

    #[Test]
    public function getPrincipalsByPrefixReturnsAllUsersForPrincipalsPrefix(): void
    {
        $user1 = $this->createTestUser('alice@example.com');
        $user2 = $this->createTestUser('bob@example.com');

        $principals = $this->backend->getPrincipalsByPrefix('principals');

        $this->assertCount(2, $principals);

        $uris = array_column($principals, 'uri');
        $this->assertContains('principals/alice@example.com', $uris);
        $this->assertContains('principals/bob@example.com', $uris);
    }

    #[Test]
    public function getPrincipalsByPrefixReturnsCorrectProperties(): void
    {
        $this->createTestUser('user@example.com');

        $principals = $this->backend->getPrincipalsByPrefix('principals');

        $this->assertCount(1, $principals);
        $principal = $principals[0];

        $this->assertEquals('principals/user@example.com', $principal['uri']);
        $this->assertEquals('user@example.com', $principal['{DAV:}displayname']);
        $this->assertEquals('user@example.com', $principal['{http://sabredav.org/ns}email-address']);
    }

    #[Test]
    public function getPrincipalByPathReturnsNullForInvalidPath(): void
    {
        $this->createTestUser('user@example.com');

        // Invalid prefix
        $result = $this->backend->getPrincipalByPath('users/user@example.com');
        $this->assertNull($result);

        // Too many parts
        $result = $this->backend->getPrincipalByPath('principals/extra/user@example.com');
        $this->assertNull($result);

        // Too few parts
        $result = $this->backend->getPrincipalByPath('principals');
        $this->assertNull($result);
    }

    #[Test]
    public function getPrincipalByPathReturnsNullForNonExistentUser(): void
    {
        $result = $this->backend->getPrincipalByPath('principals/nonexistent@example.com');

        $this->assertNull($result);
    }

    #[Test]
    public function getPrincipalByPathReturnsUserProperties(): void
    {
        $user = $this->createTestUser('user@example.com');

        $principal = $this->backend->getPrincipalByPath('principals/user@example.com');

        $this->assertNotNull($principal);
        $this->assertEquals($user['external_id'], $principal['id']);
        $this->assertEquals('principals/user@example.com', $principal['uri']);
        $this->assertEquals('user@example.com', $principal['{DAV:}displayname']);
        $this->assertEquals('user@example.com', $principal['{http://sabredav.org/ns}email-address']);
    }

    #[Test]
    public function searchPrincipalsReturnsEmptyForNonPrincipalsPrefix(): void
    {
        $this->createTestUser('user@example.com');

        $results = $this->backend->searchPrincipals('users', [
            '{http://sabredav.org/ns}email-address' => 'user',
        ]);

        $this->assertEmpty($results);
    }

    #[Test]
    public function searchPrincipalsSearchesByEmail(): void
    {
        $this->createTestUser('alice@example.com');
        $this->createTestUser('bob@example.com');
        $this->createTestUser('charlie@other.com');

        // Search for partial email
        $results = $this->backend->searchPrincipals('principals', [
            '{http://sabredav.org/ns}email-address' => 'example.com',
        ]);

        $this->assertCount(2, $results);
        $this->assertContains('principals/alice@example.com', $results);
        $this->assertContains('principals/bob@example.com', $results);
        $this->assertNotContains('principals/charlie@other.com', $results);
    }

    #[Test]
    public function searchPrincipalsSearchesByDisplayName(): void
    {
        $this->createTestUser('alice@example.com');
        $this->createTestUser('bob@example.com');

        // Search by displayname (which is email in this implementation)
        $results = $this->backend->searchPrincipals('principals', [
            '{DAV:}displayname' => 'alice',
        ]);

        $this->assertCount(1, $results);
        $this->assertContains('principals/alice@example.com', $results);
    }

    #[Test]
    public function searchPrincipalsIsCaseInsensitive(): void
    {
        $this->createTestUser('Alice@Example.COM');

        $results = $this->backend->searchPrincipals('principals', [
            '{http://sabredav.org/ns}email-address' => 'alice',
        ]);

        $this->assertCount(1, $results);
        $this->assertContains('principals/Alice@Example.COM', $results);
    }

    #[Test]
    public function searchPrincipalsCombinesEmailAndDisplayNameResults(): void
    {
        $this->createTestUser('user@example.com');

        // Search by both email and displayname
        $results = $this->backend->searchPrincipals('principals', [
            '{http://sabredav.org/ns}email-address' => 'user',
            '{DAV:}displayname' => 'user',
        ]);

        // Should deduplicate results
        $this->assertCount(1, $results);
        $this->assertContains('principals/user@example.com', $results);
    }

    #[Test]
    public function findByUriReturnsNullForNonMailtoUri(): void
    {
        $this->createTestUser('user@example.com');

        $result = $this->backend->findByUri('user@example.com', 'principals');

        $this->assertNull($result);
    }

    #[Test]
    public function findByUriReturnsNullForNonExistentEmail(): void
    {
        $result = $this->backend->findByUri('mailto:nonexistent@example.com', 'principals');

        $this->assertNull($result);
    }

    #[Test]
    public function findByUriReturnsPrincipalUriForValidEmail(): void
    {
        $this->createTestUser('user@example.com');

        $result = $this->backend->findByUri('mailto:user@example.com', 'principals');

        $this->assertEquals('principals/user@example.com', $result);
    }

    #[Test]
    public function getGroupMemberSetReturnsEmpty(): void
    {
        $this->createTestUser('user@example.com');

        $members = $this->backend->getGroupMemberSet('principals/user@example.com');

        $this->assertEmpty($members);
    }

    #[Test]
    public function getGroupMembershipReturnsEmpty(): void
    {
        $this->createTestUser('user@example.com');

        $groups = $this->backend->getGroupMembership('principals/user@example.com');

        $this->assertEmpty($groups);
    }

    #[Test]
    public function setGroupMemberSetDoesNothing(): void
    {
        $this->createTestUser('user@example.com');

        // Should not throw
        $this->backend->setGroupMemberSet('principals/user@example.com', ['principals/other@example.com']);

        // Verify nothing changed
        $members = $this->backend->getGroupMemberSet('principals/user@example.com');
        $this->assertEmpty($members);
    }

    #[Test]
    public function updatePrincipalDoesNothing(): void
    {
        $user = $this->createTestUser('user@example.com');

        $propPatch = new \Sabre\DAV\PropPatch([
            '{DAV:}displayname' => 'New Name',
        ]);

        // Should not throw
        $this->backend->updatePrincipal('principals/user@example.com', $propPatch);

        // Verify nothing changed in database
        $stmt = $this->getPdo()->prepare('SELECT email FROM auth.users WHERE id = :id');
        $stmt->execute(['id' => $user['id']]);
        $result = $stmt->fetch();

        $this->assertEquals('user@example.com', $result['email']);
    }

    #[Test]
    public function principalsAreSortedByEmail(): void
    {
        $this->createTestUser('charlie@example.com');
        $this->createTestUser('alice@example.com');
        $this->createTestUser('bob@example.com');

        $principals = $this->backend->getPrincipalsByPrefix('principals');

        $uris = array_column($principals, 'uri');

        $this->assertEquals([
            'principals/alice@example.com',
            'principals/bob@example.com',
            'principals/charlie@example.com',
        ], $uris);
    }
}
