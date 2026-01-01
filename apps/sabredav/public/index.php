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

// Load configuration
$config = require __DIR__ . '/../config/config.php';

// Optional local config override
$localConfigPath = __DIR__ . '/../config/config.local.php';
if (file_exists($localConfigPath)) {
    $localConfig = require $localConfigPath;
    $config = array_merge($config, $localConfig);
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
    error_log('Database connection failed: ' . $e->getMessage());
    http_response_code(503);
    echo 'Service Unavailable';
    exit(1);
}

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

// Handle the incoming request
$server->start();
