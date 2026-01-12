<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Tests\Integration\CardDAV;

use Freundebuch\DAV\CardDAV\FreundebuchCardDAVBackend;
use Freundebuch\DAV\Tests\Integration\IntegrationTestCase;
use PHPUnit\Framework\Attributes\Test;

/**
 * Integration tests for FreundebuchCardDAVBackend.
 *
 * Tests the CardDAV backend against a real PostgreSQL database.
 */
class FreundebuchCardDAVBackendIntegrationTest extends IntegrationTestCase
{
    private FreundebuchCardDAVBackend $backend;

    protected function setUp(): void
    {
        parent::setUp();
        $this->backend = new FreundebuchCardDAVBackend($this->getPdo());
    }

    #[Test]
    public function getAddressBooksForUserReturnsEmptyForUnknownUser(): void
    {
        $addressBooks = $this->backend->getAddressBooksForUser('principals/unknown@example.com');

        $this->assertEmpty($addressBooks);
    }

    #[Test]
    public function getAddressBooksForUserReturnsSingleAddressBook(): void
    {
        $user = $this->createTestUser('user@example.com');

        $addressBooks = $this->backend->getAddressBooksForUser('principals/user@example.com');

        $this->assertCount(1, $addressBooks);
        $this->assertEquals('friends', $addressBooks[0]['uri']);
        $this->assertEquals('principals/user@example.com', $addressBooks[0]['principaluri']);
        $this->assertEquals('Freundebuch Friends', $addressBooks[0]['{DAV:}displayname']);
        $this->assertStringStartsWith('sync-', $addressBooks[0]['{http://sabredav.org/ns}sync-token']);
    }

    #[Test]
    public function getCardsReturnsEmptyForUserWithNoFriends(): void
    {
        $user = $this->createTestUser();

        $cards = $this->backend->getCards($user['id']);

        $this->assertEmpty($cards);
    }

    #[Test]
    public function getCardsReturnsAllFriends(): void
    {
        $user = $this->createTestUser();
        $friend1 = $this->createTestFriend((int) $user['id'], ['display_name' => 'Alice']);
        $friend2 = $this->createTestFriend((int) $user['id'], ['display_name' => 'Bob']);

        $cards = $this->backend->getCards($user['id']);

        $this->assertCount(2, $cards);

        $uris = array_column($cards, 'uri');
        $this->assertContains($friend1['external_id'] . '.vcf', $uris);
        $this->assertContains($friend2['external_id'] . '.vcf', $uris);
    }

    #[Test]
    public function getCardsExcludesDeletedFriends(): void
    {
        $user = $this->createTestUser();
        $activeFriend = $this->createTestFriend((int) $user['id'], ['display_name' => 'Active']);
        $deletedFriend = $this->createTestFriend((int) $user['id'], ['display_name' => 'Deleted']);

        // Soft delete the friend
        $this->getPdo()->prepare('UPDATE friends.friends SET deleted_at = NOW() WHERE id = :id')
            ->execute(['id' => $deletedFriend['id']]);

        $cards = $this->backend->getCards($user['id']);

        $this->assertCount(1, $cards);
        $this->assertEquals($activeFriend['external_id'] . '.vcf', $cards[0]['uri']);
    }

    #[Test]
    public function getCardReturnsCorrectVCardData(): void
    {
        $user = $this->createTestUser();
        $friend = $this->createTestFriend((int) $user['id'], [
            'display_name' => 'John Doe',
            'name_first' => 'John',
            'name_last' => 'Doe',
            'organization' => 'Acme Corp',
        ]);

        // Add contact details
        $this->addPhoneToFriend((int) $friend['id'], '+1234567890', 'mobile', true);
        $this->addEmailToFriend((int) $friend['id'], 'john@example.com', 'personal', true);

        $card = $this->backend->getCard($user['id'], $friend['external_id'] . '.vcf');

        $this->assertIsArray($card);
        $this->assertEquals($friend['external_id'] . '.vcf', $card['uri']);
        $this->assertNotEmpty($card['carddata']);
        $this->assertStringContainsString('BEGIN:VCARD', $card['carddata']);
        $this->assertStringContainsString('VERSION:4.0', $card['carddata']);
        $this->assertStringContainsString('FN:John Doe', $card['carddata']);
        $this->assertStringContainsString('N:Doe;John', $card['carddata']);
        $this->assertStringContainsString('ORG:Acme Corp', $card['carddata']);
        $this->assertStringContainsString('TEL', $card['carddata']);
        $this->assertStringContainsString('EMAIL', $card['carddata']);
        $this->assertStringContainsString('END:VCARD', $card['carddata']);
    }

    #[Test]
    public function getCardReturnsFalseForNonExistentCard(): void
    {
        $user = $this->createTestUser();

        $card = $this->backend->getCard($user['id'], 'nonexistent.vcf');

        $this->assertFalse($card);
    }

    #[Test]
    public function getCardReturnsFalseForDeletedFriend(): void
    {
        $user = $this->createTestUser();
        $friend = $this->createTestFriend((int) $user['id']);

        // Soft delete
        $this->getPdo()->prepare('UPDATE friends.friends SET deleted_at = NOW() WHERE id = :id')
            ->execute(['id' => $friend['id']]);

        $card = $this->backend->getCard($user['id'], $friend['external_id'] . '.vcf');

        $this->assertFalse($card);
    }

