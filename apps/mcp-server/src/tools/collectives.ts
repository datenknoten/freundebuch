import type { McpServer } from '@modelcontextprotocol/server';
import { type } from 'arktype';
import type { Services } from '../utils/service-factory.js';

export function registerCollectivesTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  server.registerTool(
    'list_collectives',
    {
      description:
        'List all collectives (families, companies, clubs, friend groups) with pagination. Each collective includes a member preview showing the first few members.',
      inputSchema: type({
        page: type('number.integer >= 1').describe('Page number (1-based)', 'self').default(1),
        pageSize: type('1 <= number.integer <= 100')
          .describe('Number of collectives per page', 'self')
          .default(20),
        'typeId?': type('string.uuid').describe('Filter by collective type ID (UUID)', 'self'),
        'search?': type('string').describe('Search by collective name', 'self'),
      }),
    },
    async ({ page, pageSize, typeId, search }) => {
      const result = await services.collectives.listCollectives(getUserId(), {
        page,
        pageSize,
        typeId,
        search,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'get_collective',
    {
      description:
        'Get complete details for a single collective including all members with their roles, addresses, phones, emails, URLs, and circle memberships.',
      inputSchema: type({
        collectiveId: type('string.uuid').describe('The collective ID (UUID)', 'self'),
      }),
    },
    async ({ collectiveId }) => {
      const collective = await services.collectives.findCollective(getUserId(), collectiveId);
      if (collective === undefined) {
        return { content: [{ type: 'text' as const, text: 'Collective not found.' }] };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(collective, null, 2) }],
      };
    },
  );
}
