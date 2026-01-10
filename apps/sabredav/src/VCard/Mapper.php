<?php

declare(strict_types=1);

namespace Freundebuch\DAV\VCard;

use PDO;

/**
 * vCard 4.0 mapper for Freundebuch contacts.
 *
 * Handles bidirectional conversion between Freundebuch contact data
 * and vCard 4.0 format (RFC 6350).
 */
class Mapper
{
    private PDO $pdo;

    /**
     * Cache for fetched images to avoid repeated HTTP requests
     * @var array<string, array{data: string, mediatype: string}|null>
     */
    private array $imageCache = [];

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Converts a Freundebuch contact to vCard 4.0 format.
     *
     * @param array $contact Full contact data with all sub-resources
     * @return string vCard 4.0 string
     */
    public function contactToVCard(array $contact): string
    {
        $lines = [
            'BEGIN:VCARD',
            'VERSION:4.0',
            'UID:' . $contact['external_id'],
            'FN:' . $this->escape($contact['display_name']),
        ];

        // Structured name (N)
        $hasName = !empty($contact['name_last']) || !empty($contact['name_first']) ||
                   !empty($contact['name_middle']) || !empty($contact['name_prefix']) ||
                   !empty($contact['name_suffix']);
        if ($hasName) {
            $lines[] = 'N:' .
                $this->escape($contact['name_last'] ?? '') . ';' .
                $this->escape($contact['name_first'] ?? '') . ';' .
                $this->escape($contact['name_middle'] ?? '') . ';' .
                $this->escape($contact['name_prefix'] ?? '') . ';' .
                $this->escape($contact['name_suffix'] ?? '');
        }

        // Nickname
        if (!empty($contact['nickname'])) {
            $lines[] = 'NICKNAME:' . $this->escape($contact['nickname']);
        }

        // Organization
        if (!empty($contact['organization']) || !empty($contact['department'])) {
            $org = $this->escape($contact['organization'] ?? '');
            if (!empty($contact['department'])) {
                $org .= ';' . $this->escape($contact['department']);
            }
            $lines[] = 'ORG:' . $org;
        }

        // Job title
        if (!empty($contact['job_title'])) {
            $lines[] = 'TITLE:' . $this->escape($contact['job_title']);
        }

        // Phone numbers
        foreach ($contact['phones'] ?? [] as $phone) {
            $type = $this->mapPhoneType($phone['phone_type']);
            $pref = !empty($phone['is_primary']) ? ';PREF=1' : '';
            $lines[] = "TEL;TYPE={$type}{$pref}:" . $phone['phone_number'];
        }

        // Email addresses
        foreach ($contact['emails'] ?? [] as $email) {
            $type = $this->mapEmailType($email['email_type']);
            $pref = !empty($email['is_primary']) ? ';PREF=1' : '';
            $lines[] = "EMAIL;TYPE={$type}{$pref}:" . $email['email_address'];
        }

        // Addresses
        foreach ($contact['addresses'] ?? [] as $address) {
            $type = $this->mapAddressType($address['address_type']);
            $pref = !empty($address['is_primary']) ? ';PREF=1' : '';
            // ADR format: PO Box;Extended;Street;City;Region;Postal;Country
            $lines[] = "ADR;TYPE={$type}{$pref}:;;" .
                $this->escape($address['street_line1'] ?? '') .
                (!empty($address['street_line2']) ? ',' . $this->escape($address['street_line2']) : '') . ';' .
                $this->escape($address['city'] ?? '') . ';' .
                $this->escape($address['state_province'] ?? '') . ';' .
                $this->escape($address['postal_code'] ?? '') . ';' .
                $this->escape($address['country'] ?? '');
        }

        // URLs
        foreach ($contact['urls'] ?? [] as $url) {
            $lines[] = 'URL:' . $url['url'];
        }

        // Dates (birthday, anniversary)
        foreach ($contact['dates'] ?? [] as $date) {
            if ($date['date_type'] === 'birthday') {
                $value = $this->formatVCardDate($date['date_value'], !empty($date['year_known']));
                $lines[] = 'BDAY:' . $value;
            } elseif ($date['date_type'] === 'anniversary') {
                $value = $this->formatVCardDate($date['date_value'], !empty($date['year_known']));
                $lines[] = 'ANNIVERSARY:' . $value;
            }
        }

        // Photo - embed as base64 data URI for iOS/CardDAV client compatibility
        if (!empty($contact['photo_url'])) {
            $photoData = $this->fetchAndEncodeImage($contact['photo_url']);
            if ($photoData !== null) {
                // vCard 4.0 format: PHOTO:data:image/jpeg;base64,<data>
                $lines[] = 'PHOTO:data:' . $photoData['mediatype'] . ';base64,' . $photoData['data'];
            }
        }

        // Social profiles
        foreach ($contact['social_profiles'] ?? [] as $profile) {
            if (!empty($profile['profile_url'])) {
                $platform = strtoupper($profile['platform'] ?? 'other');
                $lines[] = "X-SOCIALPROFILE;TYPE={$platform}:" . $profile['profile_url'];
            }
        }

        // Met info as custom properties
        if (!empty($contact['met_info'])) {
            $metInfo = $contact['met_info'];
            if (!empty($metInfo['met_date'])) {
                $lines[] = 'X-FREUNDEBUCH-MET-DATE:' . $metInfo['met_date'];
            }
            if (!empty($metInfo['met_location'])) {
                $lines[] = 'X-FREUNDEBUCH-MET-LOCATION:' . $this->escape($metInfo['met_location']);
            }
            if (!empty($metInfo['met_context'])) {
                $lines[] = 'X-FREUNDEBUCH-MET-CONTEXT:' . $this->escape($metInfo['met_context']);
            }
        }

        // Notes (interests, work_notes)
        if (!empty($contact['interests'])) {
            $lines[] = 'X-FREUNDEBUCH-INTERESTS:' . $this->escape($contact['interests']);
        }
        if (!empty($contact['work_notes'])) {
            $lines[] = 'NOTE:' . $this->escape($contact['work_notes']);
        }

        // Revision timestamp
        $updatedAt = new \DateTime($contact['updated_at']);
        $lines[] = 'REV:' . $updatedAt->format('Ymd\THis\Z');

        $lines[] = 'END:VCARD';

        return implode("\r\n", $lines);
    }

