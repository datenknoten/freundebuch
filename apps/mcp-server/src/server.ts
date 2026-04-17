import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCirclesTools } from './tools/circles.js';
import { registerCollectivesTools } from './tools/collectives.js';
import { registerEncountersTools } from './tools/encounters.js';
import { registerFriendsTools } from './tools/friends.js';
import type { Services } from './utils/service-factory.js';

export function createMcpServer(services: Services, getUserId: () => string): McpServer {
  const server = new McpServer({
    name: 'freundebuch',
    version: '2.68.2',
  });

  registerFriendsTools(server, services, getUserId);
  registerCirclesTools(server, services, getUserId);
  registerCollectivesTools(server, services, getUserId);
  registerEncountersTools(server, services, getUserId);

  return server;
}
