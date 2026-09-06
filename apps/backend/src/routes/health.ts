import { access, constants, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Hono } from 'hono';
import type pg from 'pg';
import { getAuthPool } from '../lib/auth.js';
import { isMailConfigured } from '../services/mailer.js';
import { PhotoService } from '../services/photo.service.js';
import type { AppContext } from '../types/context.js';
import { getConfig } from '../utils/config.js';
import { toError } from '../utils/errors.js';

const require = createRequire(import.meta.url);
// biome-ignore lint/correctness/useImportExtensions: package.json is correct, not package.js
const pkg: Record<string, unknown> = require('../../package.json');
const RELEASE = typeof pkg.version === 'string' ? pkg.version : 'unknown';

/** GET /health — liveness. */
interface LivenessResponse {
  status: 'ok';
  release: string;
}

/** GET /health/ready — readiness. */
interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  checks: {
    db: boolean;
    authDb: boolean;
    uploads: boolean;
  };
  signupEnabled: boolean;
  emailEnabled: boolean;
}

const health = new Hono<AppContext>();

/**
 * Liveness: is the process up and serving? Deliberately does not touch the
 * database — this is what the container HEALTHCHECK used to hit, and a database
 * blip must not get a perfectly healthy process restarted. Use /health/ready
 * for dependency state.
 */
health.get('/', (c) => {
  const body: LivenessResponse = { status: 'ok', release: RELEASE };
  return c.json(body);
});

async function poolReachable(pool: pg.Pool): Promise<boolean> {
  let client: pg.PoolClient | undefined;
  try {
    // connect() must be inside the try: a down or saturated pool throws here,
    // and the check should report false, not bubble up as a 500.
    client = await pool.connect();
    await client.query('SELECT 1');
    return true;
  } finally {
    client?.release();
  }
}

/**
 * Readiness: can this instance actually serve requests? Checks both pools (the
 * main one and Better Auth's, which is separate) plus the uploads volume, which
 * is a bind mount in production and silently read-only when misconfigured.
 */
health.get('/ready', async (c) => {
  const logger = c.get('logger');
  const config = getConfig();

  const uploadDir = new PhotoService(logger).getUploadDir();

  const [db, authDb, uploads] = await Promise.all([
    poolReachable(c.get('db')).catch((error: unknown) => {
      logger.error({ err: toError(error) }, 'Readiness: main database check failed');
      return false;
    }),
    // getAuthPool() itself can throw (unconfigured), so it runs inside the
    // promise rather than while building the array.
    Promise.resolve()
      .then(() => poolReachable(getAuthPool()))
      .catch((error: unknown) => {
        logger.error({ err: toError(error) }, 'Readiness: auth database check failed');
        return false;
      }),
    // mkdir first: the photo service creates the tree lazily on the first
    // upload, so on a fresh volume the directory does not exist yet and a bare
    // access() would report a broken instance. mkdir is idempotent and fails
    // for exactly the case we care about — a read-only or misowned mount.
    mkdir(uploadDir, { recursive: true })
      .then(() => access(uploadDir, constants.W_OK))
      .then(
        () => true,
        (error: unknown) => {
          logger.error({ err: toError(error), uploadDir }, 'Readiness: uploads dir not writable');
          return false;
        },
      ),
  ]);

  const ready = db && authDb && uploads;
  const body: ReadinessResponse = {
    status: ready ? 'ready' : 'not_ready',
    checks: { db, authDb, uploads },
    signupEnabled: !config.DISABLE_SIGNUP,
    emailEnabled: isMailConfigured(config),
  };

  return c.json(body, ready ? 200 : 503);
});

export default health;
