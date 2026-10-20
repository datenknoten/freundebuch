import { type } from 'arktype';

/** GET /health/ready answers this shape with 200 when ready and 503 otherwise. */
export const ReadinessResponseSchema = type({
  status: "'ready' | 'not_ready'",
  checks: {
    db: 'boolean',
    authDb: 'boolean',
    uploads: 'boolean',
  },
  signupEnabled: 'boolean',
  emailEnabled: 'boolean',
});

export type ReadinessResponse = typeof ReadinessResponseSchema.infer;
