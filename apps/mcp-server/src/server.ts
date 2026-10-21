import { createRequire } from 'node:module';
import { parseWith } from '@datenknoten/kit/schema';
import { McpServer } from '@modelcontextprotocol/server';
import { type } from 'arktype';
import { registerCirclesTools } from './tools/circles.js';
import { registerCollectivesTools } from './tools/collectives.js';
import { registerEncountersTools } from './tools/encounters.js';
import { registerFriendNotesTools } from './tools/friend-notes.js';
import { registerFriendsTools } from './tools/friends.js';
import type { Services } from './utils/service-factory.js';

const require = createRequire(import.meta.url);
const PACKAGE_JSON_PATH = '../package.json';
const { version: serverVersion } = parseWith(
  type({ version: 'string' }),
  require(PACKAGE_JSON_PATH),
);

export function createMcpServer(services: Services, getUserId: () => string) {
  const server = new McpServer({
    name: 'freundebuch',
    version: serverVersion,
  });

  registerFriendsTools(server, services, getUserId);
  registerCirclesTools(server, services, getUserId);
  registerCollectivesTools(server, services, getUserId);
  registerEncountersTools(server, services, getUserId);
  registerFriendNotesTools(server, services, getUserId);

  return server;
}
