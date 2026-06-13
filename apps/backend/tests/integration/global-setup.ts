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
 */
const silentLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

export default async function setup({ provide }: GlobalSetupContext): Promise<() => Promise<void>> {
  const container = await new PostgreSqlContainer('imresamu/postgis:18-3.6.1-trixie')
    .withDatabase('test')
    .withUsername('test')
    .withPassword('test')
    .withStartupTimeout(CONTAINER_STARTUP_TIMEOUT_MS)
    .withWaitStrategy(Wait.forHealthCheck())
    .start();

  // Migrate the default 'test' database; suites clone it as a template.
  const pool = new pg.Pool({ connectionString: container.getConnectionUri(), max: 2 });
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

  // host:port/credentials the workers use to reach the shared container.
  provide('pgContainerUri', container.getConnectionUri());

  return async () => {
    await container.stop();
  };
}

declare module 'vitest' {
  interface ProvidedContext {
    pgContainerUri: string;
  }
}