    /**
     * Parses a vCard string to contact data.
     *
     * @param string $vcard vCard 4.0 string
     * @param string|null $externalId Optional external ID to use
     * @return array Contact data
     */
    public function vcardToContact(string $vcard, ?string $externalId = null): array
    {
        $lines = $this->unfoldVCard($vcard);
        $contact = [
            'external_id' => $externalId,
            'display_name' => '',
            'phones' => [],
            'emails' => [],
            'addresses' => [],
            'urls' => [],
            'dates' => [],
            'social_profiles' => [],
        ];

        foreach ($lines as $line) {
            $parsed = $this->parseLine($line);
            if (!$parsed) {
                continue;
            }

            [$property, $params, $value] = $parsed;

            switch (strtoupper($property)) {
                case 'UID':
                    if (!$externalId) {
                        $contact['external_id'] = $value;
                    }
                    break;

                case 'FN':
                    $contact['display_name'] = $this->unescape($value);
                    break;

                case 'N':
                    $parts = explode(';', $value);
                    $contact['name_last'] = $this->unescape($parts[0] ?? '') ?: null;
                    $contact['name_first'] = $this->unescape($parts[1] ?? '') ?: null;
                    $contact['name_middle'] = $this->unescape($parts[2] ?? '') ?: null;
                    $contact['name_prefix'] = $this->unescape($parts[3] ?? '') ?: null;
                    $contact['name_suffix'] = $this->unescape($parts[4] ?? '') ?: null;
                    break;

                case 'NICKNAME':
                    $contact['nickname'] = $this->unescape($value);
                    break;

                case 'ORG':
                    $parts = explode(';', $value);
                    $contact['organization'] = $this->unescape($parts[0] ?? '') ?: null;
                    $contact['department'] = $this->unescape($parts[1] ?? '') ?: null;
                    break;

                case 'TITLE':
                    $contact['job_title'] = $this->unescape($value);
                    break;

                case 'TEL':
                    $contact['phones'][] = [
                        'phone_number' => $value,
                        'phone_type' => $this->parsePhoneType($params),
                        'is_primary' => $this->hasPref($params),
                    ];
                    break;

                case 'EMAIL':
                    $contact['emails'][] = [
                        'email_address' => $value,
                        'email_type' => $this->parseEmailType($params),
                        'is_primary' => $this->hasPref($params),
                    ];
                    break;

                case 'ADR':
                    $parts = explode(';', $value);
                    $contact['addresses'][] = [
                        'street_line1' => $this->unescape($parts[2] ?? '') ?: null,
                        'city' => $this->unescape($parts[3] ?? '') ?: null,
                        'state_province' => $this->unescape($parts[4] ?? '') ?: null,
                        'postal_code' => $this->unescape($parts[5] ?? '') ?: null,
                        'country' => $this->unescape($parts[6] ?? '') ?: null,
                        'address_type' => $this->parseAddressType($params),
                        'is_primary' => $this->hasPref($params),
                    ];
                    break;

                case 'URL':
                    $contact['urls'][] = [
                        'url' => $value,
                        'url_type' => 'other',
                    ];
                    break;

                case 'BDAY':
                    [$dateValue, $yearKnown] = $this->parseVCardDate($value);
                    $contact['dates'][] = [
                        'date_value' => $dateValue,
                        'year_known' => $yearKnown,
                        'date_type' => 'birthday',
                    ];
                    break;

                case 'ANNIVERSARY':
                    [$dateValue, $yearKnown] = $this->parseVCardDate($value);
                    $contact['dates'][] = [
                        'date_value' => $dateValue,
                        'year_known' => $yearKnown,
                        'date_type' => 'anniversary',
                    ];
                    break;

                case 'PHOTO':
                    $contact['photo_url'] = $value;
                    break;

                case 'X-SOCIALPROFILE':
                    $contact['social_profiles'][] = [
                        'platform' => $this->parseSocialPlatform($params),
                        'profile_url' => $value,
                    ];
                    break;

                case 'NOTE':
                    $contact['work_notes'] = $this->unescape($value);
                    break;

                case 'X-FREUNDEBUCH-INTERESTS':
                    $contact['interests'] = $this->unescape($value);
                    break;

                case 'X-FREUNDEBUCH-MET-DATE':
                    $contact['met_info'] = $contact['met_info'] ?? [];
                    $contact['met_info']['met_date'] = $value;
                    break;

                case 'X-FREUNDEBUCH-MET-LOCATION':
                    $contact['met_info'] = $contact['met_info'] ?? [];
                    $contact['met_info']['met_location'] = $this->unescape($value);
                    break;

                case 'X-FREUNDEBUCH-MET-CONTEXT':
                    $contact['met_info'] = $contact['met_info'] ?? [];
                    $contact['met_info']['met_context'] = $this->unescape($value);
                    break;
            }
        }

        return $contact;
    }

