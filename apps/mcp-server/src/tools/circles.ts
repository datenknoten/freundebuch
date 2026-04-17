import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Services } from '../utils/service-factory.js';

export function registerCirclesTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  server.tool(
    'list_circles',
    'List all circles (categorization groups) for the user. Each circle has a name, color, and friend count. Circles are used to organize friends into groups.',
    {},
    async () => {
      const circles = await services.circles.listCircles(getUserId());
      return { content: [{ type: 'text' as const, text: JSON.stringify(circles, null, 2) }] };
    },
  );

  server.tool(
    'get_circle',
    'Get details for a single circle including its name, color, description, and friend count.',
    {
      circleId: z.string().uuid().describe('The circle ID (UUID)'),
    },
    async ({ circleId }) => {
      const circle = await services.circles.getCircleById(getUserId(), circleId);
      if (!circle) {
        return { content: [{ type: 'text' as const, text: 'Circle not found.' }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(circle, null, 2) }] };
    },
  );
}
