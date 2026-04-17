import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Services } from '../utils/service-factory.js';

export function registerCollectivesTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  server.tool(
    'list_collectives',
    'List all collectives (families, companies, clubs, friend groups) with pagination. Each collective includes a member preview showing the first few members.',
    {
      page: z.number().int().min(1).default(1).describe('Page number (1-based)'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe('Number of collectives per page'),
      typeId: z.string().uuid().optional().describe('Filter by collective type ID (UUID)'),
      search: z.string().optional().describe('Search by collective name'),
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

  server.tool(
    'get_collective',
    'Get complete details for a single collective including all members with their roles, addresses, phones, emails, URLs, and circle memberships.',
    {
      collectiveId: z.string().uuid().describe('The collective ID (UUID)'),
    },
    async ({ collectiveId }) => {
      const collective = await services.collectives.getCollectiveById(getUserId(), collectiveId);
      if (!collective) {
        return { content: [{ type: 'text' as const, text: 'Collective not found.' }] };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(collective, null, 2) }],
      };
    },
  );
}
