import { access, constants, mkdir } from 'node:fs/promises';
import type pg from 'pg';
import type { Logger } from 'pino';
import type { Config } from '../config.js';
import { isMailConfigured } from '../utils/is-mail-configured.js';
import { toError } from '../utils/to-error.js';

export type ReadinessConfig = Pick<Config, 'UPLOAD_DIR' | 'DISABLE_SIGNUP' | 'SMTP_HOST'>;

export interface ReadinessServiceOptions {
  db: pg.Pool;
  authDb: pg.Pool;
  logger: Logger;
  config: ReadinessConfig;
}

/** GET /health/ready — readiness. */
export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  checks: {
    db: boolean;
    authDb: boolean;
    uploads: boolean;
  };
  signupEnabled: boolean;
  emailEnabled: boolean;
}

/**
 * The readiness body is memoised for a few seconds: it is public, the frontend
 * fetches it on every page load (stores/instance.ts), nginx does not throttle
 * /health, and each computation takes a client out of both pools (main max 10,
 * auth max 5) plus an mkdir/access. Without the cache a handful of concurrent
 * anonymous requests starves sign-in.
 *
 * Concurrent callers share the in-flight promise, so a burst costs one check.
 * A not_ready result is cached too — five seconds of stale "not ready" is
 * harmless next to a 30s probe interval.
 */
const READINESS_TTL_MS = 5_000;

async function isPoolReachable(pool: pg.Pool): Promise<boolean> {
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

export class ReadinessService {
  private readonly db: pg.Pool;
  private readonly authDb: pg.Pool;
  private readonly logger: Logger;
  private readonly config: ReadinessConfig;
  private cachedReadiness: { at: number; result: Promise<ReadinessResponse> } | null = null;

  public constructor(options: ReadinessServiceOptions) {
    this.db = options.db;
    this.authDb = options.authDb;
    this.logger = options.logger;
    this.config = options.config;
  }

  public getReadiness(): Promise<ReadinessResponse> {
    if (this.cachedReadiness === null || Date.now() - this.cachedReadiness.at >= READINESS_TTL_MS) {
      const entry = { at: Date.now(), result: this.computeReadiness() };
      this.cachedReadiness = entry;
      void this.forgetOnRejection(entry);
    }

    return this.cachedReadiness.result;
  }

  /**
   * computeReadiness turns dependency failures into `false`, but it can still
   * throw. A rejection must not stick for the whole TTL, so drop the entry and
   * let the next caller re-check.
   */
  private async forgetOnRejection(entry: { at: number; result: Promise<ReadinessResponse> }) {
    try {
      await entry.result;
    } catch {
      if (this.cachedReadiness === entry) {
        this.cachedReadiness = null;
      }
    }
  }

  /** Drops the memoised readiness body. For tests that change the environment. */
  public resetCache(): void {
    this.cachedReadiness = null;
  }

  /**
   * Readiness: can this instance actually serve requests? Checks both pools (the
   * main one and Better Auth's, which is separate) plus the uploads volume, which
   * is a bind mount in production and silently read-only when misconfigured.
   */
  private async computeReadiness(): Promise<ReadinessResponse> {
    const [db, authDb, uploads] = await Promise.all([
      this.isPoolHealthy(this.db, 'Readiness: main database check failed'),
      this.isPoolHealthy(this.authDb, 'Readiness: auth database check failed'),
      this.isUploadDirWritable(),
    ]);

    const isReady = db && authDb && uploads;
    return {
      status: isReady ? 'ready' : 'not_ready',
      checks: { db, authDb, uploads },
      signupEnabled: !this.config.DISABLE_SIGNUP,
      emailEnabled: isMailConfigured(this.config),
    };
  }

  private async isPoolHealthy(pool: pg.Pool, failureMessage: string) {
    try {
      return await isPoolReachable(pool);
    } catch (error) {
      this.logger.error({ err: toError(error) }, failureMessage);
      return false;
    }
  }

  private async isUploadDirWritable() {
    const uploadDir = this.config.UPLOAD_DIR;
    try {
      // mkdir first: the photo service creates the tree lazily on the first
      // upload, so on a fresh volume the directory does not exist yet and a bare
      // access() would report a broken instance. mkdir is idempotent and fails
      // for exactly the case we care about — a read-only or misowned mount.
      await mkdir(uploadDir, { recursive: true });
      await access(uploadDir, constants.W_OK);
      return true;
    } catch (error) {
      this.logger.error({ err: toError(error), uploadDir }, 'Readiness: uploads dir not writable');
      return false;
    }
  }
}