    /**
     * Gets a full contact by external ID with all sub-resources.
     */
    public function getContactByExternalId(int $userId, string $externalId): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT *
            FROM contacts.contacts
            WHERE user_id = :user_id
              AND external_id = :external_id
              AND deleted_at IS NULL
        ');
        $stmt->execute(['user_id' => $userId, 'external_id' => $externalId]);
        $contact = $stmt->fetch();

        if (!$contact) {
            return null;
        }

        // Load sub-resources
        $contact['phones'] = $this->loadPhones((int) $contact['id']);
        $contact['emails'] = $this->loadEmails((int) $contact['id']);
        $contact['addresses'] = $this->loadAddresses((int) $contact['id']);
        $contact['urls'] = $this->loadUrls((int) $contact['id']);
        $contact['dates'] = $this->loadDates((int) $contact['id']);
        $contact['social_profiles'] = $this->loadSocialProfiles((int) $contact['id']);
        $contact['met_info'] = $this->loadMetInfo((int) $contact['id']);

        return $contact;
    }

    // Helper methods for loading sub-resources

    private function loadPhones(int $contactId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM contacts.contact_phones
            WHERE contact_id = :contact_id
            ORDER BY is_primary DESC, created_at ASC
        ');
        $stmt->execute(['contact_id' => $contactId]);
        return $stmt->fetchAll();
    }

    private function loadEmails(int $contactId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM contacts.contact_emails
            WHERE contact_id = :contact_id
            ORDER BY is_primary DESC, created_at ASC
        ');
        $stmt->execute(['contact_id' => $contactId]);
        return $stmt->fetchAll();
    }

    private function loadAddresses(int $contactId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM contacts.contact_addresses
            WHERE contact_id = :contact_id
            ORDER BY is_primary DESC, created_at ASC
        ');
        $stmt->execute(['contact_id' => $contactId]);
        return $stmt->fetchAll();
    }

    private function loadUrls(int $contactId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM contacts.contact_urls
            WHERE contact_id = :contact_id
            ORDER BY created_at ASC
        ');
        $stmt->execute(['contact_id' => $contactId]);
        return $stmt->fetchAll();
    }

    private function loadDates(int $contactId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM contacts.contact_dates
            WHERE contact_id = :contact_id
            ORDER BY date_type ASC, created_at ASC
        ');
        $stmt->execute(['contact_id' => $contactId]);
        return $stmt->fetchAll();
    }

    private function loadSocialProfiles(int $contactId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM contacts.contact_social_profiles
            WHERE contact_id = :contact_id
            ORDER BY platform ASC, created_at ASC
        ');
        $stmt->execute(['contact_id' => $contactId]);
        return $stmt->fetchAll();
    }

    private function loadMetInfo(int $contactId): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM contacts.contact_met_info
            WHERE contact_id = :contact_id
        ');
        $stmt->execute(['contact_id' => $contactId]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Fetches an image from a URL and returns it as base64-encoded data.
     *
     * @param string $url The image URL to fetch
     * @return array{data: string, mediatype: string}|null Base64 data and media type, or null on failure
     */
    private function fetchAndEncodeImage(string $url): ?array
    {
        // Check cache first
        if (array_key_exists($url, $this->imageCache)) {
            return $this->imageCache[$url];
        }

        // Validate URL
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            $this->imageCache[$url] = null;
            return null;
        }

        // Only allow http and https schemes
        $scheme = parse_url($url, PHP_URL_SCHEME);
        if (!in_array($scheme, ['http', 'https'], true)) {
            $this->imageCache[$url] = null;
            return null;
        }

        $ch = curl_init();
        if ($ch === false) {
            $this->imageCache[$url] = null;
            return null;
        }

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_USERAGENT => 'Freundebuch-CardDAV/1.0',
            // Security: prevent SSRF to internal networks
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        ]);

        $imageData = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $error = curl_error($ch);
        curl_close($ch);

        // Check for errors
        if ($imageData === false || $httpCode !== 200 || empty($imageData)) {
            error_log(sprintf(
                '[PHOTO_FETCH] Failed to fetch image from %s: HTTP %d, error: %s',
                $url,
                $httpCode,
                $error
            ));
            $this->imageCache[$url] = null;
            return null;
        }

        // Determine media type from content-type header or magic bytes
        $mediaType = $this->detectImageMediaType($imageData, $contentType);
        if ($mediaType === null) {
            error_log(sprintf(
                '[PHOTO_FETCH] Invalid image type from %s: %s',
                $url,
                $contentType ?? 'unknown'
            ));
            $this->imageCache[$url] = null;
            return null;
        }

        $result = [
            'data' => base64_encode($imageData),
            'mediatype' => $mediaType,
        ];

        $this->imageCache[$url] = $result;
        return $result;
    }

    /**
     * Detects the media type of an image from its content and/or Content-Type header.
     *
     * @param string $data Raw image data
     * @param string|null $contentType Content-Type header value
     * @return string|null Media type (e.g., 'image/jpeg') or null if not a valid image
     */
    private function detectImageMediaType(string $data, ?string $contentType): ?string
    {
        // Check magic bytes first (more reliable than Content-Type)
        $magicBytes = substr($data, 0, 12);

        // JPEG: starts with FF D8 FF
        if (str_starts_with($magicBytes, "\xFF\xD8\xFF")) {
            return 'image/jpeg';
        }

        // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
        if (str_starts_with($magicBytes, "\x89PNG\r\n\x1A\n")) {
            return 'image/png';
        }

        // GIF: starts with GIF87a or GIF89a
        if (str_starts_with($magicBytes, 'GIF87a') || str_starts_with($magicBytes, 'GIF89a')) {
            return 'image/gif';
        }

        // WebP: starts with RIFF....WEBP
        if (str_starts_with($magicBytes, 'RIFF') && substr($data, 8, 4) === 'WEBP') {
            return 'image/webp';
        }

        // Fallback to Content-Type header if magic bytes don't match
        if ($contentType !== null) {
            // Extract media type from Content-Type (may include charset)
            $parts = explode(';', $contentType);
            $mediaType = trim($parts[0]);

            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (in_array($mediaType, $allowedTypes, true)) {
                return $mediaType;
            }
        }

        return null;
    }

    // vCard formatting helpers

    private function escape(string $value): string
    {
        return str_replace(
            ['\\', ',', ';', "\n"],
            ['\\\\', '\\,', '\\;', '\\n'],
            $value
        );
    }

    private function unescape(string $value): string
    {
        return str_replace(
            ['\\n', '\\,', '\\;', '\\\\'],
            ["\n", ',', ';', '\\'],
            $value
        );
    }

    private function unfoldVCard(string $vcard): array
    {
        // Unfold folded lines (lines starting with space/tab continue previous line)
        $vcard = preg_replace('/\r?\n[ \t]/', '', $vcard);
        return array_filter(explode("\n", str_replace("\r", '', $vcard)));
    }

    private function parseLine(string $line): ?array
    {
        // Match: PROPERTY;PARAM1=value;PARAM2=value:VALUE
        if (!preg_match('/^([A-Za-z0-9-]+)(;[^:]*)?:(.*)$/s', $line, $matches)) {
            return null;
        }

        $property = $matches[1];
        $params = [];

        if (!empty($matches[2])) {
            $paramStr = substr($matches[2], 1); // Remove leading ;
            preg_match_all('/([A-Za-z0-9-]+)=([^;]*)/', $paramStr, $paramMatches, PREG_SET_ORDER);
            foreach ($paramMatches as $match) {
                $params[strtoupper($match[1])] = $match[2];
            }
            // Handle TYPE without value (e.g., ;CELL;VOICE)
            preg_match_all('/;([A-Za-z]+)(?=;|$)/', ';' . $paramStr, $typeMatches);
            foreach ($typeMatches[1] as $type) {
                $params['TYPE'] = ($params['TYPE'] ?? '') . ',' . strtoupper($type);
            }
        }

        return [$property, $params, $matches[3]];
    }

    private function mapPhoneType(string $type): string
    {
        return match ($type) {
            'mobile' => 'cell',
            'home' => 'home',
            'work' => 'work',
            'fax' => 'fax',
            default => 'voice',
        };
    }

    private function parsePhoneType(array $params): string
    {
        $type = strtolower($params['TYPE'] ?? '');
        if (str_contains($type, 'cell') || str_contains($type, 'mobile')) {
            return 'mobile';
        }
        if (str_contains($type, 'home')) {
            return 'home';
        }
        if (str_contains($type, 'work')) {
            return 'work';
        }
        if (str_contains($type, 'fax')) {
            return 'fax';
        }
        return 'other';
    }

    private function mapEmailType(string $type): string
    {
        return match ($type) {
            'personal' => 'home',
            'work' => 'work',
            default => 'other',
        };
    }

    private function parseEmailType(array $params): string
    {
        $type = strtolower($params['TYPE'] ?? '');
        if (str_contains($type, 'home') || str_contains($type, 'personal')) {
            return 'personal';
        }
        if (str_contains($type, 'work')) {
            return 'work';
        }
        return 'other';
    }

    private function mapAddressType(string $type): string
    {
        return $type; // home, work, other map directly
    }

    private function parseAddressType(array $params): string
    {
        $type = strtolower($params['TYPE'] ?? '');
        if (str_contains($type, 'home')) {
            return 'home';
        }
        if (str_contains($type, 'work')) {
            return 'work';
        }
        return 'other';
    }

    private function hasPref(array $params): bool
    {
        return isset($params['PREF']) || str_contains(strtolower($params['TYPE'] ?? ''), 'pref');
    }

    private function formatVCardDate(string $date, bool $yearKnown): string
    {
        if ($yearKnown) {
            // YYYYMMDD format
            return str_replace('-', '', $date);
        }
        // --MMDD format for unknown year
        $parts = explode('-', $date);
        return '--' . ($parts[1] ?? '01') . ($parts[2] ?? '01');
    }

    private function parseVCardDate(string $value): array
    {
        if (str_starts_with($value, '--')) {
            // Unknown year: --MMDD
            $mm = substr($value, 2, 2);
            $dd = substr($value, 4, 2);
            return ['1900-' . $mm . '-' . $dd, false];
        }
        // Known year: YYYYMMDD or YYYY-MM-DD
        $clean = str_replace('-', '', $value);
        $yyyy = substr($clean, 0, 4);
        $mm = substr($clean, 4, 2);
        $dd = substr($clean, 6, 2);
        return [$yyyy . '-' . $mm . '-' . $dd, true];
    }

    private function parseSocialPlatform(array $params): string
    {
        $type = strtolower($params['TYPE'] ?? '');
        $platforms = ['linkedin', 'twitter', 'facebook', 'instagram', 'github'];
        foreach ($platforms as $platform) {
            if (str_contains($type, $platform)) {
                return $platform;
            }
        }
        return 'other';
    }

    /**
     * Converts a vCard string to a JSON-friendly array structure.
     *
     * This method preserves ALL vCard properties, including ones we don't
     * specifically handle, for debugging and feature discovery purposes.
     *
     * @param string $vcard The raw vCard string
     * @return array Complete vCard data as a JSON-serializable array
     */
    public function vcardToJson(string $vcard): array
    {
        $lines = $this->unfoldVCard($vcard);
        $properties = [];

        foreach ($lines as $line) {
            $parsed = $this->parseLine($line);
            if (!$parsed) {
                continue;
            }

            [$property, $params, $value] = $parsed;
            $propertyUpper = strtoupper($property);

            // Skip BEGIN/END markers
            if ($propertyUpper === 'BEGIN' || $propertyUpper === 'END') {
                continue;
            }

            $entry = [
                'value' => $value,
            ];

            // Include parameters if present
            if (!empty($params)) {
                $entry['params'] = $params;
            }

            // Group properties that can appear multiple times
            if (isset($properties[$propertyUpper])) {
                // Convert to array if not already
                if (!isset($properties[$propertyUpper][0])) {
                    $properties[$propertyUpper] = [$properties[$propertyUpper]];
                }
                $properties[$propertyUpper][] = $entry;
            } else {
                $properties[$propertyUpper] = $entry;
            }
        }

        return [
            'raw' => $vcard,
            'properties' => $properties,
            'parsed_at' => date('c'),
        ];
    }
}
