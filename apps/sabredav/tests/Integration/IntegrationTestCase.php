<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Tests\Integration;

use PDO;
use PHPUnit\Framework\TestCase;
use Testcontainers\Container\Container;
use Testcontainers\Wait\WaitForExec;

/**
 * Base class for integration tests using testcontainers.
 *
 * Provides a PostgreSQL container with the application schema loaded.
 */
abstract class IntegrationTestCase extends TestCase
{
    protected static ?Container $container = null;
    protected static ?PDO $pdo = null;
    private static ?string $databaseUrl = null;

    /**
     * Set up the PostgreSQL container once for all tests in the class.
     */
    public static function setUpBeforeClass(): void
    {
        parent::setUpBeforeClass();

        $externalUrl = getenv('TEST_DATABASE_URL');
        if (is_string($externalUrl) && $externalUrl !== '') {
            self::$databaseUrl = $externalUrl;
        } else {
            if (!self::isDockerAvailable()) {
                self::skipOrFail('Docker is not available. Integration tests require Docker or TEST_DATABASE_URL.');
            }

            try {
                // Start PostGIS container (required for geodata migration)
                // Uses the same image as docker-compose.yml for consistency
                self::$container = Container::make('imresamu/postgis:18-3.6.1-trixie')
                    ->withEnvironment('POSTGRES_PASSWORD', 'test')
                    ->withEnvironment('POSTGRES_USER', 'test')
                    ->withEnvironment('POSTGRES_DB', 'test')
                    ->withWait(new WaitForExec(['pg_isready', '-h', '127.0.0.1', '-U', 'test']));

                self::$container->start();

                self::$databaseUrl = sprintf(
                    'postgresql://test:test@%s:%d/test',
                    self::$container->getHost(),
                    self::$container->getFirstMappedPort()
                );
            } catch (\Throwable $e) {
                // The container never came up; do not let tearDownAfterClass
                // touch it and mask the real reason with a property error.
                self::$container = null;
                self::skipOrFail('Failed to start PostgreSQL container: ' . $e->getMessage());
            }
        }

        self::$pdo = self::connect(self::$databaseUrl);
        self::runMigrations();
    }

    /**
     * Skip locally, fail in CI.
     *
     * These tests are the only guard against the PHP SQL drifting away from the
     * migrated schema, so a silent skip in CI is worse than no test at all.
     */
    private static function skipOrFail(string $reason): void
    {
        if (getenv('CI') === 'true') {
            self::fail($reason);
        }

        self::markTestSkipped($reason);
    }

    /**
     * Check if Docker is available on the system.
     */
    private static function isDockerAvailable(): bool
    {
        $output = [];
        $exitCode = 0;
        @exec('docker info 2>/dev/null', $output, $exitCode);
        return $exitCode === 0;
    }

