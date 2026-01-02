<?php

declare(strict_types=1);

/**
 * Freundebuch CardDAV Server Entry Point
 *
 * This file serves as the entry point for all CardDAV requests.
 * It uses SabreDAV with custom backends for Freundebuch integration.
 */

require __DIR__ . '/../vendor/autoload.php';

use Sabre\DAV;
use Sabre\DAV\Auth;
use Sabre\CardDAV;
use Sabre\DAVACL;
use Freundebuch\DAV\Auth\AppPasswordBackend;
use Freundebuch\DAV\Principal\FreundebuchPrincipalBackend;
use Freundebuch\DAV\CardDAV\FreundebuchCardDAVBackend;
use Freundebuch\DAV\Logging\Logger;

// Load configuration
$config = require __DIR__ . '/../config/config.php';

// Optional local config override
$localConfigPath = __DIR__ . '/../config/config.local.php';
if (file_exists($localConfigPath)) {
    $localConfig = require $localConfigPath;
    $config = array_merge($config, $localConfig);
}

// Initialize logger
$logger = new Logger($config['log_level']);
$requestStart = microtime(true);

// Initialize Sentry if DSN is configured
if (!empty($config['sentry_dsn'])) {
    \Sentry\init([
        'dsn' => $config['sentry_dsn'],
        'environment' => $config['environment'],
        'traces_sample_rate' => $config['environment'] === 'production' ? 0.1 : 1.0,
    ]);
}

// Create PDO connection
try {
    $pdo = new PDO(
        $config['database']['dsn'],
        $config['database']['user'],
        $config['database']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    $logger->error('Database connection failed', ['error' => $e->getMessage()]);
    if (!empty($config['sentry_dsn'])) {
        \Sentry\captureException($e);
    }
    http_response_code(503);
    echo 'Service Unavailable';
    exit(1);
}

$logger->debug('Database connection established');

// Authentication backend (app passwords)
$authBackend = new AppPasswordBackend($pdo);

// Principal backend (users)
$principalBackend = new FreundebuchPrincipalBackend($pdo);

// CardDAV backend (contacts)
$carddavBackend = new FreundebuchCardDAVBackend($pdo);

// Build the directory tree
$nodes = [
    new DAVACL\PrincipalCollection($principalBackend),
    new CardDAV\AddressBookRoot($principalBackend, $carddavBackend),
];

// Create server
$server = new DAV\Server($nodes);
$server->setBaseUri($config['base_uri']);

// Add plugins
$authPlugin = new Auth\Plugin($authBackend, $config['realm']);
$server->addPlugin($authPlugin);

$aclPlugin = new DAVACL\Plugin();
$aclPlugin->hideNodesFromListings = true;
$server->addPlugin($aclPlugin);

$carddavPlugin = new CardDAV\Plugin();
$server->addPlugin($carddavPlugin);

// Sync support (RFC 6578)
$syncPlugin = new DAV\Sync\Plugin();
$server->addPlugin($syncPlugin);

// Optional: Browser plugin for debugging (disable in production)
if ($config['log_level'] === 'debug') {
    $browserPlugin = new DAV\Browser\Plugin();
    $server->addPlugin($browserPlugin);
}

// Log incoming request
$method = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';
$path = $_SERVER['REQUEST_URI'] ?? '/';
$logger->debug('CardDAV request received', [
    'method' => $method,
    'path' => $path,
]);

// Debug: Log raw Authorization header to diagnose truncation issues
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
if ($authHeader && strpos(strtolower($authHeader), 'basic ') === 0) {
    $encoded = substr($authHeader, 6);
    $decoded = base64_decode($encoded);
    $colonPos = strpos($decoded, ':');
    if ($colonPos !== false) {
        $username = substr($decoded, 0, $colonPos);
        error_log(sprintf(
            '[AUTH_DEBUG] Raw auth header: encoded_len=%d decoded_len=%d username_len=%d username=%s',
            strlen($encoded),
            strlen($decoded),
            strlen($username),
            $username
        ));
    }
}

// Handle the incoming request
$server->start();

// Log request completion
$duration = round((microtime(true) - $requestStart) * 1000);
$statusCode = http_response_code();
$logger->info('CardDAV request completed', [
    'method' => $method,
    'path' => $path,
    'status' => $statusCode,
    'duration' => $duration,
]);
