import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { runner } from 'node-pg-migrate';
import pg from 'pg';
import { Wait } from 'testcontainers';

/** Minimal shape of the vitest global-setup context we use. */
interface GlobalSetupContext {
  provide: <K extends 'pgContainerUri'>(key: K, value: string) => void;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONTAINER_STARTUP_TIMEOUT_MS = 120_000;
const TEMPLATE_DATABASE = 'test';

const silentLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

/** Swap the database name in a postgres connection URI. */
function withDatabase(uri: string, databaseName: string): string {
  const url = new URL(uri);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function createTemplateDatabase(serverUri: string): Promise<() => Promise<void>> {
  const adminUri = withDatabase(serverUri, 'postgres');
  const adminPool = new pg.Pool({ connectionString: adminUri, max: 1 });
  try {
    await adminPool.query(`DROP DATABASE IF EXISTS "${TEMPLATE_DATABASE}" WITH (FORCE)`);
    await adminPool.query(`CREATE DATABASE "${TEMPLATE_DATABASE}"`);
  } finally {
    await adminPool.end();
  }

  return async () => {
    const cleanupPool = new pg.Pool({ connectionString: adminUri, max: 1 });
    try {
      await cleanupPool.query(`DROP DATABASE IF EXISTS "${TEMPLATE_DATABASE}" WITH (FORCE)`);
    } finally {
      await cleanupPool.end();
    }
  };
}

/**
 * Vitest global setup, mirroring apps/backend/tests/integration/global-setup.ts:
 * start ONE PostGIS server for the whole run and migrate a template database
 * once; each suite clones it in milliseconds instead of booting its own
 * container and replaying every migration.
 *
 * `TEST_DATABASE_URL` points the run at an existing PostGIS server (any
 * database on it) instead of a container — needed wherever Docker cannot
 * publish ports.
 */
export default async function setup({ provide }: GlobalSetupContext): Promise<() => Promise<void>> {
  const externalServerUri = process.env.TEST_DATABASE_URL;

  let templateUri: string;
  let teardown: () => Promise<void>;

  if (externalServerUri !== undefined && externalServerUri !== '') {
    teardown = await createTemplateDatabase(externalServerUri);
    templateUri = withDatabase(externalServerUri, TEMPLATE_DATABASE);
  } else {
    const container = await new PostgreSqlContainer('imresamu/postgis:18-3.6.1-trixie')
      .withDatabase(TEMPLATE_DATABASE)
      .withUsername('test')
      .withPassword('test')
      .withStartupTimeout(CONTAINER_STARTUP_TIMEOUT_MS)
      .withWaitStrategy(Wait.forHealthCheck())
      .start();
    templateUri = container.getConnectionUri();
    teardown = async () => {
      await container.stop();
    };
  }

  const pool = new pg.Pool({ connectionString: templateUri, max: 2 });
  const client = await pool.connect();
  try {
    await runner({
      dbClient: client,
      migrationsTable: 'pgmigrations',
      dir: path.resolve(__dirname, '../../../database/migrations'),
      direction: 'up',
      count: Number.POSITIVE_INFINITY,
      decamelize: true,
      logger: silentLogger,
    });
  } finally {
    client.release();
    await pool.end();
  }

  provide('pgContainerUri', templateUri);

  return teardown;
}

declare module 'vitest' {
  interface ProvidedContext {
    pgContainerUri: string;
  }
}
