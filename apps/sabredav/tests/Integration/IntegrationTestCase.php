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

        // Check if pnpm is available (needed for migrations)
        if (!self::isPnpmAvailable()) {
            self::markTestSkipped('pnpm is not available. Integration tests require pnpm for migrations.');
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

            // Create PDO connection
            $dsn = sprintf(
                'pgsql:host=%s;port=%d;dbname=test',
                self::$container->getHost(),
                self::$container->getFirstMappedPort()
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
     * Check if pnpm is available on the system.
     */
    private static function isPnpmAvailable(): bool
    {
        $output = [];
        $exitCode = 0;
        @exec('pnpm --version 2>/dev/null', $output, $exitCode);
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
            self::$container->getHost(),
            self::$container->getFirstMappedPort()
        );

        // Get the project root directory (4 levels up from tests/Integration)
        $projectRoot = dirname(__DIR__, 4);

        // Run migrations using pnpm
        $command = sprintf(
            'cd %s && DATABASE_URL=%s pnpm migrate 2>&1',
            escapeshellarg($projectRoot),
            escapeshellarg($databaseUrl)
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

        // Reset sequences
        self::$pdo->exec("SELECT setval('auth.users_id_seq', 1, false)");
        self::$pdo->exec("SELECT setval('auth.app_passwords_id_seq', 1, false)");
        self::$pdo->exec("SELECT setval('friends.friends_id_seq', 1, false)");
        self::$pdo->exec("SELECT setval('friends.friend_changes_id_seq', 1, false)");
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
            'job_title' => null,
            'organization' => null,
            'department' => null,
            'interests' => null,
            'work_notes' => null,
        ];

        $data = array_merge($defaults, $data);

        $stmt = self::$pdo->prepare('
            INSERT INTO friends.friends (
                user_id, display_name, name_prefix, name_first, name_middle,
                name_last, name_suffix, nickname, photo_url, job_title,
                organization, department, interests, work_notes
            ) VALUES (
                :user_id, :display_name, :name_prefix, :name_first, :name_middle,
                :name_last, :name_suffix, :nickname, :photo_url, :job_title,
                :organization, :department, :interests, :work_notes
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
            'job_title' => $data['job_title'],
            'organization' => $data['organization'],
            'department' => $data['department'],
            'interests' => $data['interests'],
            'work_notes' => $data['work_notes'],
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
            'is_primary' => $isPrimary,
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
            'is_primary' => $isPrimary,
        ]);

        return $stmt->fetch();
    }
}
