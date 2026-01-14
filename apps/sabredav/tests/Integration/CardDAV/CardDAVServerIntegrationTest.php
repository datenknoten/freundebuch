<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Tests\Integration\CardDAV;

use Freundebuch\DAV\Auth\AppPasswordBackend;
use Freundebuch\DAV\CardDAV\FreundebuchCardDAVBackend;
use Freundebuch\DAV\Principal\FreundebuchPrincipalBackend;
use Freundebuch\DAV\Tests\Integration\IntegrationTestCase;
use PHPUnit\Framework\Attributes\Test;
use Sabre\CardDAV;
use Sabre\DAV;
use Sabre\DAV\Auth;
use Sabre\DAVACL;
use Sabre\HTTP;

/**
 * HTTP-level integration tests for the CardDAV server.
 *
 * These tests make actual CardDAV HTTP requests to verify the full stack.
 */
class CardDAVServerIntegrationTest extends IntegrationTestCase
{
    private DAV\Server $server;
    private string $testUserEmail = 'test@example.com';
    private string $testAppPassword = 'abcd1234efgh5678';

    protected function setUp(): void
    {
        parent::setUp();

        // Create test user and app password
        $user = $this->createTestUser($this->testUserEmail);
        $this->createAppPassword((int) $user['id'], 'Test Device', $this->testAppPassword);

        // Set up the SabreDAV server
        $this->setupServer();
    }

    private function setupServer(): void
    {
        $pdo = $this->getPdo();

        // Create backends
        $authBackend = new AppPasswordBackend($pdo);
        $principalBackend = new FreundebuchPrincipalBackend($pdo);
        $carddavBackend = new FreundebuchCardDAVBackend($pdo);

        // Build the directory tree
        $nodes = [
            new DAVACL\PrincipalCollection($principalBackend),
            new CardDAV\AddressBookRoot($principalBackend, $carddavBackend),
        ];

        // Create server
        $this->server = new DAV\Server($nodes);
        $this->server->setBaseUri('/');

        // Add plugins
        $authPlugin = new Auth\Plugin($authBackend, 'Freundebuch');
        $this->server->addPlugin($authPlugin);

        $aclPlugin = new DAVACL\Plugin();
        $aclPlugin->hideNodesFromListings = true;
        $this->server->addPlugin($aclPlugin);

        $carddavPlugin = new CardDAV\Plugin();
        $this->server->addPlugin($carddavPlugin);

        $syncPlugin = new DAV\Sync\Plugin();
        $this->server->addPlugin($syncPlugin);
    }

    /**
     * Make an HTTP request to the server.
     */
    private function request(
        string $method,
        string $uri,
        ?string $body = null,
        array $headers = []
    ): HTTP\Response {
        $request = new HTTP\Request($method, $uri, $headers, $body);

        // Add authentication header
        $authString = base64_encode($this->testUserEmail . ':' . $this->testAppPassword);
        $request->setHeader('Authorization', 'Basic ' . $authString);

        $this->server->httpRequest = $request;
        $this->server->httpResponse = new HTTP\Response();
        $this->server->sapi = new HTTP\SapiMock();

        $this->server->exec();

        return $this->server->httpResponse;
    }

    /**
     * Make an unauthenticated request.
     */
    private function requestWithoutAuth(
        string $method,
        string $uri,
        ?string $body = null,
        array $headers = []
    ): HTTP\Response {
        $request = new HTTP\Request($method, $uri, $headers, $body);

        $this->server->httpRequest = $request;
        $this->server->httpResponse = new HTTP\Response();
        $this->server->sapi = new HTTP\SapiMock();

        $this->server->exec();

        return $this->server->httpResponse;
    }

    #[Test]
    public function unauthenticatedRequestReturns401(): void
    {
        $response = $this->requestWithoutAuth('PROPFIND', '/addressbooks/test@example.com/friends/');

        $this->assertEquals(401, $response->getStatus());
        $this->assertStringContainsString('WWW-Authenticate', implode(',', array_keys($response->getHeaders())));
    }

