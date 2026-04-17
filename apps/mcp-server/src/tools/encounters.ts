import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Services } from '../utils/service-factory.js';

export function registerEncountersTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  server.tool(
    'list_encounters',
    'List encounters (meetings, events, interactions) with pagination and filtering. Can filter by friend, date range, or search text. Each encounter shows the title, date, location, and a preview of associated friends.',
    {
      page: z.number().int().min(1).default(1).describe('Page number (1-based)'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe('Number of encounters per page'),
      friendId: z
        .string()
        .uuid()
        .optional()
        .describe('Filter to encounters with a specific friend'),
      fromDate: z
        .string()
        .optional()
        .describe('Filter encounters from this date (ISO 8601 format, e.g. "2024-01-01")'),
      toDate: z
        .string()
        .optional()
        .describe('Filter encounters up to this date (ISO 8601 format, e.g. "2024-12-31")'),
      search: z.string().optional().describe('Search by encounter title, description, or location'),
    },
    async ({ page, pageSize, friendId, fromDate, toDate, search }) => {
      const result = await services.encounters.listEncounters(getUserId(), {
        page,
        pageSize,
        friendId,
        fromDate,
        toDate,
        search,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_encounter',
    'Get complete details for a single encounter including its title, date, location, description, and all associated friends.',
    {
      encounterId: z.string().uuid().describe('The encounter ID (UUID)'),
    },
    async ({ encounterId }) => {
      const encounter = await services.encounters.getEncounterById(getUserId(), encounterId);
      if (!encounter) {
        return { content: [{ type: 'text' as const, text: 'Encounter not found.' }] };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(encounter, null, 2) }],
      };
    },
  );
}
