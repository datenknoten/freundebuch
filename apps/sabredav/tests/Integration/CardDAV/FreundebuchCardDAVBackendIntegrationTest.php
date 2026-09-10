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

        $externalId = '11111111-2222-3333-4444-555555555555';
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:$externalId
FN:New Friend
N:Friend;New;;;
ORG:Test Company
TEL;TYPE=CELL:+1234567890
EMAIL;TYPE=HOME:new@example.com
END:VCARD
VCARD;

        $etag = $this->backend->createCard($user['id'], $externalId . '.vcf', $vcard);

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
            'external_id' => $externalId,
        ]);
        $friend = $stmt->fetch();

        $this->assertNotFalse($friend);
        $this->assertEquals('New Friend', $friend['display_name']);
        $this->assertEquals('New', $friend['name_first']);
        $this->assertEquals('Friend', $friend['name_last']);
        $this->assertEquals(
            'Test Company',
            $this->fetchPrimaryProfessionalHistory((int) $friend['id'])['organization']
        );

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
        $this->assertEquals(
            'New Company',
            $this->fetchPrimaryProfessionalHistory((int) $updated['id'])['organization']
        );
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
    public function getChangesForAddressBookExpiresSyncZeroWhenTheLogWasPruned(): void
    {
        $user = $this->createTestUser();
        $stmt = self::$pdo->prepare('
            INSERT INTO friends.friend_changes_pruned (user_id, pruned_through_id)
            VALUES (:user_id, 5)
        ');
        $stmt->execute(['user_id' => $user['id']]);

        // sync-0 is an issued token, not "never synced": the client holding it
        // missed everything the sweep removed and must resync in full.
        $this->assertNull($this->backend->getChangesForAddressBook($user['id'], 'sync-0', 1));
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

    #[Test]
    public function archivedFriendIsExcludedFromEveryReadPath(): void
    {
        $user = $this->createTestUser();
        $visible = $this->createTestFriend((int) $user['id'], ['display_name' => 'Visible']);
        $archived = $this->createTestFriend((int) $user['id'], ['display_name' => 'Archived']);

        $this->getPdo()
            ->prepare('UPDATE friends.friends SET archived_at = NOW() WHERE id = :id')
            ->execute(['id' => $archived['id']]);

        // getCards
        $uris = array_column($this->backend->getCards($user['id']), 'uri');
        $this->assertContains($visible['external_id'] . '.vcf', $uris);
        $this->assertNotContains($archived['external_id'] . '.vcf', $uris);

        // getCard
        $this->assertFalse($this->backend->getCard($user['id'], $archived['external_id'] . '.vcf'));

        // The change log still holds the friend's create and archive entries
        // (friend_change_trigger writes both), so any read path derived from it
        // has to filter them out rather than inherit them.
        $logged = $this->getPdo()->prepare(
            'SELECT count(*) AS count FROM friends.friend_changes WHERE friend_external_id = :id'
        );
        $logged->execute(['id' => $archived['external_id']]);
        $this->assertGreaterThan(0, (int) $logged->fetch()['count']);

        // Initial sync reports current members, so the archived friend is
        // simply absent. It is not reported as deleted: the client holds
        // nothing yet, so there is nothing for it to remove.
        $initial = $this->backend->getChangesForAddressBook($user['id'], null, 1);
        $this->assertIsArray($initial);
        $this->assertContains($visible['external_id'] . '.vcf', $initial['added']);
        $this->assertNotContains($archived['external_id'] . '.vcf', $initial['added']);
        $this->assertNotContains($archived['external_id'] . '.vcf', $initial['modified']);
        $this->assertSame([], $initial['deleted']);

        // Writes miss too, rather than editing an unreadable card.
        $vcard = "BEGIN:VCARD\r\nVERSION:4.0\r\nUID:{$archived['external_id']}\r\nFN:Hacked\r\nEND:VCARD";
        $this->assertNull(
            $this->backend->updateCard($user['id'], $archived['external_id'] . '.vcf', $vcard)
        );
        $this->assertFalse(
            $this->backend->deleteCard($user['id'], $archived['external_id'] . '.vcf')
        );
    }

    /**
     * The case that actually matters for archiving: a client that already holds
     * the card. It synced before the archive, so it must be told to remove it -
     * an incremental sync is the only place a deletion means anything.
     */
    #[Test]
    public function archivingAFriendDeletesItForAClientThatAlreadySynced(): void
    {
        $user = $this->createTestUser('archive-sync@example.com');
        $friend = $this->createTestFriend((int) $user['id'], ['display_name' => 'Soon Archived']);

        $before = $this->backend->getChangesForAddressBook($user['id'], null, 1);
        $this->assertIsArray($before);
        $this->assertContains($friend['external_id'] . '.vcf', $before['added']);
        $token = $before['syncToken'];

        $this->getPdo()
            ->prepare('UPDATE friends.friends SET archived_at = NOW() WHERE id = :id')
            ->execute(['id' => $friend['id']]);

        $after = $this->backend->getChangesForAddressBook($user['id'], $token, 1);
        $this->assertIsArray($after);
        $this->assertContains($friend['external_id'] . '.vcf', $after['deleted']);
        $this->assertNotContains($friend['external_id'] . '.vcf', $after['added']);
        $this->assertNotContains($friend['external_id'] . '.vcf', $after['modified']);
    }

    /**
     * The retention sweep deletes tombstones. A client holding a token from
     * before the sweep can no longer be told what was deleted, and RFC 6578
     * requires the server to say so rather than answer with what happens to be
     * left - otherwise the client keeps showing friends that no longer exist.
     */
    #[Test]
    public function expiredSyncTokenForcesFullResync(): void
    {
        $user = $this->createTestUser('prune@example.com');
        $kept = $this->createTestFriend((int) $user['id'], ['display_name' => 'Kept']);
        $doomed = $this->createTestFriend((int) $user['id'], ['display_name' => 'Doomed']);

        // The token a client would be holding before anything is pruned.
        $before = $this->backend->getChangesForAddressBook($user['id'], null, 1);
        $this->assertIsArray($before);
        $tokenBeforePrune = $before['syncToken'];

        // Delete the friend, then age the whole log past the retention window
        // and run the real sweep.
        $this->assertTrue(
            $this->backend->deleteCard($user['id'], $doomed['external_id'] . '.vcf')
        );
        $this->getPdo()->exec(
            "UPDATE friends.friend_changes SET changed_at = now() - interval '91 days'"
        );
        $this->runRetentionSweep();

        // The tombstone is gone, so the old token cannot be answered honestly.
        $this->assertNull(
            $this->backend->getChangesForAddressBook($user['id'], $tokenBeforePrune, 1)
        );

        // A full resync still reports the surviving friend and not the deleted one.
        $full = $this->backend->getChangesForAddressBook($user['id'], null, 1);
        $this->assertIsArray($full);
        $this->assertContains($kept['external_id'] . '.vcf', $full['added']);
        $this->assertNotContains($doomed['external_id'] . '.vcf', $full['added']);
    }

    #[Test]
    public function syncTokenDoesNotRegressAfterPruning(): void
    {
        $user = $this->createTestUser('noregress@example.com');
        $this->createTestFriend((int) $user['id'], ['display_name' => 'Only']);

        $before = $this->backend->getChangesForAddressBook($user['id'], null, 1);
        $this->assertIsArray($before);
        $tokenBefore = (int) substr((string) $before['syncToken'], strlen('sync-'));
        $this->assertGreaterThan(0, $tokenBefore);

        // Sweep every row this user has: MAX(id) becomes null.
        $this->getPdo()->exec(
            "UPDATE friends.friend_changes SET changed_at = now() - interval '91 days'"
        );
        $this->runRetentionSweep();

        $rows = $this->getPdo()->prepare(
            'SELECT count(*) AS count FROM friends.friend_changes WHERE user_id = :id'
        );
        $rows->execute(['id' => $user['id']]);
        $this->assertSame(0, (int) $rows->fetch()['count']);

        // A token of sync-0 reads as "never synced" to every client.
        $after = $this->backend->getChangesForAddressBook($user['id'], null, 1);
        $this->assertIsArray($after);
        $tokenAfter = (int) substr((string) $after['syncToken'], strlen('sync-'));
        $this->assertGreaterThanOrEqual($tokenBefore, $tokenAfter);
    }

    #[Test]
    public function unparseableSyncTokenForcesFullResync(): void
    {
        $user = $this->createTestUser('badtoken@example.com');
        $this->createTestFriend((int) $user['id'], ['display_name' => 'Someone']);

        $this->assertNull(
            $this->backend->getChangesForAddressBook($user['id'], 'not-a-token', 1)
        );
    }

    /**
     * A vCard carries one ORG/TITLE slot, so a PUT must reconcile the primary
     * position - not replace the table. Clients re-PUT the whole card for any
     * trivial edit, so replacing would destroy every past position and re-date
     * the current one to today.
     */
    #[Test]
    public function updateCardKeepsProfessionalHistoryAndItsDates(): void
    {
        $user = $this->createTestUser('history@example.com');
        $friend = $this->createTestFriend((int) $user['id'], ['display_name' => 'Has History']);

        $insert = $this->getPdo()->prepare('
            INSERT INTO friends.friend_professional_history (
                friend_id, job_title, organization, from_month, from_year,
                to_month, to_year, is_primary
            ) VALUES (
                :friend_id, :job_title, :organization, :from_month, :from_year,
                :to_month, :to_year, :is_primary
            )
        ');
        $insert->execute([
            'friend_id' => $friend['id'],
            'job_title' => 'CEO',
            'organization' => 'Old GmbH',
            'from_month' => 3,
            'from_year' => 2019,
            'to_month' => null,
            'to_year' => null,
            'is_primary' => 'true',
        ]);
        $insert->execute([
            'friend_id' => $friend['id'],
            'job_title' => 'Intern',
            'organization' => 'Older AG',
            'from_month' => 1,
            'from_year' => 2015,
            'to_month' => 2,
            'to_year' => 2019,
            'is_primary' => 'false',
        ]);

        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:{$friend['external_id']}
FN:Has History
ORG:New GmbH
TITLE:CTO
END:VCARD
VCARD;

        $this->assertNotNull(
            $this->backend->updateCard($user['id'], $friend['external_id'] . '.vcf', $vcard)
        );

        $rows = $this->fetchProfessionalHistory((int) $friend['id']);
        $this->assertCount(2, $rows, 'past positions must survive a PUT');

        $primary = $this->fetchPrimaryProfessionalHistory((int) $friend['id']);
        $this->assertSame('New GmbH', $primary['organization']);
        $this->assertSame('CTO', $primary['job_title']);
        $this->assertSame(3, (int) $primary['from_month'], 'start date must not be re-dated');
        $this->assertSame(2019, (int) $primary['from_year']);

        $past = array_values(array_filter(
            $rows,
            static fn (array $row): bool => $row['organization'] === 'Older AG'
        ));
        $this->assertCount(1, $past);
        $this->assertSame('Intern', $past[0]['job_title']);
        $this->assertSame(2019, (int) $past[0]['to_year']);
    }

    /**
     * No ORG/TITLE/NOTE means "this client cannot represent history", not
     * "the friend never had a job".
     */
    #[Test]
    public function updateCardWithoutProfessionalDataLeavesHistoryUntouched(): void
    {
        $user = $this->createTestUser('nohistory@example.com');
        $friend = $this->createTestFriend((int) $user['id'], ['display_name' => 'Keeps History']);

        $this->getPdo()->prepare('
            INSERT INTO friends.friend_professional_history (
                friend_id, job_title, organization, from_month, from_year, is_primary
            ) VALUES (:friend_id, :job_title, :organization, 3, 2019, true)
        ')->execute([
            'friend_id' => $friend['id'],
            'job_title' => 'CEO',
            'organization' => 'Old GmbH',
        ]);

        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:{$friend['external_id']}
FN:Renamed Only
END:VCARD
VCARD;

        $this->assertNotNull(
            $this->backend->updateCard($user['id'], $friend['external_id'] . '.vcf', $vcard)
        );

        $primary = $this->fetchPrimaryProfessionalHistory((int) $friend['id']);
        $this->assertIsArray($primary);
        $this->assertSame('Old GmbH', $primary['organization']);
        $this->assertSame('CEO', $primary['job_title']);
        $this->assertSame(2019, (int) $primary['from_year']);
    }
    /**
     * @return list<array<string, mixed>>
     */
    private function fetchProfessionalHistory(int $friendId): array
    {
        $stmt = $this->getPdo()->prepare('
            SELECT * FROM friends.friend_professional_history
            WHERE friend_id = :friend_id
            ORDER BY id
        ');
        $stmt->execute(['friend_id' => $friendId]);

        return $stmt->fetchAll();
    }

    /**
     * The production retention query, kept in one place so the tests exercise
     * the same SQL the scheduler runs.
     */
    private function runRetentionSweep(): void
    {
        $sql = file_get_contents(
            __DIR__ . '/../../../../backend/src/models/queries/friend-changes.sql'
        );
        $this->assertNotFalse($sql);
        $this->getPdo()->exec($sql);
    }
}
