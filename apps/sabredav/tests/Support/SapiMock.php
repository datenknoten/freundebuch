<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Tests\Support;

use Sabre\HTTP\ResponseInterface;
use Sabre\HTTP\Sapi;

/**
 * Test double for `Sabre\HTTP\Sapi` that counts responses instead of writing
 * them to the real output stream.
 *
 * sabre/http ships an equivalent class inside its own test suite, which the
 * dist package does not include — referencing it made every server-level
 * integration test error out.
 */
class SapiMock extends Sapi
{
    public static int $sent = 0;

    public static function sendResponse(ResponseInterface $response)
    {
        ++self::$sent;
    }
}
