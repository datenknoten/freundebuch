import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCirclesTools } from './tools/circles.js';
import { registerCollectivesTools } from './tools/collectives.js';
import { registerEncountersTools } from './tools/encounters.js';
import { registerFriendsTools } from './tools/friends.js';
import type { Services } from './utils/service-factory.js';

const require = createRequire(import.meta.url);
// biome-ignore lint/correctness/useImportExtensions: package.json is correct, not package.js
const pkg: Record<string, unknown> = require('../package.json');
const serverVersion = typeof pkg.version === 'string' ? pkg.version : 'unknown';

export function createMcpServer(services: Services, getUserId: () => string): McpServer {
  const server = new McpServer({
    name: 'freundebuch',
    version: serverVersion,
  });

  registerFriendsTools(server, services, getUserId);
  registerCirclesTools(server, services, getUserId);
  registerCollectivesTools(server, services, getUserId);
  registerEncountersTools(server, services, getUserId);

  return server;
}
