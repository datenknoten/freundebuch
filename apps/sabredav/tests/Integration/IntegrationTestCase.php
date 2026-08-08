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
    /** Postgres listens on its default port inside the container; nothing is published. */
    protected const CONTAINER_POSTGRES_PORT = 5432;

    protected static ?Container $container = null;
    protected static ?PDO $pdo = null;

    /**
     * Set up the PostgreSQL container once for all tests in the class.
     */
    public static function setUpBeforeClass(): void
    {
        parent::setUpBeforeClass();

        // Check if Docker is available
        if (!self::isDockerAvailable()) {
            self::markTestSkipped('Docker is not available. Integration tests require Docker.');
        }

        // Check if the migration runner is available (needed to build the schema)
        if (!self::isMigrationRunnerAvailable()) {
            self::markTestSkipped('aube is not available. Integration tests require aube for migrations.');
        }

        try {
            // Start PostGIS container (required for geodata migration)
            // Uses the same image as docker-compose.yml for consistency.
            // `withNetwork('bridge')` is required: Docker Engine >= 28 leaves the
            // legacy top-level NetworkSettings.IPAddress null, so the address can
            // only be resolved through the named network.
            self::$container = Container::make('imresamu/postgis:18-3.6.1-trixie')
                ->withNetwork('bridge')
                ->withEnvironment('POSTGRES_PASSWORD', 'test')
                ->withEnvironment('POSTGRES_USER', 'test')
                ->withEnvironment('POSTGRES_DB', 'test')
                ->withWait(new WaitForExec(['pg_isready', '-h', '127.0.0.1', '-U', 'test']));

            // `run()` creates the container; `start()` only restarts an existing one.
            self::$container->run();

            // Create PDO connection. No port is published, so the container's own
            // address and the default Postgres port are used.
            $dsn = sprintf(
                'pgsql:host=%s;port=%d;dbname=test',
                self::$container->getAddress(),
                self::CONTAINER_POSTGRES_PORT
            );

            self::$pdo = new PDO($dsn, 'test', 'test', [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);

            // Run Node.js migrations
            self::runMigrations();
        } catch (\Throwable $e) {
            self::markTestSkipped('Failed to start PostgreSQL container: ' . $e->getMessage());
        }
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
     * Check if the database migration runner is available on the system.
     */
    private static function isMigrationRunnerAvailable(): bool
    {
        $output = [];
        $exitCode = 0;
        @exec('aube --version 2>/dev/null', $output, $exitCode);
        return $exitCode === 0;
    }

    /**
     * Run the Node.js database migrations.
     */
    private static function runMigrations(): void
    {
        // Build DATABASE_URL for the test container
        $databaseUrl = sprintf(
            'postgresql://test:test@%s:%d/test',
            self::$container->getAddress(),
            self::CONTAINER_POSTGRES_PORT
        );

        // Get the project root directory (4 levels up from tests/Integration)
        $projectRoot = dirname(__DIR__, 4);

        // Run migrations using aube, the repository's only supported runner.
        $command = sprintf(
            'cd %s && DATABASE_URL=%s aube migrate 2>&1',
            escapeshellarg($projectRoot),
            escapeshellarg($databaseUrl)
        );

        $output = [];
        $exitCode = 0;
        exec($command, $output, $exitCode);
        $combined = implode("\n", $output);

        // `aube run` reports 0 even when the underlying script fails, so the
        // runner's own success banner is the only reliable signal.
        if ($exitCode !== 0 || !str_contains($combined, 'Migrations complete')) {
            throw new \RuntimeException(
                "Failed to run migrations (exit code: $exitCode): " . $combined
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
        self::$pdo->exec('DELETE FROM friends.friend_professional_history');
        self::$pdo->exec('DELETE FROM friends.friends');
        self::$pdo->exec('DELETE FROM auth.app_passwords');
        self::$pdo->exec('DELETE FROM auth.users');

        // Reset sequences. The contacts -> friends rename left the underlying
        // sequences under their original names, so they are looked up rather
        // than spelled out.
        foreach (
            [
                'auth.users',
                'auth.app_passwords',
                'friends.friends',
                'friends.friend_changes',
            ] as $table
        ) {
            self::$pdo->exec(
                "SELECT setval(pg_get_serial_sequence('$table', 'id'), 1, false)"
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
    protected function createTestUser(string $email = 'test@example.com', string $password = 'password123'): array
    {
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        $stmt = self::$pdo->prepare('
            INSERT INTO auth.users (email, password_hash)
            VALUES (:email, :password_hash)
            RETURNING id, external_id, email, created_at, updated_at
        ');
        $stmt->execute([
            'email' => $email,
            'password_hash' => $passwordHash,
        ]);

        return $stmt->fetch();
    }

    /**
     * Create an app password for a user.
     */
    protected function createAppPassword(int $userId, string $name, string $rawPassword): array
    {
        $passwordHash = password_hash($rawPassword, PASSWORD_BCRYPT);
        $prefix = substr($rawPassword, 0, 8);

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
            'is_primary' => self::boolParam($isPrimary),
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
            'is_primary' => self::boolParam($isPrimary),
        ]);

        return $stmt->fetch();
    }

    /**
     * Add a professional history entry to a friend.
     *
     * Job and organisation live here since migration 1768800000000 moved them
     * off friends.friends.
     */
    protected function addProfessionalHistoryToFriend(
        int $friendId,
        ?string $organization = null,
        ?string $jobTitle = null,
        ?string $department = null,
        bool $isPrimary = true
    ): array {
        $stmt = self::$pdo->prepare('
            INSERT INTO friends.friend_professional_history (
                friend_id, job_title, organization, department,
                from_month, from_year, is_primary
            ) VALUES (
                :friend_id, :job_title, :organization, :department,
                1, 2020, :is_primary
            )
            RETURNING *
        ');
        $stmt->execute([
            'friend_id' => $friendId,
            'job_title' => $jobTitle,
            'organization' => $organization,
            'department' => $department,
            'is_primary' => self::boolParam($isPrimary),
        ]);

        return $stmt->fetch();
    }

    /**
     * Render a boolean for a PDO parameter.
     *
     * PDO's pgsql driver stringifies parameters, turning `false` into an empty
     * string, which Postgres rejects as a boolean literal.
     */
    protected static function boolParam(bool $value): string
    {
        return $value ? 'true' : 'false';
    }
}
