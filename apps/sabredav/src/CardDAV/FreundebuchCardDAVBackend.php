<?php

declare(strict_types=1);

namespace Freundebuch\DAV\CardDAV;

use PDO;
use Sabre\CardDAV\Backend\AbstractBackend;
use Sabre\CardDAV\Backend\SyncSupport;
use Sabre\DAV\PropPatch;
use Freundebuch\DAV\VCard\Mapper;

/**
 * CardDAV backend for Freundebuch friends.
 *
 * Implements full CardDAV support including sync-collection (RFC 6578).
 */
class FreundebuchCardDAVBackend extends AbstractBackend implements SyncSupport
{
    private PDO $pdo;
    private Mapper $mapper;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->mapper = new Mapper($pdo);
    }

    /**
     * Returns the list of address books for a specific user.
     *
     * @param string $principalUri The principal URI
     * @return array List of address books
     */
    public function getAddressBooksForUser($principalUri): array
    {
        $email = basename($principalUri);

        $stmt = $this->pdo->prepare('
            SELECT u.id, u.external_id, bu.email
            FROM auth.users u
            JOIN auth."user" bu ON bu.id = u.external_id::text
            WHERE bu.email = lower(:email)
        ');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        if (!$user) {
            return [];
        }

        // Get current sync token
        $syncToken = $this->getSyncToken((int) $user['id']);

        // Each user has one address book
        return [
            [
                'id' => $user['id'],
                'uri' => 'friends',
                'principaluri' => $principalUri,
                '{DAV:}displayname' => 'Freundebuch Friends',
                '{' . \Sabre\CardDAV\Plugin::NS_CARDDAV . '}addressbook-description' =>
                    'Friends from Freundebuch',
                '{http://calendarserver.org/ns/}getctag' => $syncToken,
                '{http://sabredav.org/ns}sync-token' => $syncToken,
            ],
        ];
    }

    /**
     * Updates an address book's properties.
     */
    public function updateAddressBook($addressBookId, PropPatch $propPatch): void
    {
        // Address book properties are not editable
    }

    /**
     * Creates a new address book.
     */
    public function createAddressBook($principalUri, $url, array $properties): void
    {
        // Only one address book per user, creation not supported
        throw new \Sabre\DAV\Exception\NotImplemented(
            'Creating additional address books is not supported'
        );
    }

    /**
     * Deletes an address book.
     */
    public function deleteAddressBook($addressBookId): void
    {
        // Address book deletion not supported
        throw new \Sabre\DAV\Exception\NotImplemented(
            'Deleting the address book is not supported'
        );
    }

    /**
     * Returns all cards for a specific address book.
     *
     * @param mixed $addressBookId The address book ID (user_id)
     * @return array List of cards with metadata
     */
    public function getCards($addressBookId): array
    {
        // Epic 4: Filter out archived contacts (they shouldn't sync to CardDAV clients)
        $stmt = $this->pdo->prepare('
            SELECT external_id, updated_at
            FROM friends.friends
            WHERE user_id = :user_id
              AND deleted_at IS NULL
              AND archived_at IS NULL
        ');
        $stmt->execute(['user_id' => $addressBookId]);

        $cards = [];
        while ($row = $stmt->fetch()) {
            $cards[] = [
                'id' => $row['external_id'],
                'uri' => $row['external_id'] . '.vcf',
                'lastmodified' => strtotime($row['updated_at']),
                'etag' => '"' . md5($row['external_id'] . $row['updated_at']) . '"',
            ];
        }

        return $cards;
    }

    /**
     * Returns a specific card.
     *
     * @param mixed $addressBookId The address book ID (user_id)
     * @param string $cardUri The card URI (external_id.vcf)
     * @return array|false Card data or false if not found
     */
    public function getCard($addressBookId, $cardUri): array|false
    {
        $externalId = str_replace('.vcf', '', $cardUri);
        if (!self::isUuid($externalId)) {
            return false;
        }

        $friend = $this->mapper->getFriendByExternalId((int) $addressBookId, $externalId);

        if (!$friend) {
            return false;
        }

        $vcardData = $this->mapper->friendToVCard($friend);

        return [
            'id' => $friend['external_id'],
            'uri' => $cardUri,
            'carddata' => $vcardData,
            'lastmodified' => strtotime($friend['updated_at']),
            'etag' => '"' . md5($friend['external_id'] . $friend['updated_at']) . '"',
            'size' => strlen($vcardData),
        ];
    }

    /**
     * Returns multiple cards.
     *
     * @param mixed $addressBookId The address book ID
     * @param array $uris Card URIs to fetch
     * @return array List of card data
     */
    public function getMultipleCards($addressBookId, array $uris): array
    {
        $cards = [];
        foreach ($uris as $uri) {
            $card = $this->getCard($addressBookId, $uri);
            if ($card) {
                $cards[] = $card;
            }
        }
        return $cards;
    }

    /**
     * Creates a new card.
     *
     * @param mixed $addressBookId The address book ID (user_id)
     * @param string $cardUri The card URI
     * @param string $cardData vCard data
     * @return string|null ETag of created card
     */
    public function createCard($addressBookId, $cardUri, $cardData): ?string
    {
        $externalId = str_replace('.vcf', '', $cardUri);
        if (!self::isUuid($externalId)) {
            // external_id is a uuid column and the card URI is derived from it,
            // so a card we cannot address by the client's own URI is useless.
            throw new \Sabre\DAV\Exception\BadRequest('Card URI must be a UUID');
        }

        $friendData = $this->mapper->vcardToFriend($cardData, $externalId);
        $vcardJson = $this->mapper->vcardToJson($cardData);

        $this->pdo->beginTransaction();

        try {
            // Insert main friend (Epic 4: includes is_favorite)
            $stmt = $this->pdo->prepare('
                INSERT INTO friends.friends (
                    user_id, external_id, display_name, name_prefix, name_first,
                    name_middle, name_last, name_suffix, nickname, photo_url,
                    interests, vcard_raw_json, is_favorite
                ) VALUES (
                    :user_id, :external_id, :display_name, :name_prefix, :name_first,
                    :name_middle, :name_last, :name_suffix, :nickname, :photo_url,
                    :interests, :vcard_raw_json, :is_favorite
                )
                RETURNING id, updated_at
            ');
            $stmt->execute([
                'user_id' => $addressBookId,
                'external_id' => $externalId,
                'display_name' => $friendData['display_name'],
                'name_prefix' => $friendData['name_prefix'] ?? null,
                'name_first' => $friendData['name_first'] ?? null,
                'name_middle' => $friendData['name_middle'] ?? null,
                'name_last' => $friendData['name_last'] ?? null,
                'name_suffix' => $friendData['name_suffix'] ?? null,
                'nickname' => $friendData['nickname'] ?? null,
                'photo_url' => $friendData['photo_url'] ?? null,
                'interests' => $friendData['interests'] ?? null,
                'vcard_raw_json' => json_encode($vcardJson, JSON_THROW_ON_ERROR),
                'is_favorite' => self::pgBool(!empty($friendData['is_favorite'])),
            ]);
            $result = $stmt->fetch();
            $friendId = (int) $result['id'];

            // Insert sub-resources
            $this->insertPhones($friendId, $friendData['phones'] ?? []);
            $this->insertEmails($friendId, $friendData['emails'] ?? []);
            $this->insertAddresses($friendId, $friendData['addresses'] ?? []);
            $this->insertUrls($friendId, $friendData['urls'] ?? []);
            $this->insertDates($friendId, $friendData['dates'] ?? []);
            $this->insertSocialProfiles($friendId, $friendData['social_profiles'] ?? []);
            $this->insertProfessionalHistory($friendId, $friendData['professional_history'] ?? []);
            if (!empty($friendData['met_info'])) {
                $this->insertMetInfo($friendId, $friendData['met_info']);
            }

            // Epic 4: Assign circles from CATEGORIES
            $this->insertCircles((int) $addressBookId, $friendId, $friendData['categories'] ?? []);

            $this->pdo->commit();

            return '"' . md5($externalId . $result['updated_at']) . '"';
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Updates an existing card.
     *
     * @param mixed $addressBookId The address book ID (user_id)
     * @param string $cardUri The card URI
     * @param string $cardData vCard data
     * @return string|null New ETag
     */
    public function updateCard($addressBookId, $cardUri, $cardData): ?string
    {
        $externalId = str_replace('.vcf', '', $cardUri);
        if (!self::isUuid($externalId)) {
            return null;
        }

        $friendData = $this->mapper->vcardToFriend($cardData, $externalId);
        $vcardJson = $this->mapper->vcardToJson($cardData);

        // Get existing friend ID (before transaction - read only)
        // Same predicate as getCards/getCard: an archived friend is not part of
        // the collection, so a PUT to it must miss rather than silently edit a
        // card the client cannot read back.
        $stmt = $this->pdo->prepare('
            SELECT id FROM friends.friends
            WHERE user_id = :user_id
              AND external_id = :external_id
              AND deleted_at IS NULL
              AND archived_at IS NULL
        ');
        $stmt->execute(['user_id' => $addressBookId, 'external_id' => $externalId]);
        $existing = $stmt->fetch();

        if (!$existing) {
            return null;
        }

        $friendId = (int) $existing['id'];

        $this->pdo->beginTransaction();

        try {
            // Update main friend (Epic 4: includes is_favorite)
            $stmt = $this->pdo->prepare('
                UPDATE friends.friends SET
                    display_name = :display_name,
                    name_prefix = :name_prefix,
                    name_first = :name_first,
                    name_middle = :name_middle,
                    name_last = :name_last,
                    name_suffix = :name_suffix,
                    nickname = :nickname,
                    photo_url = :photo_url,
                    interests = :interests,
                    vcard_raw_json = :vcard_raw_json,
                    is_favorite = :is_favorite
                WHERE id = :id
                RETURNING updated_at
            ');
            $stmt->execute([
                'id' => $friendId,
                'display_name' => $friendData['display_name'],
                'name_prefix' => $friendData['name_prefix'] ?? null,
                'name_first' => $friendData['name_first'] ?? null,
                'name_middle' => $friendData['name_middle'] ?? null,
                'name_last' => $friendData['name_last'] ?? null,
                'name_suffix' => $friendData['name_suffix'] ?? null,
                'nickname' => $friendData['nickname'] ?? null,
                'photo_url' => $friendData['photo_url'] ?? null,
                'interests' => $friendData['interests'] ?? null,
                'vcard_raw_json' => json_encode($vcardJson, JSON_THROW_ON_ERROR),
                'is_favorite' => self::pgBool(!empty($friendData['is_favorite'])),
            ]);
            $result = $stmt->fetch();

            // Replace sub-resources (delete and re-insert)
            $this->deleteSubResources($friendId);
            $this->insertPhones($friendId, $friendData['phones'] ?? []);
            $this->insertEmails($friendId, $friendData['emails'] ?? []);
            $this->insertAddresses($friendId, $friendData['addresses'] ?? []);
            $this->insertUrls($friendId, $friendData['urls'] ?? []);
            $this->insertDates($friendId, $friendData['dates'] ?? []);
            $this->insertSocialProfiles($friendId, $friendData['social_profiles'] ?? []);
            $this->insertProfessionalHistory($friendId, $friendData['professional_history'] ?? []);
            if (!empty($friendData['met_info'])) {
                $this->insertMetInfo($friendId, $friendData['met_info']);
            }

            // Epic 4: Reassign circles from CATEGORIES
            $this->insertCircles((int) $addressBookId, $friendId, $friendData['categories'] ?? []);

            $this->pdo->commit();

            return '"' . md5($externalId . $result['updated_at']) . '"';
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Deletes a card.
     *
     * @param mixed $addressBookId The address book ID (user_id)
     * @param string $cardUri The card URI
     * @return bool Success
     */
    public function deleteCard($addressBookId, $cardUri): bool
    {
        $externalId = str_replace('.vcf', '', $cardUri);
        if (!self::isUuid($externalId)) {
            return false;
        }

        // Soft delete
        $stmt = $this->pdo->prepare('
            UPDATE friends.friends
            SET deleted_at = NOW()
            WHERE user_id = :user_id
              AND external_id = :external_id
              AND deleted_at IS NULL
              AND archived_at IS NULL
        ');
        $stmt->execute([
            'user_id' => $addressBookId,
            'external_id' => $externalId,
        ]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Returns changes since a sync token (RFC 6578).
     *
     * Returns null when the token is unknown or expired, which SabreDAV turns
     * into a full resync. That is not optional: the retention sweep deletes
     * tombstones, so answering a token from before the sweep with the rows
     * that happen to be left would silently drop deletions and leave the
     * client showing friends that no longer exist.
     *
     * @param mixed $addressBookId The address book ID
     * @param string $syncToken Previous sync token (or empty for full sync)
     * @param int $syncLevel Sync level (1 = immediate children)
     * @param int|null $limit Maximum number of results
     * @return array|null Changes with new sync token, or null to force a full resync
     */
    public function getChangesForAddressBook($addressBookId, $syncToken, $syncLevel, $limit = null): ?array
    {
        // An initial sync must report every current member, per the
        // SyncSupport contract. Deriving it from the change log instead would
        // hand a fresh client an empty address book whenever the log has been
        // pruned - the log records history, not the present state.
        if (!$syncToken) {
            $uris = [];
            foreach ($this->getCards($addressBookId) as $card) {
                $uris[] = $card['uri'];
            }

            return [
                'syncToken' => $this->getSyncToken((int) $addressBookId),
                'added' => $uris,
                'modified' => [],
                'deleted' => [],
            ];
        }

        if (!preg_match('/^sync-(\d+)$/', $syncToken, $matches)) {
            // Not a token this backend ever issued.
            return null;
        }
        $lastChangeId = (int) $matches[1];

        // Everything the client is missing may already have been pruned.
        if ($lastChangeId > 0 && $lastChangeId < $this->getPrunedThroughId((int) $addressBookId)) {
            return null;
        }
        $sql = '
            SELECT id, friend_external_id, change_type
            FROM friends.friend_changes
            WHERE user_id = :user_id
              AND id > :last_change_id
            ORDER BY id ASC
        ';
        if ($limit) {
            $sql .= ' LIMIT ' . (int) $limit;
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'user_id' => $addressBookId,
            'last_change_id' => $lastChangeId,
        ]);

        $added = [];
        $modified = [];
        $deleted = [];
        $maxId = $lastChangeId;

        while ($row = $stmt->fetch()) {
            $uri = $row['friend_external_id'] . '.vcf';
            $maxId = max($maxId, (int) $row['id']);

            switch ($row['change_type']) {
                case 'create':
                    // Remove from modified/deleted if present
                    $modified = array_diff($modified, [$uri]);
                    $deleted = array_diff($deleted, [$uri]);
                    if (!in_array($uri, $added, true)) {
                        $added[] = $uri;
                    }
                    break;

                case 'update':
                    if (!in_array($uri, $added, true) && !in_array($uri, $modified, true)) {
                        $modified[] = $uri;
                    }
                    break;

                case 'delete':
                    // Remove from added/modified
                    $added = array_diff($added, [$uri]);
                    $modified = array_diff($modified, [$uri]);
                    if (!in_array($uri, $deleted, true)) {
                        $deleted[] = $uri;
                    }
                    break;
            }
        }

        // The change log does not know about archiving, but getCards/getCard do:
        // an archived friend that shows up as added or modified would be a card
        // the client then cannot fetch. Report it as a deletion instead, which
        // is what the client has to do with it anyway.
        $visible = $this->filterVisibleUris($addressBookId, array_merge($added, $modified));
        foreach (array_merge($added, $modified) as $uri) {
            if (!in_array($uri, $visible, true) && !in_array($uri, $deleted, true)) {
                $deleted[] = $uri;
            }
        }
        $added = array_values(array_intersect($added, $visible));
        $modified = array_values(array_intersect($modified, $visible));

        // Floored at the prune watermark: with the log swept empty there is no
        // row to raise $maxId above the client's own token, and handing back a
        // lower one than was issued reads as "never synced".
        $maxId = max($maxId, $this->getPrunedThroughId((int) $addressBookId));

        return [
            'syncToken' => 'sync-' . $maxId,
            'added' => array_values($added),
            'modified' => array_values($modified),
            'deleted' => array_values($deleted),
        ];
    }

    // Helper methods

    /**
     * The highest change id the retention sweep has removed for this user, or
     * 0 if nothing has been pruned yet.
     */
    private function getPrunedThroughId(int $userId): int
    {
        $stmt = $this->pdo->prepare('
            SELECT pruned_through_id
            FROM friends.friend_changes_pruned
            WHERE user_id = :user_id
        ');
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();

        return $row === false ? 0 : (int) $row['pruned_through_id'];
    }

    /**
     * The token advertised to clients.
     *
     * Floored at the prune watermark so it cannot go backwards: once the sweep
     * removes a user's last log row, `MAX(id)` is null and the naive token
     * would fall back to `sync-0`, which every client reads as "never synced".
     */
    private function getSyncToken(int $userId): string
    {
        // The id is bound once and joined in: PDO's pgsql driver uses native
        // prepares, where repeating a named placeholder is an error.
        $stmt = $this->pdo->prepare('
            SELECT GREATEST(
                     COALESCE((SELECT MAX(id) FROM friends.friend_changes WHERE user_id = u.id), 0),
                     COALESCE((SELECT pruned_through_id FROM friends.friend_changes_pruned WHERE user_id = u.id), 0)
                   ) AS max_id
            FROM (SELECT CAST(:user_id AS integer) AS id) u
        ');
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();

        return 'sync-' . ($row['max_id'] ?? 0);
    }

    /**
     * PDO's pgsql driver binds PHP `false` as an empty string, which Postgres
     * rejects for a boolean column. Bind the literal instead.
     */
    private static function pgBool(bool $value): string
    {
        return $value ? 'true' : 'false';
    }

    /**
     * Card URIs come straight from the client, but `external_id` is a uuid
     * column: comparing a non-UUID string raises 22P02 (a 500) instead of
     * missing cleanly.
     */
    private static function isUuid(string $value): bool
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value) === 1;
    }

    /**
     * Of the given `<external_id>.vcf` URIs, the ones that are actually part of
     * the address book (not deleted, not archived).
     *
     * @param array<string> $uris
     * @return array<string>
     */
    private function filterVisibleUris(int $addressBookId, array $uris): array
    {
        if ($uris === []) {
            return [];
        }

        $externalIds = [];
        foreach ($uris as $uri) {
            $externalId = str_replace('.vcf', '', $uri);
            if (self::isUuid($externalId)) {
                $externalIds[] = $externalId;
            }
        }
        if ($externalIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($externalIds), '?'));
        $stmt = $this->pdo->prepare(
            'SELECT external_id FROM friends.friends
               WHERE user_id = ?
                 AND external_id::text IN (' . $placeholders . ')
                 AND deleted_at IS NULL
                 AND archived_at IS NULL'
        );
        $stmt->execute([$addressBookId, ...$externalIds]);

        $visible = [];
        while ($row = $stmt->fetch()) {
            $visible[] = $row['external_id'] . '.vcf';
        }

        return $visible;
    }

    private function deleteSubResources(int $friendId): void
    {
        // Use explicit DELETE queries for each table to avoid string concatenation
        $this->pdo->prepare('DELETE FROM friends.friend_phones WHERE friend_id = :id')
            ->execute(['id' => $friendId]);
        $this->pdo->prepare('DELETE FROM friends.friend_emails WHERE friend_id = :id')
            ->execute(['id' => $friendId]);
        $this->pdo->prepare('DELETE FROM friends.friend_addresses WHERE friend_id = :id')
            ->execute(['id' => $friendId]);
        $this->pdo->prepare('DELETE FROM friends.friend_urls WHERE friend_id = :id')
            ->execute(['id' => $friendId]);
        $this->pdo->prepare('DELETE FROM friends.friend_dates WHERE friend_id = :id')
            ->execute(['id' => $friendId]);
        $this->pdo->prepare('DELETE FROM friends.friend_social_profiles WHERE friend_id = :id')
            ->execute(['id' => $friendId]);
        $this->pdo->prepare('DELETE FROM friends.friend_met_info WHERE friend_id = :id')
            ->execute(['id' => $friendId]);
        // Epic 4: Remove circle assignments (they will be re-assigned)
        $this->pdo->prepare('DELETE FROM friends.friend_circles WHERE friend_id = :id')
            ->execute(['id' => $friendId]);
        $this->pdo->prepare('DELETE FROM friends.friend_professional_history WHERE friend_id = :id')
            ->execute(['id' => $friendId]);
    }

    private function insertPhones(int $friendId, array $phones): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO friends.friend_phones (friend_id, phone_number, phone_type, is_primary)
            VALUES (:friend_id, :phone_number, :phone_type, :is_primary)
        ');
        foreach ($phones as $phone) {
            $stmt->execute([
                'friend_id' => $friendId,
                'phone_number' => $phone['phone_number'],
                'phone_type' => $phone['phone_type'] ?? 'mobile',
                'is_primary' => self::pgBool(!empty($phone['is_primary'])),
            ]);
        }
    }

    private function insertEmails(int $friendId, array $emails): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO friends.friend_emails (friend_id, email_address, email_type, is_primary)
            VALUES (:friend_id, :email_address, :email_type, :is_primary)
        ');
        foreach ($emails as $email) {
            $stmt->execute([
                'friend_id' => $friendId,
                'email_address' => $email['email_address'],
                'email_type' => $email['email_type'] ?? 'personal',
                'is_primary' => self::pgBool(!empty($email['is_primary'])),
            ]);
        }
    }

    private function insertAddresses(int $friendId, array $addresses): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO friends.friend_addresses (
                friend_id, street_line1, city, state_province,
                postal_code, country, address_type, is_primary
            ) VALUES (
                :friend_id, :street_line1, :city, :state_province,
                :postal_code, :country, :address_type, :is_primary
            )
        ');
        foreach ($addresses as $addr) {
            $stmt->execute([
                'friend_id' => $friendId,
                'street_line1' => $addr['street_line1'] ?? null,
                'city' => $addr['city'] ?? null,
                'state_province' => $addr['state_province'] ?? null,
                'postal_code' => $addr['postal_code'] ?? null,
                'country' => $addr['country'] ?? null,
                'address_type' => $addr['address_type'] ?? 'home',
                'is_primary' => self::pgBool(!empty($addr['is_primary'])),
            ]);
        }
    }

    private function insertUrls(int $friendId, array $urls): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO friends.friend_urls (friend_id, url, url_type)
            VALUES (:friend_id, :url, :url_type)
        ');
        foreach ($urls as $url) {
            $stmt->execute([
                'friend_id' => $friendId,
                'url' => $url['url'],
                'url_type' => $url['url_type'] ?? 'other',
            ]);
        }
    }

    private function insertDates(int $friendId, array $dates): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO friends.friend_dates (friend_id, date_value, year_known, date_type)
            VALUES (:friend_id, :date_value, :year_known, :date_type)
        ');
        foreach ($dates as $date) {
            $stmt->execute([
                'friend_id' => $friendId,
                'date_value' => $date['date_value'],
                'year_known' => self::pgBool(!empty($date['year_known'])),
                'date_type' => $date['date_type'],
            ]);
        }
    }

    private function insertSocialProfiles(int $friendId, array $profiles): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO friends.friend_social_profiles (friend_id, platform, profile_url)
            VALUES (:friend_id, :platform, :profile_url)
        ');
        foreach ($profiles as $profile) {
            $stmt->execute([
                'friend_id' => $friendId,
                'platform' => $profile['platform'] ?? 'other',
                'profile_url' => $profile['profile_url'] ?? null,
            ]);
        }
    }

    private function insertMetInfo(int $friendId, array $metInfo): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO friends.friend_met_info (friend_id, met_date, met_location, met_context)
            VALUES (:friend_id, :met_date, :met_location, :met_context)
        ');
        $stmt->execute([
            'friend_id' => $friendId,
            'met_date' => $metInfo['met_date'] ?? null,
            'met_location' => $metInfo['met_location'] ?? null,
            'met_context' => $metInfo['met_context'] ?? null,
        ]);
    }

    /**
     * Professional data lives in its own table since the professional-history
     * migration; `friends.friends` no longer has job_title/organization/
     * department/work_notes columns.
     */
    private function insertProfessionalHistory(int $friendId, array $entries): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO friends.friend_professional_history (
                friend_id, job_title, organization, department, notes,
                from_month, from_year, to_month, to_year, is_primary
            ) VALUES (
                :friend_id, :job_title, :organization, :department, :notes,
                :from_month, :from_year, :to_month, :to_year, :is_primary
            )
        ');
        foreach ($entries as $entry) {
            $stmt->execute([
                'friend_id' => $friendId,
                'job_title' => $entry['job_title'] ?? null,
                'organization' => $entry['organization'] ?? null,
                'department' => $entry['department'] ?? null,
                'notes' => $entry['notes'] ?? null,
                'from_month' => $entry['from_month'] ?? null,
                'from_year' => $entry['from_year'] ?? null,
                'to_month' => $entry['to_month'] ?? null,
                'to_year' => $entry['to_year'] ?? null,
                'is_primary' => self::pgBool(!empty($entry['is_primary'])),
            ]);
        }
    }

    /**
     * Epic 4: Assigns circles to a friend based on CATEGORIES from vCard.
     *
     * For each category name, finds an existing circle or creates a new one,
     * then links the friend to that circle.
     *
     * Uses two-step matching: exact match first, then case-insensitive fallback.
     * This preserves circle name casing while being flexible for imports.
     *
     * @param int $userId The user ID (address book owner)
     * @param int $friendId The friend's internal ID
     * @param array $categories Circle names from vCard CATEGORIES
     */
    private function insertCircles(int $userId, int $friendId, array $categories): void
    {
        if (empty($categories)) {
            return;
        }

        // Prepare statements for reuse
        // Step 1: Try exact match first (preserves casing)
        $findCircleExact = $this->pdo->prepare('
            SELECT id FROM friends.circles
            WHERE user_id = :user_id AND name = :name
        ');

        // Step 2: Fall back to case-insensitive if no exact match
        $findCircleCaseInsensitive = $this->pdo->prepare('
            SELECT id FROM friends.circles
            WHERE user_id = :user_id AND LOWER(name) = LOWER(:name)
        ');

        $createCircle = $this->pdo->prepare('
            INSERT INTO friends.circles (user_id, external_id, name, sort_order)
            VALUES (:user_id, :external_id, :name, :sort_order)
            RETURNING id
        ');

        $linkCircle = $this->pdo->prepare('
            INSERT INTO friends.friend_circles (friend_id, circle_id)
            VALUES (:friend_id, :circle_id)
            ON CONFLICT (friend_id, circle_id) DO NOTHING
        ');

        // Get current max sort_order for new circles
        $maxSort = $this->pdo->prepare('
            SELECT COALESCE(MAX(sort_order), 0) as max_sort
            FROM friends.circles WHERE user_id = :user_id
        ');
        $maxSort->execute(['user_id' => $userId]);
        $sortOrder = (int) $maxSort->fetch()['max_sort'];

        foreach ($categories as $categoryName) {
            // Trim and truncate to 100 chars to match database constraint
            $categoryName = mb_substr(trim($categoryName), 0, 100);
            if (empty($categoryName)) {
                continue;
            }

            // Step 1: Try exact match first (preserves original casing)
            $findCircleExact->execute(['user_id' => $userId, 'name' => $categoryName]);
            $circle = $findCircleExact->fetch();

            // Step 2: Fall back to case-insensitive if no exact match
            if (!$circle) {
                $findCircleCaseInsensitive->execute(['user_id' => $userId, 'name' => $categoryName]);
                $circle = $findCircleCaseInsensitive->fetch();
            }

            if ($circle) {
                $circleId = (int) $circle['id'];
            } else {
                // Create new circle
                $sortOrder++;
                $externalId = $this->generateUuid();
                $createCircle->execute([
                    'user_id' => $userId,
                    'external_id' => $externalId,
                    'name' => $categoryName,
                    'sort_order' => $sortOrder,
                ]);
                $circleId = (int) $createCircle->fetch()['id'];
            }

            // Link friend to circle
            $linkCircle->execute([
                'friend_id' => $friendId,
                'circle_id' => $circleId,
            ]);
        }
    }

    /**
     * Generates a UUID v4 for new circles created via CardDAV import.
     */
    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40); // Version 4
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80); // Variant
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
