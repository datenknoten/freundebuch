import { afterEach, describe, expect, it } from 'vitest';
import {
  basicAuthHeader,
  callTool,
  cleanupUserData,
  initMcpSession,
  mcpRequest,
  restoreAppPasswordsForUser,
  revokeAppPasswordsForUser,
  setupMcpTestSuite,
} from './helpers.js';

describe('MCP Server', { timeout: 60000 }, () => {
  const { getContext } = setupMcpTestSuite();

  afterEach(async () => {
    const { pool, testUser, otherUser } = getContext();
    await cleanupUserData(pool, [testUser.externalId, otherUser.externalId]);
  });

  // =========================================================================
  // HTTP Routing
  // =========================================================================

  describe('HTTP Routing', () => {
    it('should return 200 for /health', async () => {
      const { baseUrl } = getContext();
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ status: 'ok' });
    });

    it('should return 404 for unknown paths', async () => {
      const { baseUrl } = getContext();
      const response = await fetch(`${baseUrl}/unknown`);
      expect(response.status).toBe(404);
    });

    it('should return 405 for unsupported methods on /mcp', async () => {
      const { baseUrl, testUser } = getContext();
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'PUT',
        headers: {
          Authorization: basicAuthHeader(testUser.email, testUser.appPassword),
        },
      });
      expect(response.status).toBe(405);
    });

    it('should accept /mcp/ with a trailing slash', async () => {
      // Some reverse proxies normalize requests to add a trailing slash; the
      // MCP path matcher must treat `/mcp/` as equivalent to `/mcp`.
      const { baseUrl, testUser } = getContext();
      const response = await fetch(`${baseUrl}/mcp/`, {
        method: 'PUT',
        headers: {
          Authorization: basicAuthHeader(testUser.email, testUser.appPassword),
        },
      });
      expect(response.status).toBe(405);
    });

    it('should return 401 for /mcp without auth', async () => {
      const { baseUrl } = getContext();
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      });
      expect(response.status).toBe(401);
      expect(response.headers.get('www-authenticate')).toContain('Basic');
    });

    it('should return 413 for bodies exceeding the size cap', async () => {
      const { baseUrl, testUser } = getContext();
      // Payload > 1 MiB default cap. Use a single big string value to keep JSON legal.
      const bigValue = 'x'.repeat(2 * 1024 * 1024);
      const body = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { filler: bigValue },
      });
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: basicAuthHeader(testUser.email, testUser.appPassword),
        },
        body,
      });
      expect(response.status).toBe(413);
    });

    it('should not crash when client aborts during oversized body drain', async () => {
      // Repro: client declares Content-Length > 1 MiB cap, writes a partial body,
      // then destroys the socket. readBody() short-circuits on Content-Length and
      // starts draining via req.resume(). The aborted socket surfaces an 'error'
      // event on the server-side IncomingMessage. Without a no-op error listener
      // attached before resume(), Node would throw an uncaught error and crash
      // this test process. Server liveness is verified via /health afterward.
      const { baseUrl, testUser } = getContext();
      const http = await import('node:http');
      const url = new URL(`${baseUrl}/mcp`);

      await new Promise<void>((resolve) => {
        const req = http.request({
          method: 'POST',
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': String(2 * 1024 * 1024),
            Authorization: basicAuthHeader(testUser.email, testUser.appPassword),
          },
        });
        // Expected after destroy(); swallow so the test runner doesn't see it.
        req.on('error', () => undefined);
        req.on('close', () => resolve());
        req.write(Buffer.alloc(64));
        setTimeout(() => req.destroy(), 10);
      });

      // Give the server a tick to process the aborted stream + any background drain.
      await new Promise((r) => setTimeout(r, 100));

      // If the server crashed on an unhandled 'error' event, this would fail.
      const health = await fetch(`${baseUrl}/health`);
      expect(health.status).toBe(200);
    });

    it('should return 400 for duplicate mcp-session-id headers', async () => {
      const { baseUrl, testUser } = getContext();
      // `undici` fetch collapses duplicate headers into a comma-joined string,
      // so use raw http.request with an array-valued header to emit two
      // separate header lines (Node surfaces both in `req.rawHeaders`).
      const http = await import('node:http');
      const url = new URL(`${baseUrl}/mcp`);
      const { status, body } = await new Promise<{ status: number; body: string }>(
        (resolve, reject) => {
          const req = http.request(
            {
              method: 'POST',
              hostname: url.hostname,
              port: url.port,
              path: url.pathname,
              headers: {
                'Content-Type': 'application/json',
                Authorization: basicAuthHeader(testUser.email, testUser.appPassword),
                'mcp-session-id': ['session-one', 'session-two'],
              },
            },
            (res) => {
              const chunks: Buffer[] = [];
              res.on('data', (c: Buffer) => chunks.push(c));
              res.on('end', () =>
                resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() }),
              );
            },
          );
          req.on('error', reject);
          req.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }));
        },
      );
      expect(status).toBe(400);
      expect(body).toContain('Duplicate');
    });

    it('should handle multi-byte utf-8 characters correctly', async () => {
      const { baseUrl, testUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);

      // Request payload carrying emoji + non-ASCII — guards against naive
      // per-chunk `Buffer.toString()` that would mangle split code points.
      const { status } = await mcpRequest(
        baseUrl,
        {
          jsonrpc: '2.0',
          id: 42,
          method: 'tools/call',
          params: {
            name: 'search_friends',
            arguments: { query: '🌮 café 日本語 €', limit: 1 },
          },
        },
        { email: testUser.email, password: testUser.appPassword, sessionId },
      );
      expect(status).toBe(200);
    });
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('Authentication', () => {
    it('should authenticate with valid app password', async () => {
      const { baseUrl, testUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);
      expect(sessionId).toBeTruthy();
    });

    it('should reject invalid password', async () => {
      const { baseUrl, testUser } = getContext();
      const { status } = await mcpRequest(
        baseUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' },
          },
        },
        { email: testUser.email, password: 'wrong-password' },
      );
      expect(status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const { baseUrl } = getContext();
      const { status } = await mcpRequest(
        baseUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' },
          },
        },
        { email: 'nobody@example.com', password: 'xxxx-xxxx-xxxx-xxxx' },
      );
      expect(status).toBe(401);
    });

    it('should reject malformed Basic auth (no colon)', async () => {
      const { baseUrl } = getContext();
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from('no-colon-here').toString('base64')}`,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      });
      expect(response.status).toBe(401);
    });

    it('should reject Bearer auth (only Basic is supported)', async () => {
      const { baseUrl } = getContext();
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer some-token',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      });
      expect(response.status).toBe(401);
    });

    it('should reject revoked app password', async () => {
      const { baseUrl, pool, testUser } = getContext();

      await revokeAppPasswordsForUser(pool, testUser.externalId);
      try {
        const { status } = await mcpRequest(
          baseUrl,
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2025-03-26',
              capabilities: {},
              clientInfo: { name: 'test-client', version: '1.0.0' },
            },
          },
          { email: testUser.email, password: testUser.appPassword },
        );
        expect(status).toBe(401);
      } finally {
        await restoreAppPasswordsForUser(pool, testUser.externalId);
      }
    });
  });

  // =========================================================================
  // Session Management
  // =========================================================================

  describe('Session Management', () => {
    it('should return a session ID on initialize', async () => {
      const { baseUrl, testUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);
      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe('string');
    });

    it('should reuse an existing session with the same session ID', async () => {
      const { baseUrl, testUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);

      const { status, body } = await mcpRequest(
        baseUrl,
        { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
        { email: testUser.email, password: testUser.appPassword, sessionId },
      );

      expect(status).toBe(200);
      const result = body as { result?: { tools?: unknown[] } };
      expect(result.result?.tools).toBeDefined();
    });

    it('should reject session hijacking — different user with existing session ID', async () => {
      const { baseUrl, testUser, otherUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);

      const { status } = await mcpRequest(
        baseUrl,
        { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
        { email: otherUser.email, password: otherUser.appPassword, sessionId },
      );

      expect(status).toBe(401);
    });

    it('should terminate a session via DELETE', async () => {
      const { baseUrl, testUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);

      const deleteResponse = await fetch(`${baseUrl}/mcp`, {
        method: 'DELETE',
        headers: {
          Authorization: basicAuthHeader(testUser.email, testUser.appPassword),
          'mcp-session-id': sessionId,
        },
      });
      expect(deleteResponse.status).toBe(200);
    });

    it('should return 404 when deleting a non-existent session', async () => {
      const { baseUrl, testUser } = getContext();
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'DELETE',
        headers: {
          Authorization: basicAuthHeader(testUser.email, testUser.appPassword),
          'mcp-session-id': 'non-existent-session-id',
        },
      });
      expect(response.status).toBe(404);
    });

    it('should isolate data between users', async () => {
      const { baseUrl, pool, testUser, otherUser } = getContext();

      await pool.query(
        `INSERT INTO friends.friends (user_id, display_name)
         SELECT u.id, 'TestUser Only Friend'
         FROM auth.users u WHERE u.external_id = $1`,
        [testUser.externalId],
      );
      await pool.query(
        `INSERT INTO friends.friends (user_id, display_name)
         SELECT u.id, 'OtherUser Only Friend'
         FROM auth.users u WHERE u.external_id = $1`,
        [otherUser.externalId],
      );

      const session1 = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);
      const session2 = await initMcpSession(baseUrl, otherUser.email, otherUser.appPassword);

      const { body: body1 } = await callTool(
        baseUrl,
        'list_friends',
        {},
        { email: testUser.email, password: testUser.appPassword, sessionId: session1 },
      );
      const { body: body2 } = await callTool(
        baseUrl,
        'list_friends',
        {},
        { email: otherUser.email, password: otherUser.appPassword, sessionId: session2 },
      );

      const r1 = body1 as { result?: { content?: Array<{ text?: string }> } };
      const r2 = body2 as { result?: { content?: Array<{ text?: string }> } };
      const friends1 = JSON.parse(r1.result?.content?.[0]?.text ?? '{}');
      const friends2 = JSON.parse(r2.result?.content?.[0]?.text ?? '{}');

      const names1 = friends1.friends?.map((f: { displayName: string }) => f.displayName) ?? [];
      const names2 = friends2.friends?.map((f: { displayName: string }) => f.displayName) ?? [];

      expect(names1).toContain('TestUser Only Friend');
      expect(names1).not.toContain('OtherUser Only Friend');
      expect(names2).toContain('OtherUser Only Friend');
      expect(names2).not.toContain('TestUser Only Friend');
    });
  });

  // =========================================================================
  // Tool Execution
  // =========================================================================

  describe('Tool Execution', () => {
    async function getSessionAndAuth() {
      const { baseUrl, testUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);
      return { baseUrl, sessionId, email: testUser.email, password: testUser.appPassword };
    }

    it('should list all 12 tools', async () => {
      const { baseUrl, testUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);

      const { body } = await mcpRequest(
        baseUrl,
        { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
        { email: testUser.email, password: testUser.appPassword, sessionId },
      );

      const result = body as { result?: { tools?: Array<{ name: string }> } };
      const toolNames = result.result?.tools?.map((t) => t.name) ?? [];

      expect(toolNames.length).toBeGreaterThanOrEqual(12);
      expect(toolNames).toContain('list_friends');
      expect(toolNames).toContain('get_friend');
      expect(toolNames).toContain('search_friends');
      expect(toolNames).toContain('faceted_search');
      expect(toolNames).toContain('get_upcoming_dates');
      expect(toolNames).toContain('get_network_graph');
      expect(toolNames).toContain('list_circles');
      expect(toolNames).toContain('get_circle');
      expect(toolNames).toContain('list_collectives');
      expect(toolNames).toContain('get_collective');
      expect(toolNames).toContain('list_encounters');
      expect(toolNames).toContain('get_encounter');
    });

    it('list_friends should return a paginated list', async () => {
      const { pool, testUser } = getContext();
      for (const name of ['Alice', 'Bob', 'Charlie']) {
        await pool.query(
          `INSERT INTO friends.friends (user_id, display_name)
           SELECT u.id, $2 FROM auth.users u WHERE u.external_id = $1`,
          [testUser.externalId, name],
        );
      }

      const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
      const { body } = await callTool(
        baseUrl,
        'list_friends',
        { pageSize: 10 },
        { email, password, sessionId },
      );

      const result = body as { result?: { content?: Array<{ text?: string }> } };
      const data = JSON.parse(result.result?.content?.[0]?.text ?? '{}');
      expect(data.friends.length).toBeGreaterThanOrEqual(3);
      expect(data.total).toBeGreaterThanOrEqual(3);
    });

    it('get_friend should return friend details', async () => {
      const { pool, testUser } = getContext();
      const friendResult = await pool.query(
        `INSERT INTO friends.friends (user_id, display_name, nickname)
         SELECT u.id, 'Detail Friend', 'Detaily'
         FROM auth.users u WHERE u.external_id = $1
         RETURNING external_id`,
        [testUser.externalId],
      );
      const friendId = friendResult.rows[0].external_id;

      const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
      const { body } = await callTool(
        baseUrl,
        'get_friend',
        { friendId },
        { email, password, sessionId },
      );

      const result = body as { result?: { content?: Array<{ text?: string }> } };
      const friend = JSON.parse(result.result?.content?.[0]?.text ?? '{}');
      expect(friend.displayName).toBe('Detail Friend');
      expect(friend.nickname).toBe('Detaily');
    });

    it('get_friend should return not found for non-existent friend', async () => {
      const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
      const { body } = await callTool(
        baseUrl,
        'get_friend',
        { friendId: '00000000-0000-0000-0000-000000000000' },
        { email, password, sessionId },
      );

      const result = body as { result?: { content?: Array<{ text?: string }> } };
      expect(result.result?.content?.[0]?.text).toBe('Friend not found.');
    });

    it('search_friends should return results', async () => {
      const { pool, testUser } = getContext();
      await pool.query(
        `INSERT INTO friends.friends (user_id, display_name)
         SELECT u.id, 'Searchable Uniquename'
         FROM auth.users u WHERE u.external_id = $1`,
        [testUser.externalId],
      );

      const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
      const { body } = await callTool(
        baseUrl,
        'search_friends',
        { query: 'Uniquename', limit: 5 },
        { email, password, sessionId },
      );

      const result = body as { result?: { content?: Array<{ text?: string }> } };
      const results = JSON.parse(result.result?.content?.[0]?.text ?? '[]');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('list_circles should return circles', async () => {
      const { pool, testUser } = getContext();
      await pool.query(
        `INSERT INTO friends.circles (user_id, name, color)
         SELECT u.id, 'Close Friends', '#FF0000'
         FROM auth.users u WHERE u.external_id = $1`,
        [testUser.externalId],
      );

      const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
      const { body } = await callTool(baseUrl, 'list_circles', {}, { email, password, sessionId });

      const result = body as { result?: { content?: Array<{ text?: string }> } };
      const circles = JSON.parse(result.result?.content?.[0]?.text ?? '[]');
      expect(circles.some((c: { name: string }) => c.name === 'Close Friends')).toBe(true);
    });

    it('list_encounters should return encounters', async () => {
      const { pool, testUser } = getContext();
      await pool.query(
        `INSERT INTO encounters.encounters (user_id, title, encounter_date)
         SELECT u.id, 'Coffee meetup', '2024-06-15'
         FROM auth.users u WHERE u.external_id = $1`,
        [testUser.externalId],
      );

      const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
      const { body } = await callTool(
        baseUrl,
        'list_encounters',
        {},
        { email, password, sessionId },
      );

      const result = body as { result?: { content?: Array<{ text?: string }> } };
      const data = JSON.parse(result.result?.content?.[0]?.text ?? '{}');
      expect(data.encounters.length).toBeGreaterThanOrEqual(1);
    });

    it('get_upcoming_dates should return dates array', async () => {
      const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
      const { body } = await callTool(
        baseUrl,
        'get_upcoming_dates',
        { days: 365, limit: 50 },
        { email, password, sessionId },
      );

      const result = body as { result?: { content?: Array<{ text?: string }> } };
      const dates = JSON.parse(result.result?.content?.[0]?.text ?? '[]');
      expect(Array.isArray(dates)).toBe(true);
    });

    it('get_network_graph should return nodes and links', async () => {
      const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
      const { body } = await callTool(
        baseUrl,
        'get_network_graph',
        {},
        { email, password, sessionId },
      );

      const result = body as { result?: { content?: Array<{ text?: string }> } };
      const data = JSON.parse(result.result?.content?.[0]?.text ?? '{}');
      expect(data.nodes).toBeDefined();
      expect(data.links).toBeDefined();
    });
  });
});
