import type { McpServer } from '@modelcontextprotocol/server';
import { type } from 'arktype';
import type { Services } from '../utils/service-factory.js';
import { jsonResult, textResult } from './tool-result.js';

const GetCircleInputSchema = type({
  circleId: type('string.uuid').describe('The circle ID (UUID)', 'self'),
});

export function registerCirclesTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  async function listCircles() {
    return jsonResult(await services.circles.listCircles(getUserId()));
  }

  async function getCircle({ circleId }: typeof GetCircleInputSchema.infer) {
    const circle = await services.circles.findCircle(getUserId(), circleId);
    if (circle === undefined) {
      return textResult('Circle not found.');
    }
    return jsonResult(circle);
  }

  server.registerTool(
    'list_circles',
    {
      description:
        'List all circles (categorization groups) for the user. Each circle has a name, color, and friend count. Circles are used to organize friends into groups.',
    },
    listCircles,
  );

  server.registerTool(
    'get_circle',
    {
      description:
        'Get details for a single circle including its name, color, description, and friend count.',
      inputSchema: GetCircleInputSchema,
    },
    getCircle,
  );
}
