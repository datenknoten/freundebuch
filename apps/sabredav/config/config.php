<?php

declare(strict_types=1);

/**
 * Configuration for Freundebuch CardDAV Server
 */

// Parse DATABASE_URL environment variable
$databaseUrl = getenv('DATABASE_URL') ?: '';

if (empty($databaseUrl)) {
    throw new RuntimeException('DATABASE_URL environment variable is required');
}

// Parse the URL (supports both postgres:// and postgresql://)
$parsedUrl = parse_url($databaseUrl);

if ($parsedUrl === false) {
    throw new RuntimeException('Invalid DATABASE_URL format');
}

// Build PDO DSN
$host = $parsedUrl['host'] ?? 'localhost';
$port = $parsedUrl['port'] ?? 5432;
$dbname = ltrim($parsedUrl['path'] ?? '', '/');
$user = $parsedUrl['user'] ?? '';
$pass = $parsedUrl['pass'] ?? '';

return [
    'database' => [
        'dsn' => "pgsql:host={$host};port={$port};dbname={$dbname}",
        'user' => $user,
        'password' => $pass,
    ],
    'realm' => 'Freundebuch CardDAV',
    'base_uri' => '/carddav/',
    'log_level' => getenv('LOG_LEVEL') ?: 'info',
    'sentry_dsn' => getenv('SENTRY_DSN') ?: '',
    'environment' => getenv('ENV') ?: 'development',
];
