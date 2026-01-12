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
            SELECT id, external_id, email
            FROM auth.users
            WHERE email = :email
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
        $stmt = $this->pdo->prepare('
            SELECT external_id, updated_at
            FROM friends.friends
            WHERE user_id = :user_id
              AND deleted_at IS NULL
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
        $friendData = $this->mapper->vcardToFriend($cardData, $externalId);
        $vcardJson = $this->mapper->vcardToJson($cardData);

        $this->pdo->beginTransaction();

        try {
            // Insert main friend
            $stmt = $this->pdo->prepare('
                INSERT INTO friends.friends (
                    user_id, external_id, display_name, name_prefix, name_first,
                    name_middle, name_last, name_suffix, nickname, photo_url,
                    job_title, organization, department, interests, work_notes,
                    vcard_raw_json
                ) VALUES (
                    :user_id, :external_id, :display_name, :name_prefix, :name_first,
                    :name_middle, :name_last, :name_suffix, :nickname, :photo_url,
                    :job_title, :organization, :department, :interests, :work_notes,
                    :vcard_raw_json
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
                'job_title' => $friendData['job_title'] ?? null,
                'organization' => $friendData['organization'] ?? null,
                'department' => $friendData['department'] ?? null,
                'interests' => $friendData['interests'] ?? null,
                'work_notes' => $friendData['work_notes'] ?? null,
                'vcard_raw_json' => json_encode($vcardJson, JSON_THROW_ON_ERROR),
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
            if (!empty($friendData['met_info'])) {
                $this->insertMetInfo($friendId, $friendData['met_info']);
            }

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
        $friendData = $this->mapper->vcardToFriend($cardData, $externalId);
        $vcardJson = $this->mapper->vcardToJson($cardData);

        // Get existing friend ID (before transaction - read only)
        $stmt = $this->pdo->prepare('
            SELECT id FROM friends.friends
            WHERE user_id = :user_id
              AND external_id = :external_id
              AND deleted_at IS NULL
        ');
        $stmt->execute(['user_id' => $addressBookId, 'external_id' => $externalId]);
        $existing = $stmt->fetch();

        if (!$existing) {
            return null;
        }

        $friendId = (int) $existing['id'];

        $this->pdo->beginTransaction();

        try {
            // Update main friend
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
                    job_title = :job_title,
                    organization = :organization,
                    department = :department,
                    interests = :interests,
                    work_notes = :work_notes,
                    vcard_raw_json = :vcard_raw_json
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
                'job_title' => $friendData['job_title'] ?? null,
                'organization' => $friendData['organization'] ?? null,
                'department' => $friendData['department'] ?? null,
                'interests' => $friendData['interests'] ?? null,
                'work_notes' => $friendData['work_notes'] ?? null,
                'vcard_raw_json' => json_encode($vcardJson, JSON_THROW_ON_ERROR),
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
            if (!empty($friendData['met_info'])) {
                $this->insertMetInfo($friendId, $friendData['met_info']);
            }

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

        // Soft delete
        $stmt = $this->pdo->prepare('
            UPDATE friends.friends
            SET deleted_at = NOW()
            WHERE user_id = :user_id
              AND external_id = :external_id
              AND deleted_at IS NULL
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
     * @param mixed $addressBookId The address book ID
     * @param string $syncToken Previous sync token (or empty for full sync)
     * @param int $syncLevel Sync level (1 = immediate children)
     * @param int|null $limit Maximum number of results
     * @return array Changes with new sync token
     */
    public function getChangesForAddressBook($addressBookId, $syncToken, $syncLevel, $limit = null): array
    {
        // Parse sync token to get last change ID
        $lastChangeId = 0;
        if ($syncToken && preg_match('/^sync-(\d+)$/', $syncToken, $matches)) {
            $lastChangeId = (int) $matches[1];
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

        return [
            'syncToken' => 'sync-' . $maxId,
            'added' => array_values($added),
            'modified' => array_values($modified),
            'deleted' => array_values($deleted),
        ];
    }

    // Helper methods

    private function getSyncToken(int $userId): string
    {
        $stmt = $this->pdo->prepare('
            SELECT COALESCE(MAX(id), 0) as max_id
            FROM friends.friend_changes
            WHERE user_id = :user_id
        ');
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();

        return 'sync-' . ($row['max_id'] ?? 0);
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
                'is_primary' => !empty($phone['is_primary']),
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
                'is_primary' => !empty($email['is_primary']),
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
                'is_primary' => !empty($addr['is_primary']),
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
                'year_known' => !empty($date['year_known']),
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
}