    #[Test]
    public function getMultipleCardsReturnsRequestedCards(): void
    {
        $user = $this->createTestUser();
        $friend1 = $this->createTestFriend((int) $user['id'], ['display_name' => 'Alice']);
        $friend2 = $this->createTestFriend((int) $user['id'], ['display_name' => 'Bob']);
        $friend3 = $this->createTestFriend((int) $user['id'], ['display_name' => 'Charlie']);

        $uris = [
            $friend1['external_id'] . '.vcf',
            $friend3['external_id'] . '.vcf',
        ];

        $cards = $this->backend->getMultipleCards($user['id'], $uris);

        $this->assertCount(2, $cards);

        $returnedUris = array_column($cards, 'uri');
        $this->assertContains($friend1['external_id'] . '.vcf', $returnedUris);
        $this->assertContains($friend3['external_id'] . '.vcf', $returnedUris);
        $this->assertNotContains($friend2['external_id'] . '.vcf', $returnedUris);
    }

    #[Test]
    public function createCardCreatesNewFriend(): void
    {
        $user = $this->createTestUser();

        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:new-friend-uid
FN:New Friend
N:Friend;New;;;
ORG:Test Company
TEL;TYPE=CELL:+1234567890
EMAIL;TYPE=HOME:new@example.com
END:VCARD
VCARD;

        $etag = $this->backend->createCard($user['id'], 'new-friend-uid.vcf', $vcard);

        $this->assertNotNull($etag);
        $this->assertStringStartsWith('"', $etag);
        $this->assertStringEndsWith('"', $etag);

        // Verify friend was created
        $stmt = $this->getPdo()->prepare('
            SELECT * FROM friends.friends
            WHERE user_id = :user_id AND external_id = :external_id
        ');
        $stmt->execute([
            'user_id' => $user['id'],
            'external_id' => 'new-friend-uid',
        ]);
        $friend = $stmt->fetch();

        $this->assertNotFalse($friend);
        $this->assertEquals('New Friend', $friend['display_name']);
        $this->assertEquals('New', $friend['name_first']);
        $this->assertEquals('Friend', $friend['name_last']);
        $this->assertEquals('Test Company', $friend['organization']);

        // Verify phone was created
        $stmt = $this->getPdo()->prepare('
            SELECT * FROM friends.friend_phones WHERE friend_id = :friend_id
        ');
        $stmt->execute(['friend_id' => $friend['id']]);
        $phone = $stmt->fetch();

        $this->assertNotFalse($phone);
        $this->assertEquals('+1234567890', $phone['phone_number']);

        // Verify email was created
        $stmt = $this->getPdo()->prepare('
            SELECT * FROM friends.friend_emails WHERE friend_id = :friend_id
        ');
        $stmt->execute(['friend_id' => $friend['id']]);
        $email = $stmt->fetch();

        $this->assertNotFalse($email);
        $this->assertEquals('new@example.com', $email['email_address']);
    }

    #[Test]
    public function updateCardUpdatesExistingFriend(): void
    {
        $user = $this->createTestUser();
        $friend = $this->createTestFriend((int) $user['id'], [
            'display_name' => 'Original Name',
            'name_first' => 'Original',
        ]);

        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:{$friend['external_id']}
FN:Updated Name
N:Name;Updated;;;
ORG:New Company
END:VCARD
VCARD;

        $etag = $this->backend->updateCard($user['id'], $friend['external_id'] . '.vcf', $vcard);

        $this->assertNotNull($etag);

        // Verify friend was updated
        $stmt = $this->getPdo()->prepare('SELECT * FROM friends.friends WHERE id = :id');
        $stmt->execute(['id' => $friend['id']]);
        $updated = $stmt->fetch();

        $this->assertEquals('Updated Name', $updated['display_name']);
        $this->assertEquals('Updated', $updated['name_first']);
        $this->assertEquals('Name', $updated['name_last']);
        $this->assertEquals('New Company', $updated['organization']);
    }

    #[Test]
    public function updateCardReturnsNullForNonExistentCard(): void
    {
        $user = $this->createTestUser();

        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:nonexistent
FN:Test
END:VCARD
VCARD;

        $etag = $this->backend->updateCard($user['id'], 'nonexistent.vcf', $vcard);

        $this->assertNull($etag);
    }

    #[Test]
    public function deleteCardSoftDeletesFriend(): void
    {
        $user = $this->createTestUser();
        $friend = $this->createTestFriend((int) $user['id']);

        $result = $this->backend->deleteCard($user['id'], $friend['external_id'] . '.vcf');

        $this->assertTrue($result);

        // Verify soft delete
        $stmt = $this->getPdo()->prepare('SELECT deleted_at FROM friends.friends WHERE id = :id');
        $stmt->execute(['id' => $friend['id']]);
        $deleted = $stmt->fetch();

        $this->assertNotNull($deleted['deleted_at']);
    }

    #[Test]
    public function deleteCardReturnsFalseForNonExistentCard(): void
    {
        $user = $this->createTestUser();

        $result = $this->backend->deleteCard($user['id'], 'nonexistent.vcf');

        $this->assertFalse($result);
    }

    #[Test]
    public function getChangesForAddressBookReturnsEmptyForInitialSync(): void
    {
        $user = $this->createTestUser();

        $changes = $this->backend->getChangesForAddressBook($user['id'], '', 1);

        $this->assertEquals('sync-0', $changes['syncToken']);
        $this->assertEmpty($changes['added']);
        $this->assertEmpty($changes['modified']);
        $this->assertEmpty($changes['deleted']);
    }

    #[Test]
    public function getChangesForAddressBookTracksCreatedFriends(): void
    {
        $user = $this->createTestUser();

        // Get initial sync token
        $initial = $this->backend->getChangesForAddressBook($user['id'], '', 1);

        // Create a friend
        $friend = $this->createTestFriend((int) $user['id']);

        // Get changes since initial sync
        $changes = $this->backend->getChangesForAddressBook($user['id'], $initial['syncToken'], 1);

        $this->assertContains($friend['external_id'] . '.vcf', $changes['added']);
        $this->assertEmpty($changes['modified']);
        $this->assertEmpty($changes['deleted']);
    }

    #[Test]
    public function getChangesForAddressBookTracksUpdatedFriends(): void
    {
        $user = $this->createTestUser();
        $friend = $this->createTestFriend((int) $user['id']);

        // Get initial sync token (after creation)
        $initial = $this->backend->getChangesForAddressBook($user['id'], '', 1);

        // Update the friend
        $this->getPdo()->prepare('UPDATE friends.friends SET display_name = :name WHERE id = :id')
            ->execute(['name' => 'Updated Name', 'id' => $friend['id']]);

        // Get changes since initial sync
        $changes = $this->backend->getChangesForAddressBook($user['id'], $initial['syncToken'], 1);

        $this->assertContains($friend['external_id'] . '.vcf', $changes['modified']);
        $this->assertEmpty($changes['added']);
        $this->assertEmpty($changes['deleted']);
    }

    #[Test]
    public function getChangesForAddressBookTracksDeletedFriends(): void
    {
        $user = $this->createTestUser();
        $friend = $this->createTestFriend((int) $user['id']);

        // Get initial sync token (after creation)
        $initial = $this->backend->getChangesForAddressBook($user['id'], '', 1);

        // Soft delete the friend
        $this->getPdo()->prepare('UPDATE friends.friends SET deleted_at = NOW() WHERE id = :id')
            ->execute(['id' => $friend['id']]);

        // Get changes since initial sync
        $changes = $this->backend->getChangesForAddressBook($user['id'], $initial['syncToken'], 1);

        $this->assertContains($friend['external_id'] . '.vcf', $changes['deleted']);
        $this->assertEmpty($changes['added']);
        $this->assertEmpty($changes['modified']);
    }

    #[Test]
    public function getChangesForAddressBookTracksSubResourceChanges(): void
    {
        $user = $this->createTestUser();
        $friend = $this->createTestFriend((int) $user['id']);

        // Get initial sync token (after creation)
        $initial = $this->backend->getChangesForAddressBook($user['id'], '', 1);

        // Add a phone number
        $this->addPhoneToFriend((int) $friend['id'], '+1234567890');

        // Get changes since initial sync
        $changes = $this->backend->getChangesForAddressBook($user['id'], $initial['syncToken'], 1);

        $this->assertContains($friend['external_id'] . '.vcf', $changes['modified']);
    }

    #[Test]
    public function createAddressBookThrowsNotImplemented(): void
    {
        $this->expectException(\Sabre\DAV\Exception\NotImplemented::class);

        $this->backend->createAddressBook('principals/test@example.com', 'new-book', []);
    }

    #[Test]
    public function deleteAddressBookThrowsNotImplemented(): void
    {
        $this->expectException(\Sabre\DAV\Exception\NotImplemented::class);

        $this->backend->deleteAddressBook(1);
    }

    #[Test]
    public function userDataIsolation(): void
    {
        $user1 = $this->createTestUser('user1@example.com');
        $user2 = $this->createTestUser('user2@example.com');

        $friend1 = $this->createTestFriend((int) $user1['id'], ['display_name' => 'User1 Friend']);
        $friend2 = $this->createTestFriend((int) $user2['id'], ['display_name' => 'User2 Friend']);

        // User 1 should only see their friend
        $cards1 = $this->backend->getCards($user1['id']);
        $this->assertCount(1, $cards1);
        $this->assertEquals($friend1['external_id'] . '.vcf', $cards1[0]['uri']);

        // User 2 should only see their friend
        $cards2 = $this->backend->getCards($user2['id']);
        $this->assertCount(1, $cards2);
        $this->assertEquals($friend2['external_id'] . '.vcf', $cards2[0]['uri']);

        // User 1 should not be able to access user 2's friend
        $card = $this->backend->getCard($user1['id'], $friend2['external_id'] . '.vcf');
        $this->assertFalse($card);
    }
}
