import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRootLogger } from '@datenknoten/kit/logger';
import type { Auth } from '@freundebuch/backend/lib/auth.js';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMcpRequestHandler } from '../src/http-handler.js';
import type { Session } from '../src/session.js';
import type { Services } from '../src/utils/service-factory.js';

const BASIC_CREDENTIALS = `Basic ${Buffer.from('user@example.com:xxxx-xxxx').toString('base64')}`;

const verifyAppPassword = vi.fn();
const getMcpSession = vi.fn();

const auth: Auth = {
  handler: vi.fn(),
  api: { getSession: vi.fn(), listPasskeys: vi.fn(), getMcpSession },
};
// The handler reaches only the app-password check before these tests end.
const services = { appPasswords: { verifyAppPassword } } as unknown as Services;
// Never connects: no test reaches a query.
const pool = new pg.Pool();

let httpServer: http.Server;
let baseUrl: string;

function postMcp(authorization: string) {
  return fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authorization },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
  });
}

describe('createMcpRequestHandler', () => {
  beforeAll(async () => {
    httpServer = http.createServer(
      createMcpRequestHandler({
        services,
        logger: createRootLogger({ LOG_LEVEL: 'silent' }),
        sessions: new Map<string, Session>(),
        pool,
        auth,
      }),
    );
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    // A TCP server that is listening reports an AddressInfo, never a pipe name.
    const { port } = httpServer.address() as AddressInfo;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await pool.end();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when a collaborator throws unexpectedly', () => {
    it('answers 500 with the handleError body and keeps serving later requests', async () => {
      verifyAppPassword.mockRejectedValueOnce(new Error('connection terminated unexpectedly'));

      const response = await postMcp(BASIC_CREDENTIALS);

      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(await response.json()).toEqual({ error: 'Internal server error' });

      const health = await fetch(`${baseUrl}/health`);
      expect(health.status).toBe(200);
    });
  });

  describe('when bearer token verification fails', () => {
    it('treats the request as unauthenticated and answers 401 with a Bearer challenge', async () => {
      getMcpSession.mockRejectedValueOnce(new Error('token store unavailable'));

      const response = await postMcp('Bearer some-token');

      expect(response.status).toBe(401);
      expect(response.headers.get('www-authenticate')).toContain('Bearer resource_metadata=');
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
  });
});
