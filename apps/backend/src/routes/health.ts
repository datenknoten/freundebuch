import { createRequire } from 'node:module';
import { Hono } from 'hono';
import type { ReadinessService } from '../services/readiness.service.js';
import type { AppContext } from '../types/context.js';

const require = createRequire(import.meta.url);
// biome-ignore lint/correctness/useImportExtensions: package.json is correct, not package.js
const pkg: Record<string, unknown> = require('../../package.json');
const RELEASE = typeof pkg.version === 'string' ? pkg.version : 'unknown';

/** GET /health — liveness. */
interface LivenessResponse {
  status: 'ok';
  release: string;
}

export interface HealthRoutesOptions {
  readinessService: ReadinessService;
}

export function createHealthRoutes(options: HealthRoutesOptions) {
  const { readinessService } = options;
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

  health.get('/ready', async (c) => {
    const body = await readinessService.getReadiness();

    return c.json(body, body.status === 'ready' ? 200 : 503);
  });

  return health;
}
