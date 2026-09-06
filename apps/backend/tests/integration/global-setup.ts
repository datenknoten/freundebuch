import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { runner } from 'node-pg-migrate';
import pg from 'pg';
import { Wait } from 'testcontainers';
import { CONTAINER_STARTUP_TIMEOUT_MS } from './timeouts.js';

/** Minimal shape of the vitest global-setup context we use. */
interface GlobalSetupContext {
  provide: <K extends 'pgContainerUri'>(key: K, value: string) => void;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest global setup: start ONE PostGIS container for the whole integration
 * run and migrate a template database once. Each suite then clones a fresh
 * database from the template in milliseconds (see auth.helpers.ts), instead of
 * booting a container and running every migration per file.
 *
 * The container's connection URI is provided to the workers via inject(); the
 * container itself stays in this process and is stopped in teardown.
 *
 * `TEST_DATABASE_URL` overrides the container: point it at a PostGIS server
 * (any database on it) and the suite builds its `test` template there instead.
 * Needed wherever Docker cannot publish ports — CI jobs that already run a
 * postgres service, and hosts whose kernel lacks the netfilter modules Docker's
 * port forwarding requires.
 */
const silentLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

const TEMPLATE_DATABASE = 'test';

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

  // Migrate the template database; suites clone it per file.
  const pool = new pg.Pool({ connectionString: templateUri, max: 2 });
  const client = await pool.connect();
  try {
    await runner({
      dbClient: client,
      migrationsTable: 'pgmigrations',
      dir: path.resolve(__dirname, '../../../../database/migrations'),
      direction: 'up',
      count: Number.POSITIVE_INFINITY,
      decamelize: true,
      logger: silentLogger,
    });
  } finally {
    client.release();
    await pool.end();
  }

  // host:port/credentials the workers use to reach the shared template.
  provide('pgContainerUri', templateUri);

  return teardown;
}

declare module 'vitest' {
  interface ProvidedContext {
    pgContainerUri: string;
  }
}
