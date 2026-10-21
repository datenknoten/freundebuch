import http from 'node:http';
import { parseWith } from '@datenknoten/kit/schema';
import { type } from 'arktype';
import { afterEach, describe, expect, it } from 'vitest';
import {
  basicAuthHeader,
  callTool,
  cleanupUserData,
  initMcpSession,
  insertFriend,
  mcpRequest,
  parseToolCall,
  parseToolJson,
  parseToolNames,
  restoreAppPasswordsForUser,
  revokeAppPasswordsForUser,
  setupMcpTestSuite,
} from './helpers/mcp-test-suite.js';

const INITIALIZE_REQUEST = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  },
};

const MISSING_ID = '00000000-0000-0000-0000-000000000000';

const FriendListSchema = type({ data: type({ displayName: 'string' }).array() });
const PaginatedListSchema = type({
  data: 'unknown[]',
  pagination: { totalCount: 'number' },
});
const FriendSchema = type({ displayName: 'string', nickname: 'string | null' });
const FriendNotesSchema = type({
  content: 'string',
  sourceFriend: type({ id: 'string' }).or('null'),
}).array();
const CircleListSchema = type({ name: 'string' }).array();
const EncounterSchema = type({
  id: 'string',
  title: 'string | null',
  encounterType: 'string',
  encounterDate: 'string',
  locationText: 'string | null',
  description: 'string | null',
  friends: type({ id: 'string' }).array(),
});
const TitleRowSchema = type({ title: 'string | null', 'location_text?': 'string | null' });
const NetworkGraphSchema = type({ nodes: 'unknown[]', links: 'unknown[]' });
const ToolInputSchemasBodySchema = type({
  result: {
    tools: type({
      name: 'string',
      inputSchema: {
        'type?': 'string',
        'required?': 'string[]',
        'properties?': { '[string]': { 'description?': 'string' } },
      },
    }).array(),
  },
});

