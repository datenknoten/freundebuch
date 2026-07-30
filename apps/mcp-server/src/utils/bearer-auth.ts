import type { IncomingMessage } from 'node:http';
import { getAuth } from '@freundebuch/backend/lib/auth.js';
import type pg from 'pg';
import type { Logger } from 'pino';

export interface BearerAuthContext {
  /** Legacy auth.users.external_id (UUID) — what the MCP tools expect. */
  userId: string;
  email: string;
}

/**
 * Resolve a Better Auth user id to the legacy auth.users.external_id (UUID).
 *
 * The MCP tools scope every query by the legacy external_id, but OAuth tokens
 * resolve to a Better Auth user id (an opaque string). Bridge the two by email,
 * exactly as apps/backend/src/middleware/auth.ts does via
 * getLegacyExternalIdByEmail — the difference here is we start from the Better
 * Auth user id (from the token) rather than a validated session.
 */
async function resolveLegacyExternalId(
  pool: pg.Pool,
  betterAuthUserId: string,
): Promise<{ externalId: string; email: string } | null> {
  const result = await pool.query<{ external_id: string; email: string }>(
    `SELECT lu.external_id, bu.email
       FROM auth."user" bu
       JOIN auth.users lu ON lu.email = bu.email
      WHERE bu.id = $1
      LIMIT 1`,
    [betterAuthUserId],
  );
  const row = result.rows[0];
  return row ? { externalId: row.external_id, email: row.email } : null;
}

/**
 * Validate an `Authorization: Bearer <token>` header against the OAuth access
 * tokens issued by the co-located Better Auth authorization server, and resolve
 * the token to the legacy external_id the MCP tools expect.
 *
 * Returns null when the token is missing, unknown, or expired. getMcpSession
 * only checks that the token exists — it does NOT enforce expiry — so we check
 * `accessTokenExpiresAt` here.
 */
export async function verifyBearerToken(
  req: IncomingMessage,
  pool: pg.Pool,
  logger: Logger,
): Promise<BearerAuthContext | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  // Forward only the Authorization header — that is all getMcpSession reads.
  const headers = new Headers();
  headers.set('authorization', authHeader);

  let session: { userId?: string; accessTokenExpiresAt?: string | Date } | null;
  try {
    session = await getAuth().api.getMcpSession({ headers });
  } catch (err) {
    logger.error({ err }, 'Error validating MCP bearer token');
    return null;
  }

  if (!session?.userId) {
    return null;
  }

  // getMcpSession does not enforce expiry — reject expired/undated tokens.
  const expiresAt = session.accessTokenExpiresAt
    ? new Date(session.accessTokenExpiresAt).getTime()
    : Number.NaN;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    logger.warn('MCP bearer token missing expiry or expired');
    return null;
  }

  const resolved = await resolveLegacyExternalId(pool, session.userId);
  if (!resolved) {
    logger.warn({ betterAuthUserId: session.userId }, 'No legacy user for OAuth token subject');
    return null;
  }

  return { userId: resolved.externalId, email: resolved.email };
}

/**
 * Build the public origin of this deployment for the RFC 9728 protected-resource
 * metadata URL. Prefer the configured BETTER_AUTH_URL (so it matches the OAuth
 * issuer exactly); otherwise derive it from the proxy headers nginx sets.
 */
export function getPublicBaseUrl(req: IncomingMessage, configuredBaseUrl?: string): string {
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }
  const proto =
    (typeof req.headers['x-forwarded-proto'] === 'string' && req.headers['x-forwarded-proto']) ||
    'https';
  const host =
    (typeof req.headers['x-forwarded-host'] === 'string' && req.headers['x-forwarded-host']) ||
    (typeof req.headers.host === 'string' && req.headers.host) ||
    'localhost';
  // Only the first proto value is meaningful if a comma-joined list slips through.
  const scheme = proto.split(',')[0].trim();
  return `${scheme}://${host}`;
}