    #[Test]
    public function wrongPasswordReturns401(): void
    {
        $request = new HTTP\Request('PROPFIND', '/addressbooks/test@example.com/friends/');
        $authString = base64_encode($this->testUserEmail . ':wrongpassword!!');
        $request->setHeader('Authorization', 'Basic ' . $authString);

        $this->server->httpRequest = $request;
        $this->server->httpResponse = new HTTP\Response();
        $this->server->sapi = new HTTP\SapiMock();
        $this->server->exec();

        $this->assertEquals(401, $this->server->httpResponse->getStatus());
    }

    #[Test]
    public function propfindOnRootReturnsAddressbooksCollection(): void
    {
        $body = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
    <d:prop>
        <d:resourcetype/>
    </d:prop>
</d:propfind>
XML;

        $response = $this->request('PROPFIND', '/', $body, [
            'Depth' => '1',
            'Content-Type' => 'application/xml',
        ]);

        $this->assertEquals(207, $response->getStatus());

        $responseBody = $response->getBodyAsString();
        $this->assertStringContainsString('addressbooks', $responseBody);
        $this->assertStringContainsString('principals', $responseBody);
    }

    #[Test]
    public function propfindOnAddressBooksReturnsUserAddressBook(): void
    {
        $body = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
    <d:prop>
        <d:resourcetype/>
        <d:displayname/>
    </d:prop>
</d:propfind>
XML;

        $response = $this->request('PROPFIND', '/addressbooks/test@example.com/', $body, [
            'Depth' => '1',
            'Content-Type' => 'application/xml',
        ]);

        $this->assertEquals(207, $response->getStatus());

        $responseBody = $response->getBodyAsString();
        $this->assertStringContainsString('friends', $responseBody);
    }

    #[Test]
    public function propfindOnAddressBookReturnsCards(): void
    {
        // Create a friend first
        $user = $this->getPdo()->query("SELECT id FROM auth.users WHERE email = 'test@example.com'")->fetch();
        $this->createTestFriend((int) $user['id'], [
            'display_name' => 'John Doe',
            'name_first' => 'John',
            'name_last' => 'Doe',
        ]);

        $body = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
    <d:prop>
        <d:getetag/>
        <d:getcontenttype/>
    </d:prop>
</d:propfind>
XML;

        $response = $this->request('PROPFIND', '/addressbooks/test@example.com/friends/', $body, [
            'Depth' => '1',
            'Content-Type' => 'application/xml',
        ]);

        $this->assertEquals(207, $response->getStatus());

        $responseBody = $response->getBodyAsString();
        $this->assertStringContainsString('.vcf', $responseBody);
        $this->assertStringContainsString('text/vcard', $responseBody);
    }

    #[Test]
    public function getCardReturnsVCardData(): void
    {
        // Create a friend
        $user = $this->getPdo()->query("SELECT id FROM auth.users WHERE email = 'test@example.com'")->fetch();
        $friend = $this->createTestFriend((int) $user['id'], [
            'display_name' => 'Jane Smith',
            'name_first' => 'Jane',
            'name_last' => 'Smith',
            'organization' => 'Acme Inc',
        ]);
        $this->addPhoneToFriend((int) $friend['id'], '+1234567890', 'mobile');
        $this->addEmailToFriend((int) $friend['id'], 'jane@example.com', 'work');

        $response = $this->request('GET', '/addressbooks/test@example.com/friends/' . $friend['external_id'] . '.vcf');

        $this->assertEquals(200, $response->getStatus());
        $this->assertStringContainsString('text/vcard', $response->getHeader('Content-Type'));

        $vcardData = $response->getBodyAsString();
        $this->assertStringContainsString('BEGIN:VCARD', $vcardData);
        $this->assertStringContainsString('VERSION:4.0', $vcardData);
        $this->assertStringContainsString('FN:Jane Smith', $vcardData);
        $this->assertStringContainsString('N:Smith;Jane', $vcardData);
        $this->assertStringContainsString('ORG:Acme Inc', $vcardData);
        $this->assertStringContainsString('TEL', $vcardData);
        $this->assertStringContainsString('EMAIL', $vcardData);
        $this->assertStringContainsString('END:VCARD', $vcardData);
    }

