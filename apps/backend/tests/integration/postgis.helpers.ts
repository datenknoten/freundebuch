import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { runner } from 'node-pg-migrate';
import pg from 'pg';
import pino from 'pino';
import { Wait } from 'testcontainers';
import { afterAll, beforeAll } from 'vitest';
import { PostGISAddressClient } from '../../src/services/external/postgis-address.client.js';
import { resetConfig } from '../../src/utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PostGISTestContext {
  container: StartedPostgreSqlContainer;
  pool: pg.Pool;
  client: PostGISAddressClient;
}

/**
 * Silent logger for tests
 */
const silentLogger = pino({ level: 'silent' });

/**
 * Silent logger for migrations
 */
const silentMigrationLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

/**
 * Set up test environment with PostGIS container
 */
export async function setupPostGISTests(): Promise<PostGISTestContext> {
  // Start PostGIS container (same image as docker-compose.yml)
  const container = await new PostgreSqlContainer('imresamu/postgis:18-3.6.1-trixie')
    .withDatabase('test')
    .withUsername('test')
    .withPassword('test')
    .withStartupTimeout(120000)
    .withWaitStrategy(Wait.forHealthCheck())
    .start();

  const connectionUri = container.getConnectionUri();

  // Set DATABASE_URL from the container
  process.env.DATABASE_URL = connectionUri;
  resetConfig();

  // Create connection pool
  const pool = new pg.Pool({
    connectionString: connectionUri,
    min: 2,
    max: 10,
  });

  // Suppress pool errors during container shutdown
  pool.on('error', () => {
    // Ignore - expected during test teardown when container stops
  });

  // Run migrations
  await runMigrations(pool);

  // Create PostGIS address client
  const client = new PostGISAddressClient(pool, silentLogger);

  return { container, pool, client };
}

/**
 * Tear down test environment
 */
export async function teardownPostGISTests(context: PostGISTestContext): Promise<void> {
  if (!context) {
    return;
  }
  if (context.pool) {
    await context.pool.end();
  }
  if (context.container) {
    await context.container.stop();
  }
}

/**
 * Run database migrations using node-pg-migrate
 */
async function runMigrations(pool: pg.Pool): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '../../../../database/migrations');

  const pgClient = await pool.connect();

  try {
    await runner({
      dbClient: pgClient,
      migrationsTable: 'pgmigrations',
      dir: migrationsDir,
      direction: 'up',
      count: Infinity,
      decamelize: true,
      logger: silentMigrationLogger,
    });
  } finally {
    pgClient.release();
  }
}

/**
 * Insert test address data into the database
 */
export async function insertTestAddresses(
  pool: pg.Pool,
  addresses: Array<{
    countryCode: string;
    postalCode: string;
    city: string;
    street: string;
    houseNumber?: string;
  }>,
): Promise<string> {
  // First create an import batch
  const batchResult = await pool.query<{ external_id: string }>(
    `INSERT INTO geodata.import_batches (country_code, source_file, status)
     VALUES ($1, 'test-import.pbf', 'completed')
     RETURNING external_id`,
    [addresses[0]?.countryCode || 'DE'],
  );

  const batchId = batchResult.rows[0].external_id;

  // Insert addresses
  for (const addr of addresses) {
    await pool.query(
      `INSERT INTO geodata.addresses (country_code, postal_code, city, street, house_number, import_batch_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        addr.countryCode,
        addr.postalCode,
        addr.city,
        addr.street,
        addr.houseNumber || null,
        batchId,
      ],
    );
  }

  // Refresh materialized views
  await pool.query('REFRESH MATERIALIZED VIEW geodata.streets_by_postal');
  await pool.query('REFRESH MATERIALIZED VIEW geodata.housenumbers_by_street');

  return batchId;
}

/**
 * Clear all test data from geodata tables
 */
export async function clearTestData(pool: pg.Pool): Promise<void> {
  await pool.query('DELETE FROM geodata.addresses');
  await pool.query('DELETE FROM geodata.import_batches');
  await pool.query('REFRESH MATERIALIZED VIEW geodata.streets_by_postal');
  await pool.query('REFRESH MATERIALIZED VIEW geodata.housenumbers_by_street');
}

/**
 * Setup function for beforeAll in test files
 */
export function setupPostGISTestSuite() {
  let context: PostGISTestContext;

  beforeAll(async () => {
    // Set required environment variables for tests
    process.env.JWT_SECRET = 'test-jwt-secret-test-jwt-secret-1';
    process.env.SESSION_SECRET = 'test-session-secret-test-session-secret-1';
    process.env.LOG_LEVEL = 'silent';

    context = await setupPostGISTests();
  }, 180000); // 180 second timeout for container startup

  afterAll(async () => {
    await teardownPostGISTests(context);
    delete process.env.JWT_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.LOG_LEVEL;
    resetConfig();
  }, 60000);

  return {
    getContext: () => context,
  };
}