describe('MCP HTTP server', { timeout: 60000 }, () => {
  const { getContext } = setupMcpTestSuite();

  afterEach(async () => {
    const { pool, testUser, otherUser } = getContext();
    await cleanupUserData(pool, [testUser.externalId, otherUser.externalId]);
  });

  async function getSessionAndAuth() {
    const { baseUrl, testUser } = getContext();
    const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);
    return { baseUrl, sessionId, email: testUser.email, password: testUser.appPassword };
  }

  async function insertTestFriend(displayName: string, nickname?: string) {
    const { pool, testUser } = getContext();
    return insertFriend(pool, testUser.externalId, displayName, nickname);
  }

  async function selectEncounterRow(encounterId: string) {
    const { pool } = getContext();
    const result = await pool.query(
      'SELECT title, location_text FROM encounters.encounters WHERE external_id = $1',
      [encounterId],
    );
    return parseWith(TitleRowSchema, result.rows[0]);
  }

  describe('routing', () => {
    it('answers /health with 200 and an ok status', async () => {
      const { baseUrl } = getContext();
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'ok' });
    });

    it('answers unknown paths with 404', async () => {
      const { baseUrl } = getContext();
      const response = await fetch(`${baseUrl}/unknown`);
      expect(response.status).toBe(404);
    });

    it('answers unsupported methods on /mcp with 405', async () => {
      const { baseUrl, testUser } = getContext();
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'PUT',
        headers: { Authorization: basicAuthHeader(testUser.email, testUser.appPassword) },
      });
      expect(response.status).toBe(405);
    });

    it('treats /mcp/ with a trailing slash as /mcp', async () => {
      // Some reverse proxies normalize requests to add a trailing slash.
      const { baseUrl, testUser } = getContext();
      const response = await fetch(`${baseUrl}/mcp/`, {
        method: 'PUT',
        headers: { Authorization: basicAuthHeader(testUser.email, testUser.appPassword) },
      });
      expect(response.status).toBe(405);
    });

    it('answers unauthenticated /mcp requests with 401 and an OAuth Bearer challenge', async () => {
      const { baseUrl } = getContext();
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      });
      expect(response.status).toBe(401);
      // MCP clients (e.g. claude.ai) begin discovery via the protected-resource metadata.
      const challenge = response.headers.get('www-authenticate') ?? '';
      expect(challenge).toContain('Bearer');
      expect(challenge).toContain('resource_metadata=');
      expect(challenge).toContain('/.well-known/oauth-protected-resource');
    });

    it('answers bodies above the size cap with 413', async () => {
      const { baseUrl, testUser } = getContext();
      const body = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { filler: 'x'.repeat(2 * 1024 * 1024) },
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

    it('keeps serving after a client aborts while its oversized body drains', async () => {
      // readBody() short-circuits on Content-Length and drains via req.resume();
      // the aborted socket then emits 'error' on the server-side request, which
      // would crash the process without a listener.
      const { baseUrl, testUser } = getContext();
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
        // Expected after destroy().
        req.on('error', () => undefined);
        req.on('close', resolve);
        req.write(Buffer.alloc(64));
        setTimeout(() => req.destroy(), 10);
      });

      // The server exposes no signal for "drain finished"; give it a moment
      // before probing liveness.
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });

      const health = await fetch(`${baseUrl}/health`);
      expect(health.status).toBe(200);
    });

    it('answers duplicate mcp-session-id headers with 400', async () => {
      // undici's fetch joins duplicate headers, so raw http.request sends two
      // separate header lines.
      const { baseUrl, testUser } = getContext();
      const url = new URL(`${baseUrl}/mcp`);
      const { status, body } = await new Promise<{ status: number; body: string }>(
        (resolve, reject) => {
          function onResponse(res: http.IncomingMessage) {
            const chunks: Buffer[] = [];
            function onData(chunk: Buffer) {
              chunks.push(chunk);
            }
            function onEnd() {
              resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() });
            }
            res.on('data', onData);
            res.on('end', onEnd);
          }
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
            onResponse,
          );
          req.on('error', reject);
          req.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }));
        },
      );
      expect(status).toBe(400);
      expect(body).toContain('Duplicate');
    });

    it('decodes multi-byte utf-8 characters split across chunks', async () => {
      const { baseUrl, testUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);

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

  describe('authentication', () => {
    it('opens a session for a valid app password', async () => {
      const { baseUrl, testUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);
      expect(sessionId).not.toBe('');
    });

    it('rejects a wrong password with 401', async () => {
      const { baseUrl, testUser } = getContext();
      const { status } = await mcpRequest(baseUrl, INITIALIZE_REQUEST, {
        email: testUser.email,
        password: 'wrong-password',
      });
      expect(status).toBe(401);
    });

    it('rejects an unknown user with 401', async () => {
      const { baseUrl } = getContext();
      const { status } = await mcpRequest(baseUrl, INITIALIZE_REQUEST, {
        email: 'nobody@example.com',
        password: 'xxxx-xxxx-xxxx-xxxx',
      });
      expect(status).toBe(401);
    });

    it('rejects Basic credentials without a colon with 401', async () => {
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

    it('rejects an unknown Bearer token with an OAuth challenge', async () => {
      const { baseUrl } = getContext();
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer some-invalid-token',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      });
      expect(response.status).toBe(401);
      expect(response.headers.get('www-authenticate') ?? '').toContain('Bearer');
    });

    it('rejects a revoked app password with 401', async () => {
      const { baseUrl, pool, testUser } = getContext();

      await revokeAppPasswordsForUser(pool, testUser.externalId);
      try {
        const { status } = await mcpRequest(baseUrl, INITIALIZE_REQUEST, {
          email: testUser.email,
          password: testUser.appPassword,
        });
        expect(status).toBe(401);
      } finally {
        await restoreAppPasswordsForUser(pool, testUser.externalId);
      }
    });
  });

  describe('sessions', () => {
    it('returns a session ID on initialize', async () => {
      const { baseUrl, testUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);
      expect(sessionId).toEqual(expect.any(String));
      expect(sessionId).not.toBe('');
    });

    it('serves later requests on an existing session ID', async () => {
      const { baseUrl, testUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);

      const { status, body } = await mcpRequest(
        baseUrl,
        { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
        { email: testUser.email, password: testUser.appPassword, sessionId },
      );

      expect(status).toBe(200);
      expect(parseToolNames(body)).toBeDefined();
    });

    it("rejects another user's request on an existing session ID", async () => {
      const { baseUrl, testUser, otherUser } = getContext();
      const sessionId = await initMcpSession(baseUrl, testUser.email, testUser.appPassword);

      const { status } = await mcpRequest(
        baseUrl,
        { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
        { email: otherUser.email, password: otherUser.appPassword, sessionId },
      );

      expect(status).toBe(401);
    });

    it('terminates a session on DELETE', async () => {
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

    it('answers DELETE of an unknown session with 404', async () => {
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

    it('shows each user only their own friends', async () => {
      const { baseUrl, pool, testUser, otherUser } = getContext();
      await insertFriend(pool, testUser.externalId, 'TestUser Only Friend');
      await insertFriend(pool, otherUser.externalId, 'OtherUser Only Friend');

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

      const names1 = parseToolJson(FriendListSchema, body1).data.map(
        (friend) => friend.displayName,
      );
      const names2 = parseToolJson(FriendListSchema, body2).data.map(
        (friend) => friend.displayName,
      );

      expect(names1).toContain('TestUser Only Friend');
      expect(names1).not.toContain('OtherUser Only Friend');
      expect(names2).toContain('OtherUser Only Friend');
      expect(names2).not.toContain('TestUser Only Friend');
    });
  });

  describe('tools', () => {
    it('lists all 16 tools', async () => {
      const { baseUrl, sessionId, email, password } = await getSessionAndAuth();

      const { body } = await mcpRequest(
        baseUrl,
        { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
        { email, password, sessionId },
      );

      const toolNames = parseToolNames(body) ?? [];
      expect(toolNames.length).toBeGreaterThanOrEqual(16);
      expect(toolNames).toEqual(
        expect.arrayContaining([
          'list_friends',
          'get_friend',
          'search_friends',
          'faceted_search',
          'get_upcoming_dates',
          'get_network_graph',
          'list_circles',
          'get_circle',
          'list_collectives',
          'get_collective',
          'list_encounters',
          'get_encounter',
          'create_encounter',
          'edit_encounter',
          'list_friend_notes',
          'create_friend_note',
        ]),
      );
    });

    it('advertises arktype-derived input schemas in tools/list', async () => {
      const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
      const { body } = await mcpRequest(
        baseUrl,
        { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
        { email, password, sessionId },
      );

      const { result } = parseWith(ToolInputSchemasBodySchema, body);
      const getCircle = result.tools.find((tool) => tool.name === 'get_circle');
      expect(getCircle?.inputSchema.type).toBe('object');
      expect(getCircle?.inputSchema.required).toEqual(['circleId']);
      expect(getCircle?.inputSchema.properties?.circleId?.description).toBe('The circle ID (UUID)');
    });

    it('rejects arguments that fail the schema before the handler runs', async () => {
      const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
      const { body } = await callTool(
        baseUrl,
        'get_circle',
        { circleId: 'not-a-uuid' },
        { email, password, sessionId },
      );

      const { isError, text } = parseToolCall(body);
      expect(isError).toBe(true);
      expect(text).toContain('Invalid arguments for tool get_circle');
      expect(text).toContain('circleId must be a UUID');
    });

    describe('create_friend_note', () => {
      it('creates a note that list_friend_notes returns', async () => {
        const friendId = await insertTestFriend('Note Subject');
        const sourceFriendId = await insertTestFriend('Note Source');

        const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
        const { body: createBody } = await callTool(
          baseUrl,
          'create_friend_note',
          { friendId, content: 'Moves to Leipzig', sourceFriendId },
          { email, password, sessionId },
        );
        expect(parseToolCall(createBody).isError).toBeUndefined();

        const { body } = await callTool(
          baseUrl,
          'list_friend_notes',
          { friendId },
          { email, password, sessionId },
        );
        const notes = parseToolJson(FriendNotesSchema, body);
        expect(notes).toHaveLength(1);
        expect(notes[0]?.content).toBe('Moves to Leipzig');
        expect(notes[0]?.sourceFriend?.id).toBe(sourceFriendId);
      });

      it('returns a tool error when the friend is its own source', async () => {
        const friendId = await insertTestFriend('Self Source');

        const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
        const { body } = await callTool(
          baseUrl,
          'create_friend_note',
          { friendId, content: 'Told by myself', sourceFriendId: friendId },
          { email, password, sessionId },
        );
        expect(parseToolCall(body).isError).toBe(true);
      });
    });

    describe('list_friends', () => {
      it('returns a paginated list', async () => {
        for (const name of ['Alice', 'Bob', 'Charlie']) {
          await insertTestFriend(name);
        }

        const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
        const { body } = await callTool(
          baseUrl,
          'list_friends',
          { pageSize: 10 },
          { email, password, sessionId },
        );

        const data = parseToolJson(PaginatedListSchema, body);
        expect(data.data.length).toBeGreaterThanOrEqual(3);
        expect(data.pagination.totalCount).toBeGreaterThanOrEqual(3);
      });
    });

    describe('get_friend', () => {
      it('returns the friend details', async () => {
        const friendId = await insertTestFriend('Detail Friend', 'Detaily');

        const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
        const { body } = await callTool(
          baseUrl,
          'get_friend',
          { friendId },
          { email, password, sessionId },
        );

        const friend = parseToolJson(FriendSchema, body);
        expect(friend.displayName).toBe('Detail Friend');
        expect(friend.nickname).toBe('Detaily');
      });

      it('answers an unknown friend with a not-found text', async () => {
        const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
        const { body } = await callTool(
          baseUrl,
          'get_friend',
          { friendId: MISSING_ID },
          { email, password, sessionId },
        );

        expect(parseToolCall(body).text).toBe('Friend not found.');
      });
    });

    describe('search_friends', () => {
      it('finds a friend by a name fragment', async () => {
        await insertTestFriend('Searchable Uniquename');

        const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
        const { body } = await callTool(
          baseUrl,
          'search_friends',
          { query: 'Uniquename', limit: 5 },
          { email, password, sessionId },
        );

        const results = parseToolJson(type('unknown[]'), body);
        expect(results.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('list_circles', () => {
      it('returns the user circles', async () => {
        const { pool, testUser } = getContext();
        await pool.query(
          `INSERT INTO friends.circles (user_id, name, color)
           SELECT u.id, 'Close Friends', '#FF0000'
           FROM auth.users u WHERE u.external_id = $1`,
          [testUser.externalId],
        );

        const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
        const { body } = await callTool(
          baseUrl,
          'list_circles',
          {},
          { email, password, sessionId },
        );

        const circles = parseToolJson(CircleListSchema, body);
        expect(circles).toContainEqual(expect.objectContaining({ name: 'Close Friends' }));
      });
    });

    describe('list_encounters', () => {
      it('returns the user encounters', async () => {
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

        const data = parseToolJson(PaginatedListSchema, body);
        expect(data.data.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('create_encounter', () => {
      it('creates and persists an encounter with its friends', async () => {
        const friendId = await insertTestFriend('Encounter Friend');

        const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
        const { body } = await callTool(
          baseUrl,
          'create_encounter',
          {
            title: 'Lunch downtown',
            encounterDate: '2024-07-01',
            encounterType: 'in_person',
            friendIds: [friendId],
            locationText: 'The Diner',
            description: 'Caught up over lunch.',
          },
          { email, password, sessionId },
        );

        const encounter = parseToolJson(EncounterSchema, body);
        expect(encounter.id).not.toBe('');
        expect(encounter.title).toBe('Lunch downtown');
        expect(encounter.encounterType).toBe('in_person');
        expect(encounter.encounterDate).toBe('2024-07-01');
        expect(encounter.locationText).toBe('The Diner');
        expect(encounter.friends).toHaveLength(1);
        expect(encounter.friends[0]?.id).toBe(friendId);

        const persisted = await selectEncounterRow(encounter.id);
        expect(persisted.title).toBe('Lunch downtown');
      });
    });

    describe('edit_encounter', () => {
      async function seedEncounter(auth: {
        baseUrl: string;
        sessionId: string;
        email: string;
        password: string;
      }) {
        const friendId = await insertTestFriend('Editable Friend');

        const { body } = await callTool(
          auth.baseUrl,
          'create_encounter',
          {
            title: 'Original title',
            encounterDate: '2024-07-01',
            encounterType: 'in_person',
            friendIds: [friendId],
            locationText: 'The Diner',
            description: 'Caught up over lunch.',
          },
          auth,
        );
        const created = parseToolJson(EncounterSchema, body);
        return { friendId, encounterId: created.id };
      }

      it('updates only the fields that were passed', async () => {
        const auth = await getSessionAndAuth();
        const { encounterId } = await seedEncounter(auth);

        const { body } = await callTool(
          auth.baseUrl,
          'edit_encounter',
          {
            encounterId,
            title: 'Updated title',
            encounterDate: '2024-08-15',
            encounterType: 'video_call',
          },
          auth,
        );

        const encounter = parseToolJson(EncounterSchema, body);
        expect(encounter.id).toBe(encounterId);
        expect(encounter.title).toBe('Updated title');
        expect(encounter.encounterDate).toBe('2024-08-15');
        expect(encounter.encounterType).toBe('video_call');
        expect(encounter.locationText).toBe('The Diner');
        expect(encounter.description).toBe('Caught up over lunch.');
        expect(encounter.friends).toHaveLength(1);

        const persisted = await selectEncounterRow(encounterId);
        expect(persisted.title).toBe('Updated title');
        expect(persisted.location_text).toBe('The Diner');
      });

      it('clears nullable fields passed as null', async () => {
        const auth = await getSessionAndAuth();
        const { encounterId } = await seedEncounter(auth);

        const { body } = await callTool(
          auth.baseUrl,
          'edit_encounter',
          { encounterId, title: null, locationText: null, description: null },
          auth,
        );

        const encounter = parseToolJson(EncounterSchema, body);
        expect(encounter.title).toBeNull();
        expect(encounter.locationText).toBeNull();
        expect(encounter.description).toBeNull();
        expect(encounter.encounterDate).toBe('2024-07-01');
      });

      it('replaces the associated friends', async () => {
        const auth = await getSessionAndAuth();
        const { encounterId } = await seedEncounter(auth);
        const replacementId = await insertTestFriend('Replacement Friend');

        const { body } = await callTool(
          auth.baseUrl,
          'edit_encounter',
          { encounterId, friendIds: [replacementId] },
          auth,
        );

        const encounter = parseToolJson(EncounterSchema, body);
        expect(encounter.friends).toHaveLength(1);
        expect(encounter.friends[0]?.id).toBe(replacementId);
      });

      it('answers an unknown encounter with a not-found text', async () => {
        const auth = await getSessionAndAuth();
        const { body } = await callTool(
          auth.baseUrl,
          'edit_encounter',
          { encounterId: MISSING_ID, title: 'Nope' },
          auth,
        );

        expect(parseToolCall(body).text).toBe('Encounter not found.');
      });
    });

    describe('get_upcoming_dates', () => {
      it('returns an array of dates', async () => {
        const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
        const { body } = await callTool(
          baseUrl,
          'get_upcoming_dates',
          { days: 365, limit: 50 },
          { email, password, sessionId },
        );

        expect(parseToolJson(type('unknown[]'), body)).toEqual(expect.any(Array));
      });
    });

    describe('get_network_graph', () => {
      it('returns nodes and links', async () => {
        const { baseUrl, sessionId, email, password } = await getSessionAndAuth();
        const { body } = await callTool(
          baseUrl,
          'get_network_graph',
          {},
          { email, password, sessionId },
        );

        const data = parseToolJson(NetworkGraphSchema, body);
        expect(data.nodes).toEqual(expect.any(Array));
        expect(data.links).toEqual(expect.any(Array));
      });
    });
  });
});
