<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Tests\Integration\CardDAV;

use Sabre\HTTP\ResponseInterface;
use Sabre\HTTP\Sapi;

/**
 * Test double for Sabre\HTTP\Sapi.
 *
 * sabre/http ships its own SapiMock only inside its test suite, which
 * `composer install --prefer-dist` does not install. Keeping the response in
 * memory instead of writing it to php://output lets the tests assert on it.
 */
class SapiMock extends Sapi
{
    /** Number of responses that would have been sent to the client. */
    public static int $sent = 0;

    public static function sendResponse(ResponseInterface $response): void
    {
        ++self::$sent;
    }
}
