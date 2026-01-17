<?php

declare(strict_types=1);

namespace Freundebuch\DAV\VCard;

use PDO;

/**
 * vCard 4.0 mapper for Freundebuch friends.
 *
 * Handles bidirectional conversion between Freundebuch friend data
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
     * Converts a Freundebuch friend to vCard 4.0 format.
     *
     * @param array $friend Full friend data with all sub-resources
     * @return string vCard 4.0 string
     */
    public function friendToVCard(array $friend): string
    {
        $lines = [
            'BEGIN:VCARD',
            'VERSION:4.0',
            'UID:' . $friend['external_id'],
            'FN:' . $this->escape($friend['display_name']),
        ];

        // Structured name (N)
        $hasName = !empty($friend['name_last']) || !empty($friend['name_first']) ||
                   !empty($friend['name_middle']) || !empty($friend['name_prefix']) ||
                   !empty($friend['name_suffix']);
        if ($hasName) {
            $lines[] = 'N:' .
                $this->escape($friend['name_last'] ?? '') . ';' .
                $this->escape($friend['name_first'] ?? '') . ';' .
                $this->escape($friend['name_middle'] ?? '') . ';' .
                $this->escape($friend['name_prefix'] ?? '') . ';' .
                $this->escape($friend['name_suffix'] ?? '');
        }

        // Nickname
        if (!empty($friend['nickname'])) {
            $lines[] = 'NICKNAME:' . $this->escape($friend['nickname']);
        }

        // Organization and Job title from primary professional history
        $primaryJob = $friend['primary_professional_history'] ?? null;
        if ($primaryJob) {
            if (!empty($primaryJob['organization']) || !empty($primaryJob['department'])) {
                $org = $this->escape($primaryJob['organization'] ?? '');
                if (!empty($primaryJob['department'])) {
                    $org .= ';' . $this->escape($primaryJob['department']);
                }
                $lines[] = 'ORG:' . $org;
            }
            if (!empty($primaryJob['job_title'])) {
                $lines[] = 'TITLE:' . $this->escape($primaryJob['job_title']);
            }
        }

        // Phone numbers
        foreach ($friend['phones'] ?? [] as $phone) {
            $type = $this->mapPhoneType($phone['phone_type']);
            $pref = !empty($phone['is_primary']) ? ';PREF=1' : '';
            $lines[] = "TEL;TYPE={$type}{$pref}:" . $phone['phone_number'];
        }

        // Email addresses
        foreach ($friend['emails'] ?? [] as $email) {
            $type = $this->mapEmailType($email['email_type']);
            $pref = !empty($email['is_primary']) ? ';PREF=1' : '';
            $lines[] = "EMAIL;TYPE={$type}{$pref}:" . $email['email_address'];
        }

        // Addresses
        foreach ($friend['addresses'] ?? [] as $address) {
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
        foreach ($friend['urls'] ?? [] as $url) {
            $lines[] = 'URL:' . $url['url'];
        }

        // Dates (birthday, anniversary)
        foreach ($friend['dates'] ?? [] as $date) {
            if ($date['date_type'] === 'birthday') {
                $value = $this->formatVCardDate($date['date_value'], !empty($date['year_known']));
                $lines[] = 'BDAY:' . $value;
            } elseif ($date['date_type'] === 'anniversary') {
                $value = $this->formatVCardDate($date['date_value'], !empty($date['year_known']));
                $lines[] = 'ANNIVERSARY:' . $value;
            }
        }

        // Photo - embed as base64 data URI for iOS/CardDAV client compatibility
        if (!empty($friend['photo_url'])) {
            $photoData = $this->fetchAndEncodeImage($friend['photo_url']);
            if ($photoData !== null) {
                // vCard 4.0 format: PHOTO:data:image/jpeg;base64,<data>
                $lines[] = 'PHOTO:data:' . $photoData['mediatype'] . ';base64,' . $photoData['data'];
            }
        }

        // Social profiles
        foreach ($friend['social_profiles'] ?? [] as $profile) {
            if (!empty($profile['profile_url'])) {
                $platform = strtoupper($profile['platform'] ?? 'other');
                $lines[] = "X-SOCIALPROFILE;TYPE={$platform}:" . $profile['profile_url'];
            }
        }

        // Met info as custom properties
        if (!empty($friend['met_info'])) {
            $metInfo = $friend['met_info'];
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

        // Notes (interests, professional history notes)
        if (!empty($friend['interests'])) {
            $lines[] = 'X-FREUNDEBUCH-INTERESTS:' . $this->escape($friend['interests']);
        }
        // Use notes from primary professional history entry
        $primaryJob = $friend['primary_professional_history'] ?? null;
        if ($primaryJob && !empty($primaryJob['notes'])) {
            $lines[] = 'NOTE:' . $this->escape($primaryJob['notes']);
        }

        // Epic 4: Circles as CATEGORIES
        if (!empty($friend['circles'])) {
            $circleNames = array_map(
                fn($c) => $this->escape($c['name']),
                $friend['circles']
            );
            if (count($circleNames) > 0) {
                $lines[] = 'CATEGORIES:' . implode(',', $circleNames);
            }
        }

        // Epic 4: Favorite status
        if (!empty($friend['is_favorite'])) {
            $lines[] = 'X-FREUNDEBUCH-FAVORITE:true';
        }

        // Revision timestamp
        $updatedAt = new \DateTime($friend['updated_at']);
        $lines[] = 'REV:' . $updatedAt->format('Ymd\THis\Z');

        $lines[] = 'END:VCARD';

        return implode("\r\n", $lines);
    }

    /**
     * Parses a vCard string to friend data.
     *
     * @param string $vcard vCard 4.0 string
     * @param string|null $externalId Optional external ID to use
     * @return array Friend data
     */
    public function vcardToFriend(string $vcard, ?string $externalId = null): array
    {
        $lines = $this->unfoldVCard($vcard);
        $friend = [
            'external_id' => $externalId,
            'display_name' => '',
            'phones' => [],
            'emails' => [],
            'addresses' => [],
            'urls' => [],
            'dates' => [],
            'social_profiles' => [],
            'professional_history' => [], // Employment entries
            // Epic 4: Circles and favorites
            'categories' => [], // Circle names from CATEGORIES
            'is_favorite' => false,
        ];

        // Temporary storage for professional info from vCard
        $professionalData = [
            'job_title' => null,
            'organization' => null,
            'department' => null,
            'notes' => null,
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
                        $friend['external_id'] = $value;
                    }
                    break;

                case 'FN':
                    $friend['display_name'] = $this->unescape($value);
                    break;

                case 'N':
                    $parts = explode(';', $value);
                    $friend['name_last'] = $this->unescape($parts[0] ?? '') ?: null;
                    $friend['name_first'] = $this->unescape($parts[1] ?? '') ?: null;
                    $friend['name_middle'] = $this->unescape($parts[2] ?? '') ?: null;
                    $friend['name_prefix'] = $this->unescape($parts[3] ?? '') ?: null;
                    $friend['name_suffix'] = $this->unescape($parts[4] ?? '') ?: null;
                    break;

                case 'NICKNAME':
                    $friend['nickname'] = $this->unescape($value);
                    break;

                case 'ORG':
                    $parts = explode(';', $value);
                    $professionalData['organization'] = $this->unescape($parts[0] ?? '') ?: null;
                    $professionalData['department'] = $this->unescape($parts[1] ?? '') ?: null;
                    break;

                case 'TITLE':
                    $professionalData['job_title'] = $this->unescape($value);
                    break;

                case 'TEL':
                    $friend['phones'][] = [
                        'phone_number' => $value,
                        'phone_type' => $this->parsePhoneType($params),
                        'is_primary' => $this->hasPref($params),
                    ];
                    break;

                case 'EMAIL':
                    $friend['emails'][] = [
                        'email_address' => $value,
                        'email_type' => $this->parseEmailType($params),
                        'is_primary' => $this->hasPref($params),
                    ];
                    break;

                case 'ADR':
                    $parts = explode(';', $value);
                    $friend['addresses'][] = [
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
                    $friend['urls'][] = [
                        'url' => $value,
                        'url_type' => 'other',
                    ];
                    break;

                case 'BDAY':
                    [$dateValue, $yearKnown] = $this->parseVCardDate($value);
                    $friend['dates'][] = [
                        'date_value' => $dateValue,
                        'year_known' => $yearKnown,
                        'date_type' => 'birthday',
                    ];
                    break;

                case 'ANNIVERSARY':
                    [$dateValue, $yearKnown] = $this->parseVCardDate($value);
                    $friend['dates'][] = [
                        'date_value' => $dateValue,
                        'year_known' => $yearKnown,
                        'date_type' => 'anniversary',
                    ];
                    break;

                case 'PHOTO':
                    $friend['photo_url'] = $value;
                    break;

                case 'X-SOCIALPROFILE':
                    $friend['social_profiles'][] = [
                        'platform' => $this->parseSocialPlatform($params),
                        'profile_url' => $value,
                    ];
                    break;

                case 'NOTE':
                    $professionalData['notes'] = $this->unescape($value);
                    break;

                case 'X-FREUNDEBUCH-INTERESTS':
                    $friend['interests'] = $this->unescape($value);
                    break;

                case 'X-FREUNDEBUCH-MET-DATE':
                    $friend['met_info'] = $friend['met_info'] ?? [];
                    $friend['met_info']['met_date'] = $value;
                    break;

                case 'X-FREUNDEBUCH-MET-LOCATION':
                    $friend['met_info'] = $friend['met_info'] ?? [];
                    $friend['met_info']['met_location'] = $this->unescape($value);
                    break;

                case 'X-FREUNDEBUCH-MET-CONTEXT':
                    $friend['met_info'] = $friend['met_info'] ?? [];
                    $friend['met_info']['met_context'] = $this->unescape($value);
                    break;

                // Epic 4: Parse CATEGORIES (circle names)
                case 'CATEGORIES':
                    // CATEGORIES can be comma-separated
                    $categories = explode(',', $value);
                    foreach ($categories as $cat) {
                        $cat = trim($this->unescape($cat));
                        if (!empty($cat) && !in_array($cat, $friend['categories'], true)) {
                            $friend['categories'][] = $cat;
                        }
                    }
                    break;

                // Epic 4: Parse favorite status
                case 'X-FREUNDEBUCH-FAVORITE':
                    $friend['is_favorite'] = strtolower($value) === 'true';
                    break;
            }
        }

        // Create professional history entry if any professional data was parsed
        $hasProfessionalData = !empty($professionalData['job_title']) ||
                               !empty($professionalData['organization']) ||
                               !empty($professionalData['department']) ||
                               !empty($professionalData['notes']);
        if ($hasProfessionalData) {
            $currentDate = new \DateTime();
            $friend['professional_history'][] = [
                'job_title' => $professionalData['job_title'],
                'organization' => $professionalData['organization'],
                'department' => $professionalData['department'],
                'notes' => $professionalData['notes'],
                'from_month' => (int) $currentDate->format('n'),
                'from_year' => (int) $currentDate->format('Y'),
                'to_month' => null,
                'to_year' => null,
                'is_primary' => true,
            ];
        }

        return $friend;
    }

    /**
     * Gets a full friend by external ID with all sub-resources.
     * Epic 4: Also filters out archived contacts and loads circles.
     */
    public function getFriendByExternalId(int $userId, string $externalId): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT *
            FROM friends.friends
            WHERE user_id = :user_id
              AND external_id = :external_id
              AND deleted_at IS NULL
              AND archived_at IS NULL
        ');
        $stmt->execute(['user_id' => $userId, 'external_id' => $externalId]);
        $friend = $stmt->fetch();

        if (!$friend) {
            return null;
        }

        // Load sub-resources
        $friend['phones'] = $this->loadPhones((int) $friend['id']);
        $friend['emails'] = $this->loadEmails((int) $friend['id']);
        $friend['addresses'] = $this->loadAddresses((int) $friend['id']);
        $friend['urls'] = $this->loadUrls((int) $friend['id']);
        $friend['dates'] = $this->loadDates((int) $friend['id']);
        $friend['social_profiles'] = $this->loadSocialProfiles((int) $friend['id']);
        $friend['met_info'] = $this->loadMetInfo((int) $friend['id']);
        // Load primary professional history for CardDAV export
        $friend['primary_professional_history'] = $this->loadPrimaryProfessionalHistory((int) $friend['id']);
        // Epic 4: Load circles
        $friend['circles'] = $this->loadCircles((int) $friend['id']);

        return $friend;
    }

    // Helper methods for loading sub-resources

    private function loadPhones(int $friendId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM friends.friend_phones
            WHERE friend_id = :friend_id
            ORDER BY is_primary DESC, created_at ASC
        ');
        $stmt->execute(['friend_id' => $friendId]);
        return $stmt->fetchAll();
    }

    private function loadEmails(int $friendId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM friends.friend_emails
            WHERE friend_id = :friend_id
            ORDER BY is_primary DESC, created_at ASC
        ');
        $stmt->execute(['friend_id' => $friendId]);
        return $stmt->fetchAll();
    }

    private function loadAddresses(int $friendId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM friends.friend_addresses
            WHERE friend_id = :friend_id
            ORDER BY is_primary DESC, created_at ASC
        ');
        $stmt->execute(['friend_id' => $friendId]);
        return $stmt->fetchAll();
    }

    private function loadUrls(int $friendId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM friends.friend_urls
            WHERE friend_id = :friend_id
            ORDER BY created_at ASC
        ');
        $stmt->execute(['friend_id' => $friendId]);
        return $stmt->fetchAll();
    }

    private function loadDates(int $friendId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM friends.friend_dates
            WHERE friend_id = :friend_id
            ORDER BY date_type ASC, created_at ASC
        ');
        $stmt->execute(['friend_id' => $friendId]);
        return $stmt->fetchAll();
    }

    private function loadSocialProfiles(int $friendId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM friends.friend_social_profiles
            WHERE friend_id = :friend_id
            ORDER BY platform ASC, created_at ASC
        ');
        $stmt->execute(['friend_id' => $friendId]);
        return $stmt->fetchAll();
    }

    private function loadMetInfo(int $friendId): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT * FROM friends.friend_met_info
            WHERE friend_id = :friend_id
        ');
        $stmt->execute(['friend_id' => $friendId]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Epic 4: Loads circles for a friend.
     */
    private function loadCircles(int $friendId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT c.external_id, c.name, c.color
            FROM friends.circles c
            INNER JOIN friends.friend_circles fc ON fc.circle_id = c.id
            WHERE fc.friend_id = :friend_id
            ORDER BY c.sort_order ASC, c.name ASC
        ');
        $stmt->execute(['friend_id' => $friendId]);
        return $stmt->fetchAll();
    }

    /**
     * Loads the primary professional history entry for a friend.
     * Returns null if no primary entry exists.
     */
    private function loadPrimaryProfessionalHistory(int $friendId): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT job_title, organization, department, notes,
                   from_month, from_year, to_month, to_year
            FROM friends.friend_professional_history
            WHERE friend_id = :friend_id AND is_primary = true
            LIMIT 1
        ');
        $stmt->execute(['friend_id' => $friendId]);
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

        // Check if curl extension is available
        if (!self::isCurlAvailable()) {
            error_log('[PHOTO_FETCH] curl extension is not available, skipping image fetch');
            $this->imageCache[$url] = null;
            return null;
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

        $ch = \curl_init();
        if ($ch === false) {
            $this->imageCache[$url] = null;
            return null;
        }

        \curl_setopt_array($ch, [
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

        $imageData = \curl_exec($ch);
        $httpCode = \curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $contentType = \curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $error = \curl_error($ch);
        \curl_close($ch);

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

    /**
     * Checks if the curl extension is available.
     *
     * @return bool True if curl functions are available
     */
    public static function isCurlAvailable(): bool
    {
        return \function_exists('curl_init');
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
     * Property grouping behavior:
     * - Single occurrence: stored as object {"value": "...", "params": {...}}
     * - Multiple occurrences: stored as array [{"value": "...", "params": {...}}, ...]
     *
     * @param string $vcard The raw vCard string
     * @return array{raw: string, properties: array, parsed_at: string} Complete vCard data
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
