<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Tests\VCard;

use Freundebuch\DAV\VCard\Mapper;
use PDO;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class MapperTest extends TestCase
{
    private Mapper $mapper;

    protected function setUp(): void
    {
        // Create a mock PDO - not used for conversion tests
        $pdo = $this->createMock(PDO::class);
        $this->mapper = new Mapper($pdo);
    }

    #[Test]
    public function friendToVCardIncludesRequiredFields(): void
    {
        $friend = [
            'external_id' => '550e8400-e29b-41d4-a716-446655440000',
            'display_name' => 'John Doe',
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->friendToVCard($friend);

        $this->assertStringContainsString('BEGIN:VCARD', $vcard);
        $this->assertStringContainsString('VERSION:4.0', $vcard);
        $this->assertStringContainsString('UID:550e8400-e29b-41d4-a716-446655440000', $vcard);
        $this->assertStringContainsString('FN:John Doe', $vcard);
        $this->assertStringContainsString('END:VCARD', $vcard);
    }

    #[Test]
    public function friendToVCardIncludesStructuredName(): void
    {
        $friend = [
            'external_id' => 'test-uuid',
            'display_name' => 'Dr. John Michael Doe Jr.',
            'name_prefix' => 'Dr.',
            'name_first' => 'John',
            'name_middle' => 'Michael',
            'name_last' => 'Doe',
            'name_suffix' => 'Jr.',
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->friendToVCard($friend);

        $this->assertStringContainsString('N:Doe;John;Michael;Dr.;Jr.', $vcard);
    }

    #[Test]
    public function friendToVCardIncludesNickname(): void
    {
        $friend = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'nickname' => 'Johnny',
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->friendToVCard($friend);

        $this->assertStringContainsString('NICKNAME:Johnny', $vcard);
    }

    #[Test]
    public function friendToVCardIncludesOrganization(): void
    {
        $friend = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'organization' => 'Acme Corp',
            'department' => 'Engineering',
            'job_title' => 'Senior Developer',
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->friendToVCard($friend);

        $this->assertStringContainsString('ORG:Acme Corp;Engineering', $vcard);
        $this->assertStringContainsString('TITLE:Senior Developer', $vcard);
    }

    #[Test]
    public function friendToVCardIncludesPhones(): void
    {
        $friend = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'phones' => [
                ['phone_number' => '+1-555-123-4567', 'phone_type' => 'mobile', 'is_primary' => true],
                ['phone_number' => '+1-555-987-6543', 'phone_type' => 'work', 'is_primary' => false],
            ],
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->friendToVCard($friend);

        $this->assertStringContainsString('TEL;TYPE=cell;PREF=1:+1-555-123-4567', $vcard);
        $this->assertStringContainsString('TEL;TYPE=work:+1-555-987-6543', $vcard);
    }

    #[Test]
    public function friendToVCardIncludesEmails(): void
    {
        $friend = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'emails' => [
                ['email_address' => 'john@example.com', 'email_type' => 'personal', 'is_primary' => true],
                ['email_address' => 'john.doe@work.com', 'email_type' => 'work', 'is_primary' => false],
            ],
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->friendToVCard($friend);

        $this->assertStringContainsString('EMAIL;TYPE=home;PREF=1:john@example.com', $vcard);
        $this->assertStringContainsString('EMAIL;TYPE=work:john.doe@work.com', $vcard);
    }

    #[Test]
    public function friendToVCardIncludesAddresses(): void
    {
        $friend = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'addresses' => [
                [
                    'street_line1' => '123 Main St',
                    'street_line2' => 'Apt 4B',
                    'city' => 'New York',
                    'state_province' => 'NY',
                    'postal_code' => '10001',
                    'country' => 'USA',
                    'address_type' => 'home',
                    'is_primary' => true,
                ],
            ],
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->friendToVCard($friend);

        $this->assertStringContainsString('ADR;TYPE=home;PREF=1:;;123 Main St,Apt 4B;New York;NY;10001;USA', $vcard);
    }

    #[Test]
    public function friendToVCardIncludesBirthday(): void
    {
        $friend = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'dates' => [
                ['date_value' => '1990-05-15', 'date_type' => 'birthday', 'year_known' => true],
            ],
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->friendToVCard($friend);

        $this->assertStringContainsString('BDAY:19900515', $vcard);
    }

    #[Test]
    public function friendToVCardIncludesBirthdayWithoutYear(): void
    {
        $friend = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'dates' => [
                ['date_value' => '1900-05-15', 'date_type' => 'birthday', 'year_known' => false],
            ],
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->friendToVCard($friend);

        $this->assertStringContainsString('BDAY:--0515', $vcard);
    }

    #[Test]
    public function friendToVCardIncludesMetInfo(): void
    {
        $friend = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'met_info' => [
                'met_date' => '2023-06-15',
                'met_location' => 'Tech Conference',
                'met_context' => 'Met at the keynote session',
            ],
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->friendToVCard($friend);

        $this->assertStringContainsString('X-FREUNDEBUCH-MET-DATE:2023-06-15', $vcard);
        $this->assertStringContainsString('X-FREUNDEBUCH-MET-LOCATION:Tech Conference', $vcard);
        $this->assertStringContainsString('X-FREUNDEBUCH-MET-CONTEXT:Met at the keynote session', $vcard);
    }

    #[Test]
    public function friendToVCardEscapesSpecialCharacters(): void
    {
        $friend = [
            'external_id' => 'test-uuid',
            'display_name' => 'John, "The Dev"; Doe',
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->friendToVCard($friend);

        // Commas and semicolons should be escaped
        $this->assertStringContainsString('FN:John\\, "The Dev"\\; Doe', $vcard);
    }

    #[Test]
    public function vcardToFriendParsesBasicFields(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid-123
FN:Jane Smith
N:Smith;Jane;Marie;Ms.;PhD
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertEquals('test-uuid-123', $friend['external_id']);
        $this->assertEquals('Jane Smith', $friend['display_name']);
        $this->assertEquals('Smith', $friend['name_last']);
        $this->assertEquals('Jane', $friend['name_first']);
        $this->assertEquals('Marie', $friend['name_middle']);
        $this->assertEquals('Ms.', $friend['name_prefix']);
        $this->assertEquals('PhD', $friend['name_suffix']);
    }

    #[Test]
    public function vcardToFriendParsesNickname(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
NICKNAME:Janie
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertEquals('Janie', $friend['nickname']);
    }

    #[Test]
    public function vcardToFriendParsesOrganization(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
ORG:Tech Corp;Engineering
TITLE:Lead Developer
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertEquals('Tech Corp', $friend['organization']);
        $this->assertEquals('Engineering', $friend['department']);
        $this->assertEquals('Lead Developer', $friend['job_title']);
    }

    #[Test]
    public function vcardToFriendParsesPhones(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
TEL;TYPE=cell;PREF=1:+1-555-123-4567
TEL;TYPE=work:+1-555-987-6543
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertCount(2, $friend['phones']);
        $this->assertEquals('+1-555-123-4567', $friend['phones'][0]['phone_number']);
        $this->assertEquals('mobile', $friend['phones'][0]['phone_type']);
        $this->assertTrue($friend['phones'][0]['is_primary']);
        $this->assertEquals('+1-555-987-6543', $friend['phones'][1]['phone_number']);
        $this->assertEquals('work', $friend['phones'][1]['phone_type']);
        $this->assertFalse($friend['phones'][1]['is_primary']);
    }

    #[Test]
    public function vcardToFriendParsesEmails(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
EMAIL;TYPE=home;PREF=1:jane@example.com
EMAIL;TYPE=work:jane@work.com
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertCount(2, $friend['emails']);
        $this->assertEquals('jane@example.com', $friend['emails'][0]['email_address']);
        $this->assertEquals('personal', $friend['emails'][0]['email_type']);
        $this->assertTrue($friend['emails'][0]['is_primary']);
    }

    #[Test]
    public function vcardToFriendParsesAddresses(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
ADR;TYPE=home;PREF=1:;;123 Main St;Boston;MA;02101;USA
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertCount(1, $friend['addresses']);
        $this->assertEquals('123 Main St', $friend['addresses'][0]['street_line1']);
        $this->assertEquals('Boston', $friend['addresses'][0]['city']);
        $this->assertEquals('MA', $friend['addresses'][0]['state_province']);
        $this->assertEquals('02101', $friend['addresses'][0]['postal_code']);
        $this->assertEquals('USA', $friend['addresses'][0]['country']);
        $this->assertEquals('home', $friend['addresses'][0]['address_type']);
    }

    #[Test]
    public function vcardToFriendParsesBirthdayWithYear(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
BDAY:19850315
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertCount(1, $friend['dates']);
        $this->assertEquals('1985-03-15', $friend['dates'][0]['date_value']);
        $this->assertEquals('birthday', $friend['dates'][0]['date_type']);
        $this->assertTrue($friend['dates'][0]['year_known']);
    }

    #[Test]
    public function vcardToFriendParsesBirthdayWithoutYear(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
BDAY:--0315
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertCount(1, $friend['dates']);
        $this->assertEquals('1900-03-15', $friend['dates'][0]['date_value']);
        $this->assertEquals('birthday', $friend['dates'][0]['date_type']);
        $this->assertFalse($friend['dates'][0]['year_known']);
    }

    #[Test]
    public function vcardToFriendParsesAnniversary(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
ANNIVERSARY:20100612
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertCount(1, $friend['dates']);
        $this->assertEquals('2010-06-12', $friend['dates'][0]['date_value']);
        $this->assertEquals('anniversary', $friend['dates'][0]['date_type']);
        $this->assertTrue($friend['dates'][0]['year_known']);
    }

    #[Test]
    public function vcardToFriendParsesMetInfo(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
X-FREUNDEBUCH-MET-DATE:2023-06-15
X-FREUNDEBUCH-MET-LOCATION:Tech Conference
X-FREUNDEBUCH-MET-CONTEXT:Met at the keynote session
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertArrayHasKey('met_info', $friend);
        $this->assertEquals('2023-06-15', $friend['met_info']['met_date']);
        $this->assertEquals('Tech Conference', $friend['met_info']['met_location']);
        $this->assertEquals('Met at the keynote session', $friend['met_info']['met_context']);
    }

    #[Test]
    public function vcardToFriendParsesSocialProfiles(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
X-SOCIALPROFILE;TYPE=LINKEDIN:https://linkedin.com/in/janesmith
X-SOCIALPROFILE;TYPE=GITHUB:https://github.com/janesmith
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertCount(2, $friend['social_profiles']);
        $this->assertEquals('linkedin', $friend['social_profiles'][0]['platform']);
        $this->assertEquals('https://linkedin.com/in/janesmith', $friend['social_profiles'][0]['profile_url']);
        $this->assertEquals('github', $friend['social_profiles'][1]['platform']);
    }

    #[Test]
    public function vcardToFriendUnescapesSpecialCharacters(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:John\, "The Dev"\; Doe
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertEquals('John, "The Dev"; Doe', $friend['display_name']);
    }

    #[Test]
    public function vcardToFriendUsesProvidedExternalId(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:original-uid
FN:Jane Smith
END:VCARD
VCARD;

        $friend = $this->mapper->vcardToFriend($vcard, 'override-uuid');

        $this->assertEquals('override-uuid', $friend['external_id']);
    }

    #[Test]
    public function vcardToFriendHandlesFoldedLines(): void
    {
        // vCard folded lines continue with a space or tab
        $vcard = "BEGIN:VCARD\r\n" .
                 "VERSION:4.0\r\n" .
                 "UID:test-uuid\r\n" .
                 "FN:This is a very long name that might get\r\n" .
                 "  folded across multiple lines\r\n" .
                 "END:VCARD";

        $friend = $this->mapper->vcardToFriend($vcard);

        $this->assertEquals('This is a very long name that might get folded across multiple lines', $friend['display_name']);
    }

    #[Test]
    public function roundTripPreservesContactData(): void
    {
        $originalFriend = [
            'external_id' => 'roundtrip-test-uuid',
            'display_name' => 'Round Trip Test',
            'name_first' => 'Round',
            'name_last' => 'Trip',
            'nickname' => 'RT',
            'organization' => 'Test Corp',
            'department' => 'QA',
            'job_title' => 'Tester',
            'phones' => [
                ['phone_number' => '+1-555-111-2222', 'phone_type' => 'mobile', 'is_primary' => true],
            ],
            'emails' => [
                ['email_address' => 'rt@test.com', 'email_type' => 'work', 'is_primary' => true],
            ],
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->friendToVCard($originalFriend);
        $parsed = $this->mapper->vcardToFriend($vcard);

        $this->assertEquals($originalFriend['external_id'], $parsed['external_id']);
        $this->assertEquals($originalFriend['display_name'], $parsed['display_name']);
        $this->assertEquals($originalFriend['name_first'], $parsed['name_first']);
        $this->assertEquals($originalFriend['name_last'], $parsed['name_last']);
        $this->assertEquals($originalFriend['nickname'], $parsed['nickname']);
        $this->assertEquals($originalFriend['organization'], $parsed['organization']);
        $this->assertEquals($originalFriend['department'], $parsed['department']);
        $this->assertEquals($originalFriend['job_title'], $parsed['job_title']);
        $this->assertCount(1, $parsed['phones']);
        $this->assertEquals($originalFriend['phones'][0]['phone_number'], $parsed['phones'][0]['phone_number']);
        $this->assertCount(1, $parsed['emails']);
        $this->assertEquals($originalFriend['emails'][0]['email_address'], $parsed['emails'][0]['email_address']);
    }

    #[Test]
    public function vcardToJsonParsesSimpleVCard(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid-123
FN:Jane Smith
END:VCARD
VCARD;

        $json = $this->mapper->vcardToJson($vcard);

        $this->assertArrayHasKey('raw', $json);
        $this->assertArrayHasKey('properties', $json);
        $this->assertArrayHasKey('parsed_at', $json);
        $this->assertEquals($vcard, $json['raw']);
        $this->assertEquals('4.0', $json['properties']['VERSION']['value']);
        $this->assertEquals('test-uuid-123', $json['properties']['UID']['value']);
        $this->assertEquals('Jane Smith', $json['properties']['FN']['value']);
    }

    #[Test]
    public function vcardToJsonGroupsMultiplePropertiesOfSameType(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
TEL;TYPE=cell:+1-555-111-1111
TEL;TYPE=work:+1-555-222-2222
TEL;TYPE=home:+1-555-333-3333
END:VCARD
VCARD;

        $json = $this->mapper->vcardToJson($vcard);

        // Multiple TEL properties should be grouped into an array
        $this->assertIsArray($json['properties']['TEL']);
        $this->assertCount(3, $json['properties']['TEL']);
        $this->assertEquals('+1-555-111-1111', $json['properties']['TEL'][0]['value']);
        $this->assertEquals('+1-555-222-2222', $json['properties']['TEL'][1]['value']);
        $this->assertEquals('+1-555-333-3333', $json['properties']['TEL'][2]['value']);
    }

    #[Test]
    public function vcardToJsonPreservesPropertyParameters(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
TEL;TYPE=cell;PREF=1:+1-555-123-4567
EMAIL;TYPE=work:jane@work.com
END:VCARD
VCARD;

        $json = $this->mapper->vcardToJson($vcard);

        // TEL should have TYPE and PREF params
        $this->assertArrayHasKey('params', $json['properties']['TEL']);
        $this->assertEquals('cell', $json['properties']['TEL']['params']['TYPE']);
        $this->assertEquals('1', $json['properties']['TEL']['params']['PREF']);

        // EMAIL should have TYPE param
        $this->assertArrayHasKey('params', $json['properties']['EMAIL']);
        $this->assertEquals('work', $json['properties']['EMAIL']['params']['TYPE']);
    }

    #[Test]
    public function vcardToJsonPreservesRawVCard(): void
    {
        $vcard = "BEGIN:VCARD\r\nVERSION:4.0\r\nUID:test\r\nFN:Test\r\nEND:VCARD";

        $json = $this->mapper->vcardToJson($vcard);

        // The raw vCard should be preserved exactly as provided
        $this->assertEquals($vcard, $json['raw']);
    }

    #[Test]
    public function vcardToJsonPreservesUnknownProperties(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
X-CUSTOM-PROPERTY:Custom Value
X-ANOTHER-PROP;TYPE=special:Another Value
END:VCARD
VCARD;

        $json = $this->mapper->vcardToJson($vcard);

        // Unknown X- properties should be preserved
        $this->assertArrayHasKey('X-CUSTOM-PROPERTY', $json['properties']);
        $this->assertEquals('Custom Value', $json['properties']['X-CUSTOM-PROPERTY']['value']);
        $this->assertArrayHasKey('X-ANOTHER-PROP', $json['properties']);
        $this->assertEquals('Another Value', $json['properties']['X-ANOTHER-PROP']['value']);
        $this->assertEquals('special', $json['properties']['X-ANOTHER-PROP']['params']['TYPE']);
    }

    #[Test]
    public function vcardToJsonExcludesBeginEndMarkers(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
END:VCARD
VCARD;

        $json = $this->mapper->vcardToJson($vcard);

        // BEGIN and END should not appear in properties
        $this->assertArrayNotHasKey('BEGIN', $json['properties']);
        $this->assertArrayNotHasKey('END', $json['properties']);
    }

    #[Test]
    public function vcardToJsonIncludesParsedAtTimestamp(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
END:VCARD
VCARD;

        $before = date('c');
        $json = $this->mapper->vcardToJson($vcard);
        $after = date('c');

        // parsed_at should be a valid ISO 8601 timestamp
        $this->assertArrayHasKey('parsed_at', $json);
        $parsedAt = strtotime($json['parsed_at']);
        $this->assertGreaterThanOrEqual(strtotime($before), $parsedAt);
        $this->assertLessThanOrEqual(strtotime($after), $parsedAt);
    }
}
