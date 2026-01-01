<?php

declare(strict_types=1);

namespace Freundebuch\DAV\CardDAV;

use PDO;
use Sabre\CardDAV\Backend\AbstractBackend;
use Sabre\CardDAV\Backend\SyncSupport;
use Sabre\DAV\PropPatch;
use Freundebuch\DAV\VCard\Mapper;

/**
 * CardDAV backend for Freundebuch contacts.
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
                'uri' => 'contacts',
                'principaluri' => $principalUri,
                '{DAV:}displayname' => 'Freundebuch Contacts',
                '{' . \Sabre\CardDAV\Plugin::NS_CARDDAV . '}addressbook-description' =>
                    'Contacts from Freundebuch',
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
            FROM contacts.contacts
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

        $contact = $this->mapper->getContactByExternalId((int) $addressBookId, $externalId);

        if (!$contact) {
            return false;
        }

        $vcardData = $this->mapper->contactToVCard($contact);

        return [
            'id' => $contact['external_id'],
            'uri' => $cardUri,
            'carddata' => $vcardData,
            'lastmodified' => strtotime($contact['updated_at']),
            'etag' => '"' . md5($contact['external_id'] . $contact['updated_at']) . '"',
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
        $contactData = $this->mapper->vcardToContact($cardData, $externalId);

        // Insert main contact
        $stmt = $this->pdo->prepare('
            INSERT INTO contacts.contacts (
                user_id, external_id, display_name, name_prefix, name_first,
                name_middle, name_last, name_suffix, nickname, photo_url,
                job_title, organization, department, interests, work_notes
            ) VALUES (
                :user_id, :external_id, :display_name, :name_prefix, :name_first,
                :name_middle, :name_last, :name_suffix, :nickname, :photo_url,
                :job_title, :organization, :department, :interests, :work_notes
            )
            RETURNING id, updated_at
        ');
        $stmt->execute([
            'user_id' => $addressBookId,
            'external_id' => $externalId,
            'display_name' => $contactData['display_name'],
            'name_prefix' => $contactData['name_prefix'] ?? null,
            'name_first' => $contactData['name_first'] ?? null,
            'name_middle' => $contactData['name_middle'] ?? null,
            'name_last' => $contactData['name_last'] ?? null,
            'name_suffix' => $contactData['name_suffix'] ?? null,
            'nickname' => $contactData['nickname'] ?? null,
            'photo_url' => $contactData['photo_url'] ?? null,
            'job_title' => $contactData['job_title'] ?? null,
            'organization' => $contactData['organization'] ?? null,
            'department' => $contactData['department'] ?? null,
            'interests' => $contactData['interests'] ?? null,
            'work_notes' => $contactData['work_notes'] ?? null,
        ]);
        $result = $stmt->fetch();
        $contactId = (int) $result['id'];

        // Insert sub-resources
        $this->insertPhones($contactId, $contactData['phones'] ?? []);
        $this->insertEmails($contactId, $contactData['emails'] ?? []);
        $this->insertAddresses($contactId, $contactData['addresses'] ?? []);
        $this->insertUrls($contactId, $contactData['urls'] ?? []);
        $this->insertDates($contactId, $contactData['dates'] ?? []);
        $this->insertSocialProfiles($contactId, $contactData['social_profiles'] ?? []);
        if (!empty($contactData['met_info'])) {
            $this->insertMetInfo($contactId, $contactData['met_info']);
        }

        return '"' . md5($externalId . $result['updated_at']) . '"';
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
        $contactData = $this->mapper->vcardToContact($cardData, $externalId);

        // Get existing contact ID
        $stmt = $this->pdo->prepare('
            SELECT id FROM contacts.contacts
            WHERE user_id = :user_id
              AND external_id = :external_id
              AND deleted_at IS NULL
        ');
        $stmt->execute(['user_id' => $addressBookId, 'external_id' => $externalId]);
        $existing = $stmt->fetch();

        if (!$existing) {
            return null;
        }

        $contactId = (int) $existing['id'];

        // Update main contact
        $stmt = $this->pdo->prepare('
            UPDATE contacts.contacts SET
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
                work_notes = :work_notes
            WHERE id = :id
            RETURNING updated_at
        ');
        $stmt->execute([
            'id' => $contactId,
            'display_name' => $contactData['display_name'],
            'name_prefix' => $contactData['name_prefix'] ?? null,
            'name_first' => $contactData['name_first'] ?? null,
            'name_middle' => $contactData['name_middle'] ?? null,
            'name_last' => $contactData['name_last'] ?? null,
            'name_suffix' => $contactData['name_suffix'] ?? null,
            'nickname' => $contactData['nickname'] ?? null,
            'photo_url' => $contactData['photo_url'] ?? null,
            'job_title' => $contactData['job_title'] ?? null,
            'organization' => $contactData['organization'] ?? null,
            'department' => $contactData['department'] ?? null,
            'interests' => $contactData['interests'] ?? null,
            'work_notes' => $contactData['work_notes'] ?? null,
        ]);
        $result = $stmt->fetch();

        // Replace sub-resources (delete and re-insert)
        $this->deleteSubResources($contactId);
        $this->insertPhones($contactId, $contactData['phones'] ?? []);
        $this->insertEmails($contactId, $contactData['emails'] ?? []);
        $this->insertAddresses($contactId, $contactData['addresses'] ?? []);
        $this->insertUrls($contactId, $contactData['urls'] ?? []);
        $this->insertDates($contactId, $contactData['dates'] ?? []);
        $this->insertSocialProfiles($contactId, $contactData['social_profiles'] ?? []);
        if (!empty($contactData['met_info'])) {
            $this->insertMetInfo($contactId, $contactData['met_info']);
        }

        return '"' . md5($externalId . $result['updated_at']) . '"';
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
            UPDATE contacts.contacts
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
            SELECT id, contact_external_id, change_type
            FROM contacts.contact_changes
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
            $uri = $row['contact_external_id'] . '.vcf';
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
            FROM contacts.contact_changes
            WHERE user_id = :user_id
        ');
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();

        return 'sync-' . ($row['max_id'] ?? 0);
    }

    private function deleteSubResources(int $contactId): void
    {
        $tables = [
            'contact_phones',
            'contact_emails',
            'contact_addresses',
            'contact_urls',
            'contact_dates',
            'contact_social_profiles',
            'contact_met_info',
        ];

        foreach ($tables as $table) {
            $stmt = $this->pdo->prepare("DELETE FROM contacts.{$table} WHERE contact_id = :id");
            $stmt->execute(['id' => $contactId]);
        }
    }

    private function insertPhones(int $contactId, array $phones): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO contacts.contact_phones (contact_id, phone_number, phone_type, is_primary)
            VALUES (:contact_id, :phone_number, :phone_type, :is_primary)
        ');
        foreach ($phones as $phone) {
            $stmt->execute([
                'contact_id' => $contactId,
                'phone_number' => $phone['phone_number'],
                'phone_type' => $phone['phone_type'] ?? 'mobile',
                'is_primary' => !empty($phone['is_primary']),
            ]);
        }
    }

    private function insertEmails(int $contactId, array $emails): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO contacts.contact_emails (contact_id, email_address, email_type, is_primary)
            VALUES (:contact_id, :email_address, :email_type, :is_primary)
        ');
        foreach ($emails as $email) {
            $stmt->execute([
                'contact_id' => $contactId,
                'email_address' => $email['email_address'],
                'email_type' => $email['email_type'] ?? 'personal',
                'is_primary' => !empty($email['is_primary']),
            ]);
        }
    }

    private function insertAddresses(int $contactId, array $addresses): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO contacts.contact_addresses (
                contact_id, street_line1, city, state_province,
                postal_code, country, address_type, is_primary
            ) VALUES (
                :contact_id, :street_line1, :city, :state_province,
                :postal_code, :country, :address_type, :is_primary
            )
        ');
        foreach ($addresses as $addr) {
            $stmt->execute([
                'contact_id' => $contactId,
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

    private function insertUrls(int $contactId, array $urls): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO contacts.contact_urls (contact_id, url, url_type)
            VALUES (:contact_id, :url, :url_type)
        ');
        foreach ($urls as $url) {
            $stmt->execute([
                'contact_id' => $contactId,
                'url' => $url['url'],
                'url_type' => $url['url_type'] ?? 'other',
            ]);
        }
    }

    private function insertDates(int $contactId, array $dates): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO contacts.contact_dates (contact_id, date_value, year_known, date_type)
            VALUES (:contact_id, :date_value, :year_known, :date_type)
        ');
        foreach ($dates as $date) {
            $stmt->execute([
                'contact_id' => $contactId,
                'date_value' => $date['date_value'],
                'year_known' => !empty($date['year_known']),
                'date_type' => $date['date_type'],
            ]);
        }
    }

    private function insertSocialProfiles(int $contactId, array $profiles): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO contacts.contact_social_profiles (contact_id, platform, profile_url)
            VALUES (:contact_id, :platform, :profile_url)
        ');
        foreach ($profiles as $profile) {
            $stmt->execute([
                'contact_id' => $contactId,
                'platform' => $profile['platform'] ?? 'other',
                'profile_url' => $profile['profile_url'] ?? null,
            ]);
        }
    }

    private function insertMetInfo(int $contactId, array $metInfo): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO contacts.contact_met_info (contact_id, met_date, met_location, met_context)
            VALUES (:contact_id, :met_date, :met_location, :met_context)
        ');
        $stmt->execute([
            'contact_id' => $contactId,
            'met_date' => $metInfo['met_date'] ?? null,
            'met_location' => $metInfo['met_location'] ?? null,
            'met_context' => $metInfo['met_context'] ?? null,
        ]);
    }
}
