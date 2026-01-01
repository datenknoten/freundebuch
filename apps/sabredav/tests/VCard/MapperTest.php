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
    public function contactToVCardIncludesRequiredFields(): void
    {
        $contact = [
            'external_id' => '550e8400-e29b-41d4-a716-446655440000',
            'display_name' => 'John Doe',
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->contactToVCard($contact);

        $this->assertStringContainsString('BEGIN:VCARD', $vcard);
        $this->assertStringContainsString('VERSION:4.0', $vcard);
        $this->assertStringContainsString('UID:550e8400-e29b-41d4-a716-446655440000', $vcard);
        $this->assertStringContainsString('FN:John Doe', $vcard);
        $this->assertStringContainsString('END:VCARD', $vcard);
    }

    #[Test]
    public function contactToVCardIncludesStructuredName(): void
    {
        $contact = [
            'external_id' => 'test-uuid',
            'display_name' => 'Dr. John Michael Doe Jr.',
            'name_prefix' => 'Dr.',
            'name_first' => 'John',
            'name_middle' => 'Michael',
            'name_last' => 'Doe',
            'name_suffix' => 'Jr.',
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->contactToVCard($contact);

        $this->assertStringContainsString('N:Doe;John;Michael;Dr.;Jr.', $vcard);
    }

    #[Test]
    public function contactToVCardIncludesNickname(): void
    {
        $contact = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'nickname' => 'Johnny',
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->contactToVCard($contact);

        $this->assertStringContainsString('NICKNAME:Johnny', $vcard);
    }

    #[Test]
    public function contactToVCardIncludesOrganization(): void
    {
        $contact = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'organization' => 'Acme Corp',
            'department' => 'Engineering',
            'job_title' => 'Senior Developer',
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->contactToVCard($contact);

        $this->assertStringContainsString('ORG:Acme Corp;Engineering', $vcard);
        $this->assertStringContainsString('TITLE:Senior Developer', $vcard);
    }

    #[Test]
    public function contactToVCardIncludesPhones(): void
    {
        $contact = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'phones' => [
                ['phone_number' => '+1-555-123-4567', 'phone_type' => 'mobile', 'is_primary' => true],
                ['phone_number' => '+1-555-987-6543', 'phone_type' => 'work', 'is_primary' => false],
            ],
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->contactToVCard($contact);

        $this->assertStringContainsString('TEL;TYPE=cell;PREF=1:+1-555-123-4567', $vcard);
        $this->assertStringContainsString('TEL;TYPE=work:+1-555-987-6543', $vcard);
    }

    #[Test]
    public function contactToVCardIncludesEmails(): void
    {
        $contact = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'emails' => [
                ['email_address' => 'john@example.com', 'email_type' => 'personal', 'is_primary' => true],
                ['email_address' => 'john.doe@work.com', 'email_type' => 'work', 'is_primary' => false],
            ],
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->contactToVCard($contact);

        $this->assertStringContainsString('EMAIL;TYPE=home;PREF=1:john@example.com', $vcard);
        $this->assertStringContainsString('EMAIL;TYPE=work:john.doe@work.com', $vcard);
    }

    #[Test]
    public function contactToVCardIncludesAddresses(): void
    {
        $contact = [
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

        $vcard = $this->mapper->contactToVCard($contact);

        $this->assertStringContainsString('ADR;TYPE=home;PREF=1:;;123 Main St,Apt 4B;New York;NY;10001;USA', $vcard);
    }

    #[Test]
    public function contactToVCardIncludesBirthday(): void
    {
        $contact = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'dates' => [
                ['date_value' => '1990-05-15', 'date_type' => 'birthday', 'year_known' => true],
            ],
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->contactToVCard($contact);

        $this->assertStringContainsString('BDAY:19900515', $vcard);
    }

    #[Test]
    public function contactToVCardIncludesBirthdayWithoutYear(): void
    {
        $contact = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'dates' => [
                ['date_value' => '1900-05-15', 'date_type' => 'birthday', 'year_known' => false],
            ],
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->contactToVCard($contact);

        $this->assertStringContainsString('BDAY:--0515', $vcard);
    }

    #[Test]
    public function contactToVCardIncludesMetInfo(): void
    {
        $contact = [
            'external_id' => 'test-uuid',
            'display_name' => 'John Doe',
            'met_info' => [
                'met_date' => '2023-06-15',
                'met_location' => 'Tech Conference',
                'met_context' => 'Met at the keynote session',
            ],
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->contactToVCard($contact);

        $this->assertStringContainsString('X-FREUNDEBUCH-MET-DATE:2023-06-15', $vcard);
        $this->assertStringContainsString('X-FREUNDEBUCH-MET-LOCATION:Tech Conference', $vcard);
        $this->assertStringContainsString('X-FREUNDEBUCH-MET-CONTEXT:Met at the keynote session', $vcard);
    }

    #[Test]
    public function contactToVCardEscapesSpecialCharacters(): void
    {
        $contact = [
            'external_id' => 'test-uuid',
            'display_name' => 'John, "The Dev"; Doe',
            'updated_at' => '2024-01-15T12:00:00Z',
        ];

        $vcard = $this->mapper->contactToVCard($contact);

        // Commas and semicolons should be escaped
        $this->assertStringContainsString('FN:John\\, "The Dev"\\; Doe', $vcard);
    }

    #[Test]
    public function vcardToContactParsesBasicFields(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid-123
FN:Jane Smith
N:Smith;Jane;Marie;Ms.;PhD
END:VCARD
VCARD;

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertEquals('test-uuid-123', $contact['external_id']);
        $this->assertEquals('Jane Smith', $contact['display_name']);
        $this->assertEquals('Smith', $contact['name_last']);
        $this->assertEquals('Jane', $contact['name_first']);
        $this->assertEquals('Marie', $contact['name_middle']);
        $this->assertEquals('Ms.', $contact['name_prefix']);
        $this->assertEquals('PhD', $contact['name_suffix']);
    }

    #[Test]
    public function vcardToContactParsesNickname(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
NICKNAME:Janie
END:VCARD
VCARD;

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertEquals('Janie', $contact['nickname']);
    }

    #[Test]
    public function vcardToContactParsesOrganization(): void
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

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertEquals('Tech Corp', $contact['organization']);
        $this->assertEquals('Engineering', $contact['department']);
        $this->assertEquals('Lead Developer', $contact['job_title']);
    }

    #[Test]
    public function vcardToContactParsesPhones(): void
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

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertCount(2, $contact['phones']);
        $this->assertEquals('+1-555-123-4567', $contact['phones'][0]['phone_number']);
        $this->assertEquals('mobile', $contact['phones'][0]['phone_type']);
        $this->assertTrue($contact['phones'][0]['is_primary']);
        $this->assertEquals('+1-555-987-6543', $contact['phones'][1]['phone_number']);
        $this->assertEquals('work', $contact['phones'][1]['phone_type']);
        $this->assertFalse($contact['phones'][1]['is_primary']);
    }

    #[Test]
    public function vcardToContactParsesEmails(): void
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

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertCount(2, $contact['emails']);
        $this->assertEquals('jane@example.com', $contact['emails'][0]['email_address']);
        $this->assertEquals('personal', $contact['emails'][0]['email_type']);
        $this->assertTrue($contact['emails'][0]['is_primary']);
    }

    #[Test]
    public function vcardToContactParsesAddresses(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
ADR;TYPE=home;PREF=1:;;123 Main St;Boston;MA;02101;USA
END:VCARD
VCARD;

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertCount(1, $contact['addresses']);
        $this->assertEquals('123 Main St', $contact['addresses'][0]['street_line1']);
        $this->assertEquals('Boston', $contact['addresses'][0]['city']);
        $this->assertEquals('MA', $contact['addresses'][0]['state_province']);
        $this->assertEquals('02101', $contact['addresses'][0]['postal_code']);
        $this->assertEquals('USA', $contact['addresses'][0]['country']);
        $this->assertEquals('home', $contact['addresses'][0]['address_type']);
    }

    #[Test]
    public function vcardToContactParsesBirthdayWithYear(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
BDAY:19850315
END:VCARD
VCARD;

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertCount(1, $contact['dates']);
        $this->assertEquals('1985-03-15', $contact['dates'][0]['date_value']);
        $this->assertEquals('birthday', $contact['dates'][0]['date_type']);
        $this->assertTrue($contact['dates'][0]['year_known']);
    }

    #[Test]
    public function vcardToContactParsesBirthdayWithoutYear(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
BDAY:--0315
END:VCARD
VCARD;

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertCount(1, $contact['dates']);
        $this->assertEquals('1900-03-15', $contact['dates'][0]['date_value']);
        $this->assertEquals('birthday', $contact['dates'][0]['date_type']);
        $this->assertFalse($contact['dates'][0]['year_known']);
    }

    #[Test]
    public function vcardToContactParsesAnniversary(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:Jane Smith
ANNIVERSARY:20100612
END:VCARD
VCARD;

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertCount(1, $contact['dates']);
        $this->assertEquals('2010-06-12', $contact['dates'][0]['date_value']);
        $this->assertEquals('anniversary', $contact['dates'][0]['date_type']);
        $this->assertTrue($contact['dates'][0]['year_known']);
    }

    #[Test]
    public function vcardToContactParsesMetInfo(): void
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

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertArrayHasKey('met_info', $contact);
        $this->assertEquals('2023-06-15', $contact['met_info']['met_date']);
        $this->assertEquals('Tech Conference', $contact['met_info']['met_location']);
        $this->assertEquals('Met at the keynote session', $contact['met_info']['met_context']);
    }

    #[Test]
    public function vcardToContactParsesSocialProfiles(): void
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

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertCount(2, $contact['social_profiles']);
        $this->assertEquals('linkedin', $contact['social_profiles'][0]['platform']);
        $this->assertEquals('https://linkedin.com/in/janesmith', $contact['social_profiles'][0]['profile_url']);
        $this->assertEquals('github', $contact['social_profiles'][1]['platform']);
    }

    #[Test]
    public function vcardToContactUnescapesSpecialCharacters(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:test-uuid
FN:John\, "The Dev"\; Doe
END:VCARD
VCARD;

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertEquals('John, "The Dev"; Doe', $contact['display_name']);
    }

    #[Test]
    public function vcardToContactUsesProvidedExternalId(): void
    {
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:original-uid
FN:Jane Smith
END:VCARD
VCARD;

        $contact = $this->mapper->vcardToContact($vcard, 'override-uuid');

        $this->assertEquals('override-uuid', $contact['external_id']);
    }

    #[Test]
    public function vcardToContactHandlesFoldedLines(): void
    {
        // vCard folded lines continue with a space or tab
        $vcard = "BEGIN:VCARD\r\n" .
                 "VERSION:4.0\r\n" .
                 "UID:test-uuid\r\n" .
                 "FN:This is a very long name that might get\r\n" .
                 "  folded across multiple lines\r\n" .
                 "END:VCARD";

        $contact = $this->mapper->vcardToContact($vcard);

        $this->assertEquals('This is a very long name that might get folded across multiple lines', $contact['display_name']);
    }

    #[Test]
    public function roundTripPreservesContactData(): void
    {
        $originalContact = [
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

        $vcard = $this->mapper->contactToVCard($originalContact);
        $parsed = $this->mapper->vcardToContact($vcard);

        $this->assertEquals($originalContact['external_id'], $parsed['external_id']);
        $this->assertEquals($originalContact['display_name'], $parsed['display_name']);
        $this->assertEquals($originalContact['name_first'], $parsed['name_first']);
        $this->assertEquals($originalContact['name_last'], $parsed['name_last']);
        $this->assertEquals($originalContact['nickname'], $parsed['nickname']);
        $this->assertEquals($originalContact['organization'], $parsed['organization']);
        $this->assertEquals($originalContact['department'], $parsed['department']);
        $this->assertEquals($originalContact['job_title'], $parsed['job_title']);
        $this->assertCount(1, $parsed['phones']);
        $this->assertEquals($originalContact['phones'][0]['phone_number'], $parsed['phones'][0]['phone_number']);
        $this->assertCount(1, $parsed['emails']);
        $this->assertEquals($originalContact['emails'][0]['email_address'], $parsed['emails'][0]['email_address']);
    }
}