    /**
     * Open a PDO connection from a postgres:// connection URL.
     */
    private static function connect(string $databaseUrl): PDO
    {
        $parts = parse_url($databaseUrl);
        if ($parts === false || !isset($parts['host'])) {
            throw new \RuntimeException("Unparseable database URL: $databaseUrl");
        }

        $dsn = sprintf(
            'pgsql:host=%s;port=%d;dbname=%s',
            $parts['host'],
            $parts['port'] ?? 5432,
            ltrim($parts['path'] ?? '/postgres', '/')
        );

        return new PDO(
            $dsn,
            urldecode($parts['user'] ?? ''),
            urldecode($parts['pass'] ?? ''),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    }

    /**
     * Run the Node.js database migrations.
     */
    private static function runMigrations(): void
    {
        // Get the project root directory (4 levels up from tests/Integration)
        $projectRoot = dirname(__DIR__, 4);

        // node-pg-migrate runs under tsx because the migrations are TypeScript.
        // Mirrors the backend's `migrate` script; tsx is installed in the
        // backend workspace, not at the repo root.
        $command = sprintf(
            'cd %s && DATABASE_URL=%s ./node_modules/.bin/tsx ../../node_modules/node-pg-migrate/bin/node-pg-migrate.js --decamelize --migrations-dir ../../database/migrations up 2>&1',
            escapeshellarg($projectRoot . '/apps/backend'),
            escapeshellarg(self::$databaseUrl)
        );

        $output = [];
        $exitCode = 0;
        exec($command, $output, $exitCode);

        if ($exitCode !== 0) {
            throw new \RuntimeException(
                "Failed to run migrations (exit code: $exitCode): " . implode("\n", $output)
            );
        }
    }

    /**
     * Stop the container after all tests in the class.
     */
    public static function tearDownAfterClass(): void
    {
        self::$pdo = null;

        if (self::$container !== null) {
            self::$container->stop();
            self::$container = null;
        }

        parent::tearDownAfterClass();
    }

    /**
     * Clean up data before each test for isolation.
     */
    protected function setUp(): void
    {
        parent::setUp();
        $this->cleanupData();
    }

    /**
     * Clean up all data for test isolation.
     */
    protected function cleanupData(): void
    {
        // Delete in proper order due to foreign key constraints
        self::$pdo->exec('DELETE FROM friends.friend_changes');
        self::$pdo->exec('DELETE FROM friends.friend_met_info');
        self::$pdo->exec('DELETE FROM friends.friend_social_profiles');
        self::$pdo->exec('DELETE FROM friends.friend_dates');
        self::$pdo->exec('DELETE FROM friends.friend_urls');
        self::$pdo->exec('DELETE FROM friends.friend_addresses');
        self::$pdo->exec('DELETE FROM friends.friend_emails');
        self::$pdo->exec('DELETE FROM friends.friend_phones');
        self::$pdo->exec('DELETE FROM friends.friends');
        self::$pdo->exec('DELETE FROM auth.app_passwords');
        self::$pdo->exec('DELETE FROM auth.users');
        // Better Auth tables: children first, then the identity row. There is no
        // DB-level FK between auth.users and auth."user" (the link is
        // auth."user".id = auth.users.external_id::text by convention), so the
        // order relative to auth.users is free.
        self::$pdo->exec('DELETE FROM auth.account');
        self::$pdo->exec('DELETE FROM auth.session');
        self::$pdo->exec('DELETE FROM auth."user"');

        // Reset sequences. Resolve them from the owning column: the tables were
        // renamed contacts -> friends but their sequences kept the old names.
        foreach ([['auth', 'users'], ['auth', 'app_passwords'], ['friends', 'friends'], ['friends', 'friend_changes']] as [$schema, $table]) {
            self::$pdo->exec(
                "SELECT setval(pg_get_serial_sequence('$schema.$table', 'id'), 1, false)"
            );
        }
    }

    /**
     * Get the PDO connection.
     */
    protected function getPdo(): PDO
    {
        return self::$pdo;
    }

    /**
     * Create a test user and return their data.
     */
    protected function createTestUser(string $email = 'test@example.com'): array
    {
        // auth.users only anchors the integer FKs now; identity (email,
        // credentials) lives on auth."user" (ADR 0003).
        $stmt = self::$pdo->query('
            INSERT INTO auth.users DEFAULT VALUES
            RETURNING id, external_id, created_at, updated_at
        ');
        $user = $stmt->fetch();

        $baStmt = self::$pdo->prepare('
            INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at)
            VALUES (:id, :name, :email, true, now(), now())
        ');
        $baStmt->execute([
            'id' => $user['external_id'],
            'name' => $email,
            'email' => $email,
        ]);

        $user['email'] = $email;

        return $user;
    }

    /**
     * Create an app password for a user.
     */
    protected function createAppPassword(int $userId, string $name, string $rawPassword): array
    {
        $passwordHash = password_hash($rawPassword, PASSWORD_BCRYPT);
        // password_prefix stores left(sha256(<raw 8-char prefix>), 16 hex chars),
        // matching hashAppPasswordPrefix() in the backend service.
        $prefix = substr(hash('sha256', substr($rawPassword, 0, 8)), 0, 16);

        $stmt = self::$pdo->prepare('
            INSERT INTO auth.app_passwords (user_id, name, password_hash, password_prefix)
            VALUES (:user_id, :name, :password_hash, :password_prefix)
            RETURNING id, external_id, name, password_prefix, created_at
        ');
        $stmt->execute([
            'user_id' => $userId,
            'name' => $name,
            'password_hash' => $passwordHash,
            'password_prefix' => $prefix,
        ]);

        return $stmt->fetch();
    }

    /**
     * Create a test friend and return their data.
     */
    protected function createTestFriend(int $userId, array $data = []): array
    {
        $defaults = [
            'display_name' => 'Test Friend',
            'name_prefix' => null,
            'name_first' => 'Test',
            'name_middle' => null,
            'name_last' => 'Friend',
            'name_suffix' => null,
            'nickname' => null,
            'photo_url' => null,
            'interests' => null,
            // Professional fields live in friends.friend_professional_history.
            'job_title' => null,
            'organization' => null,
            'department' => null,
            'work_notes' => null,
        ];

        $data = array_merge($defaults, $data);

        $stmt = self::$pdo->prepare('
            INSERT INTO friends.friends (
                user_id, display_name, name_prefix, name_first, name_middle,
                name_last, name_suffix, nickname, photo_url, interests
            ) VALUES (
                :user_id, :display_name, :name_prefix, :name_first, :name_middle,
                :name_last, :name_suffix, :nickname, :photo_url, :interests
            )
            RETURNING *
        ');
        $stmt->execute([
            'user_id' => $userId,
            'display_name' => $data['display_name'],
            'name_prefix' => $data['name_prefix'],
            'name_first' => $data['name_first'],
            'name_middle' => $data['name_middle'],
            'name_last' => $data['name_last'],
            'name_suffix' => $data['name_suffix'],
            'nickname' => $data['nickname'],
            'photo_url' => $data['photo_url'],
            'interests' => $data['interests'],
        ]);

        $friend = $stmt->fetch();

        if (
            $data['job_title'] !== null || $data['organization'] !== null
            || $data['department'] !== null || $data['work_notes'] !== null
        ) {
            $historyStmt = self::$pdo->prepare('
                INSERT INTO friends.friend_professional_history (
                    friend_id, job_title, organization, department, notes,
                    from_month, from_year, is_primary
                ) VALUES (
                    :friend_id, :job_title, :organization, :department, :notes,
                    :from_month, :from_year, true
                )
            ');
            $historyStmt->execute([
                'friend_id' => $friend['id'],
                'job_title' => $data['job_title'],
                'organization' => $data['organization'],
                'department' => $data['department'],
                'notes' => $data['work_notes'],
                'from_month' => (int) (new \DateTime())->format('n'),
                'from_year' => (int) (new \DateTime())->format('Y'),
            ]);
        }

        return $friend;
    }

    /**
     * Fetch the primary professional-history row of a friend, or false.
     */
    protected function fetchPrimaryProfessionalHistory(int $friendId): array|false
    {
        $stmt = self::$pdo->prepare('
            SELECT * FROM friends.friend_professional_history
            WHERE friend_id = :friend_id AND is_primary = true
            LIMIT 1
        ');
        $stmt->execute(['friend_id' => $friendId]);

        return $stmt->fetch();
    }

    /**
     * Add a phone number to a friend.
     */
    protected function addPhoneToFriend(int $friendId, string $phoneNumber, string $phoneType = 'mobile', bool $isPrimary = false): array
    {
        $stmt = self::$pdo->prepare('
            INSERT INTO friends.friend_phones (friend_id, phone_number, phone_type, is_primary)
            VALUES (:friend_id, :phone_number, :phone_type, :is_primary)
            RETURNING *
        ');
        $stmt->execute([
            'friend_id' => $friendId,
            'phone_number' => $phoneNumber,
            'phone_type' => $phoneType,
            'is_primary' => $isPrimary ? 'true' : 'false',
        ]);

        return $stmt->fetch();
    }

    /**
     * Add an email to a friend.
     */
    protected function addEmailToFriend(int $friendId, string $emailAddress, string $emailType = 'personal', bool $isPrimary = false): array
    {
        $stmt = self::$pdo->prepare('
            INSERT INTO friends.friend_emails (friend_id, email_address, email_type, is_primary)
            VALUES (:friend_id, :email_address, :email_type, :is_primary)
            RETURNING *
        ');
        $stmt->execute([
            'friend_id' => $friendId,
            'email_address' => $emailAddress,
            'email_type' => $emailType,
            'is_primary' => $isPrimary ? 'true' : 'false',
        ]);

        return $stmt->fetch();
    }
}
