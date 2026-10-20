import type { McpServer } from '@modelcontextprotocol/server';
import { type } from 'arktype';
import type { Services } from '../utils/service-factory.js';

export function registerCirclesTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  server.registerTool(
    'list_circles',
    {
      description:
        'List all circles (categorization groups) for the user. Each circle has a name, color, and friend count. Circles are used to organize friends into groups.',
    },
    async () => {
      const circles = await services.circles.listCircles(getUserId());
      return { content: [{ type: 'text' as const, text: JSON.stringify(circles, null, 2) }] };
    },
  );

  server.registerTool(
    'get_circle',
    {
      description:
        'Get details for a single circle including its name, color, description, and friend count.',
      inputSchema: type({
        circleId: type('string.uuid').describe('The circle ID (UUID)', 'self'),
      }),
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
