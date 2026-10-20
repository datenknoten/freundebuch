import pg from 'pg';
import pino from 'pino';
import { afterAll, assert, beforeAll } from 'vitest';
import { PostGISAddressClient } from '../../src/services/external/postgis-address.client.js';
import { cloneTemplateDatabase, dropClonedDatabase, ignorePoolError } from './auth.helpers.js';
import { SUITE_HOOK_TIMEOUT_MS } from './timeouts.js';

export interface PostGISTestContext {
  pool: pg.Pool;
  client: PostGISAddressClient;
  /** Name of the per-suite database cloned from the migrated template. */
  databaseName: string;
}

/**
 * Silent logger for tests
 */
const silentLogger = pino({ level: 'silent' });

/**
 * Set up test environment on the shared Postgres server started by
 * global-setup: clone the migrated template and hand back a PostGIS client
 * bound to it. The geodata fixture is loaded per test via
 * {@link insertTestAddresses}.
 */
export async function setupPostGISTests() {
  const { databaseName, databaseUri } = await cloneTemplateDatabase();

  // Small pool: parallel workers share one server's connection budget.
  const pool = new pg.Pool({ connectionString: databaseUri, min: 1, max: 4 });
  // Connection errors are expected while teardown drains the pool.
  pool.on('error', ignorePoolError);

  const client = new PostGISAddressClient({ db: pool, logger: silentLogger });

  const context: PostGISTestContext = { pool, client, databaseName };
  return context;
}

/**
 * Tear down test environment: drain the pool and drop the cloned database.
 */
export async function teardownPostGISTests(context: PostGISTestContext | undefined) {
  if (context === undefined) {
    return;
  }
  await context.pool.end();
  await dropClonedDatabase(context.databaseName);
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
) {
  // First create an import batch
  const batchResult = await pool.query<{ external_id: string }>(
    `INSERT INTO geodata.import_batches (country_code, source_file, status)
     VALUES ($1, 'test-import.pbf', 'completed')
     RETURNING external_id`,
    [addresses[0]?.countryCode ?? 'DE'],
  );

  const [batch] = batchResult.rows;
  assert.isDefined(batch, 'INSERT … RETURNING must return the import batch');
  const batchId = batch.external_id;

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
        addr.houseNumber ?? null,
        batchId,
      ],
    );
  }

  // Refresh materialized views
  await pool.query('REFRESH MATERIALIZED VIEW geodata.cities_by_postal');
  await pool.query('REFRESH MATERIALIZED VIEW geodata.streets_by_postal');
  await pool.query('REFRESH MATERIALIZED VIEW geodata.housenumbers_by_street');

  return batchId;
}

/**
 * Clear all test data from geodata tables
 */
export async function clearTestData(pool: pg.Pool) {
  await pool.query('DELETE FROM geodata.addresses');
  await pool.query('DELETE FROM geodata.import_batches');
  await pool.query('REFRESH MATERIALIZED VIEW geodata.cities_by_postal');
  await pool.query('REFRESH MATERIALIZED VIEW geodata.streets_by_postal');
  await pool.query('REFRESH MATERIALIZED VIEW geodata.housenumbers_by_street');
}

/**
 * Setup function for beforeAll in test files
 */
export function setupPostGISTestSuite() {
  let context: PostGISTestContext | undefined;

  beforeAll(async () => {
    context = await setupPostGISTests();
  }, SUITE_HOOK_TIMEOUT_MS);

  afterAll(async () => {
    await teardownPostGISTests(context);
  }, SUITE_HOOK_TIMEOUT_MS);

  function getContext() {
    assert.isDefined(context, 'the suite context is set in beforeAll');
    return context;
  }

  return { getContext };
}
