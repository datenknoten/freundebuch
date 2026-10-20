import { ValidationError } from '@datenknoten/kit';
import {
  type CircleInput,
  CircleInputSchema,
  CircleMergeInputSchema,
  CircleReorderInputSchema,
} from '@freundebuch/shared/index.js';
import { Hono, type MiddlewareHandler } from 'hono';
import { etag } from 'hono/etag';
import { getAuthUser } from '../middleware/auth.js';
import type { CirclesService } from '../services/circles.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/parse-body.js';
import { requireUuidParam } from '../utils/require-uuid-param.js';

function mapCircleInput(input: CircleInput) {
  return {
    name: input.name,
    ...(input.color === undefined ? {} : { color: input.color }),
    ...(input.parent_circle_id === undefined ? {} : { parentCircleId: input.parent_circle_id }),
    ...(input.sort_order === undefined ? {} : { sortOrder: input.sort_order }),
  };
}

export interface CirclesRoutesOptions {
  circlesService: CirclesService;
  authMiddleware: MiddlewareHandler<AppContext>;
  onboardingMiddleware: MiddlewareHandler<AppContext>;
  rateLimitMiddleware: MiddlewareHandler<AppContext>;
}

export function createCirclesRoutes(options: CirclesRoutesOptions) {
  const { circlesService, authMiddleware, onboardingMiddleware, rateLimitMiddleware } = options;
  const app = new Hono<AppContext>();

  app.use('*', authMiddleware);
  app.use('*', rateLimitMiddleware);
  app.use('*', onboardingMiddleware);

  // The ETag lets warm reloads revalidate cheaply (304) without serving stale data.
  app.get('/', etag(), async (c) => {
    const user = getAuthUser(c);
    const circles = await circlesService.listCircles(user.userId);

    return c.json(circles);
  });

  app.post('/', async (c) => {
    const user = getAuthUser(c);

    const validated = await parseBody(c, CircleInputSchema);
    const circle = await circlesService.createCircle(user.userId, mapCircleInput(validated));

    return c.json(circle, 201);
  });

  // Must be defined before /:id to avoid being caught by the wildcard
  app.put('/reorder', async (c) => {
    const user = getAuthUser(c);

    const validated = await parseBody(c, CircleReorderInputSchema);
    await circlesService.reorderCircles(
      user.userId,
      validated.order.map((item) => ({ id: item.id, sortOrder: item.sort_order })),
    );

    return c.json({ success: true });
  });

  app.get('/:id', async (c) => {
    const user = getAuthUser(c);
    const circleId = requireUuidParam(c, 'id', 'circle ID');
    const circle = await circlesService.getCircle(user.userId, circleId);

    return c.json(circle);
  });

  app.put('/:id', async (c) => {
    const user = getAuthUser(c);
    const circleId = requireUuidParam(c, 'id', 'circle ID');
    const validated = await parseBody(c, CircleInputSchema);
    const circle = await circlesService.updateCircle(
      user.userId,
      circleId,
      mapCircleInput(validated),
    );

    return c.json(circle);
  });

  // Friends remain, just unassigned from this circle
  app.delete('/:id', async (c) => {
    const user = getAuthUser(c);
    const circleId = requireUuidParam(c, 'id', 'circle ID');
    await circlesService.deleteCircle(user.userId, circleId);

    return c.json({ success: true });
  });

  // Moves all friends from the source, then deletes it
  app.post('/:id/merge', async (c) => {
    const user = getAuthUser(c);
    const targetCircleId = requireUuidParam(c, 'id', 'target circle ID');
    const validated = await parseBody(c, CircleMergeInputSchema);

    if (targetCircleId === validated.source_circle_id) {
      throw new ValidationError('Cannot merge a circle into itself');
    }
    const circle = await circlesService.mergeCircles(
      user.userId,
      targetCircleId,
      validated.source_circle_id,
    );

    return c.json(circle);
  });

  return app;
}