    #[Test]
    public function getNonExistentCardReturns404(): void
    {
        $response = $this->request('GET', '/addressbooks/test@example.com/friends/nonexistent.vcf');

        $this->assertEquals(404, $response->getStatus());
    }

    #[Test]
    public function putCreatesNewCard(): void
    {
        $vcardData = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:new-contact-12345
FN:New Contact
N:Contact;New;;;
ORG:New Company
TEL;TYPE=CELL:+9876543210
EMAIL;TYPE=WORK:new@example.com
END:VCARD
VCARD;

        $response = $this->request(
            'PUT',
            '/addressbooks/test@example.com/friends/new-contact-12345.vcf',
            $vcardData,
            ['Content-Type' => 'text/vcard']
        );

        $this->assertEquals(201, $response->getStatus());
        $this->assertNotEmpty($response->getHeader('ETag'));

        // Verify the contact was created in the database
        $stmt = $this->getPdo()->prepare("
            SELECT * FROM friends.friends
            WHERE external_id = 'new-contact-12345'
        ");
        $stmt->execute();
        $friend = $stmt->fetch();

        $this->assertNotFalse($friend);
        $this->assertEquals('New Contact', $friend['display_name']);
        $this->assertEquals('New', $friend['name_first']);
        $this->assertEquals('Contact', $friend['name_last']);
        $this->assertEquals('New Company', $friend['organization']);
    }

    #[Test]
    public function putUpdatesExistingCard(): void
    {
        // Create a friend first
        $user = $this->getPdo()->query("SELECT id FROM auth.users WHERE email = 'test@example.com'")->fetch();
        $friend = $this->createTestFriend((int) $user['id'], [
            'display_name' => 'Original Name',
            'name_first' => 'Original',
        ]);

        $vcardData = <<<VCARD
BEGIN:VCARD
VERSION:4.0
UID:{$friend['external_id']}
FN:Updated Name
N:Name;Updated;;;
ORG:Updated Company
END:VCARD
VCARD;

        $response = $this->request(
            'PUT',
            '/addressbooks/test@example.com/friends/' . $friend['external_id'] . '.vcf',
            $vcardData,
            ['Content-Type' => 'text/vcard']
        );

        $this->assertContains($response->getStatus(), [200, 204]);

        // Verify the contact was updated
        $stmt = $this->getPdo()->prepare("SELECT * FROM friends.friends WHERE id = :id");
        $stmt->execute(['id' => $friend['id']]);
        $updated = $stmt->fetch();

        $this->assertEquals('Updated Name', $updated['display_name']);
        $this->assertEquals('Updated', $updated['name_first']);
        $this->assertEquals('Name', $updated['name_last']);
        $this->assertEquals('Updated Company', $updated['organization']);
    }

    #[Test]
    public function deleteRemovesCard(): void
    {
        // Create a friend first
        $user = $this->getPdo()->query("SELECT id FROM auth.users WHERE email = 'test@example.com'")->fetch();
        $friend = $this->createTestFriend((int) $user['id']);

        $response = $this->request(
            'DELETE',
            '/addressbooks/test@example.com/friends/' . $friend['external_id'] . '.vcf'
        );

        $this->assertContains($response->getStatus(), [200, 204]);

        // Verify the contact was soft deleted
        $stmt = $this->getPdo()->prepare("SELECT deleted_at FROM friends.friends WHERE id = :id");
        $stmt->execute(['id' => $friend['id']]);
        $deleted = $stmt->fetch();

        $this->assertNotNull($deleted['deleted_at']);
    }

    #[Test]
    public function deleteNonExistentCardReturns404(): void
    {
        $response = $this->request(
            'DELETE',
            '/addressbooks/test@example.com/friends/nonexistent.vcf'
        );

        $this->assertEquals(404, $response->getStatus());
    }

    #[Test]
    public function reportAddressbookMultigetReturnsMultipleCards(): void
    {
        // Create multiple friends
        $user = $this->getPdo()->query("SELECT id FROM auth.users WHERE email = 'test@example.com'")->fetch();
        $friend1 = $this->createTestFriend((int) $user['id'], ['display_name' => 'Friend One']);
        $friend2 = $this->createTestFriend((int) $user['id'], ['display_name' => 'Friend Two']);
        $friend3 = $this->createTestFriend((int) $user['id'], ['display_name' => 'Friend Three']);

        $body = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<card:addressbook-multiget xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
    <d:prop>
        <d:getetag/>
        <card:address-data/>
    </d:prop>
    <d:href>/addressbooks/test@example.com/friends/{$friend1['external_id']}.vcf</d:href>
    <d:href>/addressbooks/test@example.com/friends/{$friend3['external_id']}.vcf</d:href>
</card:addressbook-multiget>
XML;

        $response = $this->request(
            'REPORT',
            '/addressbooks/test@example.com/friends/',
            $body,
            ['Content-Type' => 'application/xml', 'Depth' => '1']
        );

        $this->assertEquals(207, $response->getStatus());

        $responseBody = $response->getBodyAsString();
        $this->assertStringContainsString('Friend One', $responseBody);
        $this->assertStringContainsString('Friend Three', $responseBody);
        $this->assertStringNotContainsString('Friend Two', $responseBody);
    }

    #[Test]
    public function reportSyncCollectionReturnsChanges(): void
    {
        // Create a friend to have initial data
        $user = $this->getPdo()->query("SELECT id FROM auth.users WHERE email = 'test@example.com'")->fetch();
        $friend = $this->createTestFriend((int) $user['id'], ['display_name' => 'Sync Test']);

        $body = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<d:sync-collection xmlns:d="DAV:">
    <d:sync-token/>
    <d:sync-level>1</d:sync-level>
    <d:prop>
        <d:getetag/>
    </d:prop>
</d:sync-collection>
XML;

        $response = $this->request(
            'REPORT',
            '/addressbooks/test@example.com/friends/',
            $body,
            ['Content-Type' => 'application/xml']
        );

        $this->assertEquals(207, $response->getStatus());

        $responseBody = $response->getBodyAsString();
        $this->assertStringContainsString('sync-token', $responseBody);
        $this->assertStringContainsString($friend['external_id'] . '.vcf', $responseBody);
    }

    #[Test]
    public function optionsReturnsCorrectDavHeaders(): void
    {
        $response = $this->request('OPTIONS', '/addressbooks/test@example.com/friends/');

        $this->assertEquals(200, $response->getStatus());

        $allowHeader = $response->getHeader('Allow');
        $this->assertStringContainsString('OPTIONS', $allowHeader);
        $this->assertStringContainsString('GET', $allowHeader);
        $this->assertStringContainsString('PUT', $allowHeader);
        $this->assertStringContainsString('DELETE', $allowHeader);
        $this->assertStringContainsString('PROPFIND', $allowHeader);
        $this->assertStringContainsString('REPORT', $allowHeader);

        $davHeader = $response->getHeader('DAV');
        $this->assertNotEmpty($davHeader);
        $this->assertStringContainsString('addressbook', $davHeader);
    }

    #[Test]
    public function userCannotAccessOtherUsersAddressBook(): void
    {
        // Create another user
        $otherUser = $this->createTestUser('other@example.com');
        $this->createTestFriend((int) $otherUser['id'], ['display_name' => 'Other User Friend']);

        // Try to access other user's address book
        $response = $this->request('PROPFIND', '/addressbooks/other@example.com/friends/', null, [
            'Depth' => '1',
        ]);

        // Should get 403 Forbidden or empty results
        $this->assertContains($response->getStatus(), [403, 207]);

        if ($response->getStatus() === 207) {
            // If 207, should not contain the other user's friend
            $responseBody = $response->getBodyAsString();
            $this->assertStringNotContainsString('Other User Friend', $responseBody);
        }
    }

    #[Test]
    public function emptyAddressBookReturnsEmptyCollection(): void
    {
        // Don't create any friends - test empty state

        $body = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
    <d:prop>
        <d:getetag/>
    </d:prop>
</d:propfind>
XML;

        $response = $this->request('PROPFIND', '/addressbooks/test@example.com/friends/', $body, [
            'Depth' => '1',
            'Content-Type' => 'application/xml',
        ]);

        $this->assertEquals(207, $response->getStatus());

        // Should return multistatus but with only the collection itself, no cards
        $responseBody = $response->getBodyAsString();
        $this->assertStringContainsString('multistatus', $responseBody);
        // The address book itself should be listed
        $this->assertStringContainsString('/addressbooks/test@example.com/friends/', $responseBody);
    }

    #[Test]
    public function wellKnownCarddavRedirects(): void
    {
        // This test verifies the server accepts requests to the CardDAV path
        // (actual well-known redirect would be handled by web server config)
        $response = $this->request('PROPFIND', '/addressbooks/', null, ['Depth' => '0']);

        $this->assertContains($response->getStatus(), [207, 301, 302]);
    }

    #[Test]
    public function curlExtensionIsAvailable(): void
    {
        // This test verifies that the curl extension is available
        // It's required for fetching photos from URLs in vCard generation
        $this->assertTrue(
            \Freundebuch\DAV\VCard\Mapper::isCurlAvailable(),
            'The curl PHP extension must be available for photo URL fetching. ' .
            'Install it with: apt-get install php-curl (Debian/Ubuntu) or enable it in php.ini'
        );
    }

    #[Test]
    public function getCardWithPhotoUrlGeneratesValidVCard(): void
    {
        // Create a friend with a photo_url
        // This tests that the vCard generation doesn't crash when photo_url is set
        // (even if the URL can't be fetched, it should gracefully degrade)
        $user = $this->getPdo()->query("SELECT id FROM auth.users WHERE email = 'test@example.com'")->fetch();
        $friend = $this->createTestFriend((int) $user['id'], [
            'display_name' => 'Photo Test Friend',
            'name_first' => 'Photo',
            'name_last' => 'Test',
            'photo_url' => 'https://example.com/nonexistent-photo.jpg',
        ]);

        $response = $this->request('GET', '/addressbooks/test@example.com/friends/' . $friend['external_id'] . '.vcf');

        $this->assertEquals(200, $response->getStatus());
        $this->assertStringContainsString('text/vcard', $response->getHeader('Content-Type'));

        $vcardData = $response->getBodyAsString();
        $this->assertStringContainsString('BEGIN:VCARD', $vcardData);
        $this->assertStringContainsString('VERSION:4.0', $vcardData);
        $this->assertStringContainsString('FN:Photo Test Friend', $vcardData);
        $this->assertStringContainsString('END:VCARD', $vcardData);
        // Note: We don't assert PHOTO is present because the URL is intentionally unreachable
        // The important thing is that the server doesn't crash
    }

    #[Test]
    public function reportSyncCollectionWithPhotoUrlSucceeds(): void
    {
        // This test specifically targets the bug where sync-collection REPORT would fail
        // if a friend had a photo_url and curl extension was not available
        $user = $this->getPdo()->query("SELECT id FROM auth.users WHERE email = 'test@example.com'")->fetch();
        $this->createTestFriend((int) $user['id'], [
            'display_name' => 'Sync Photo Test',
            'photo_url' => 'https://example.com/test-photo.jpg',
        ]);

        $body = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<d:sync-collection xmlns:d="DAV:">
    <d:sync-token/>
    <d:sync-level>1</d:sync-level>
    <d:prop>
        <d:getetag/>
    </d:prop>
</d:sync-collection>
XML;

        $response = $this->request(
            'REPORT',
            '/addressbooks/test@example.com/friends/',
            $body,
            ['Content-Type' => 'application/xml']
        );

        // The request should succeed even if photo fetching fails
        $this->assertEquals(207, $response->getStatus());

        $responseBody = $response->getBodyAsString();
        $this->assertStringContainsString('sync-token', $responseBody);
    }
}
