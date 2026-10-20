import { ValidationError } from '@datenknoten/kit';
import { Hono } from 'hono';
import { ResourceNotFoundError } from '../../../errors/resource-not-found.error.js';
import { getAuthUser } from '../../../middleware/auth.js';
import type { CollectiveCircleService } from '../../../services/collectives/sub-resources/circle.service.js';
import type { AppContext } from '../../../types/context.js';
import { requireUuidParam } from '../../../utils/require-uuid-param.js';

export interface CollectiveCirclesRoutesOptions {
  collectiveCircleService: CollectiveCircleService;
}

export function createCollectiveCirclesRoutes(options: CollectiveCirclesRoutesOptions) {
  const { collectiveCircleService } = options;
  const app = new Hono<AppContext>();

  /**
   * GET /api/collectives/:id/circles
   * Get all circles a collective belongs to
   */
  app.get('/', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');

    const circles = await collectiveCircleService.getCircles(user.userId, collectiveId);

    return c.json(circles);
  });

  /**
   * GET /api/collectives/:id/circles/available
   * Get available circles (not already assigned to collective)
   */
  app.get('/available', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');

    const circles = await collectiveCircleService.getAvailableCircles(user.userId, collectiveId);

    return c.json(circles);
  });

  /**
   * POST /api/collectives/:id/circles/:circleId
   * Add collective to a circle
   */
  app.post('/:circleId', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id');
    const circleId = requireUuidParam(c, 'circleId');

    const isAdded = await collectiveCircleService.addToCircle(user.userId, collectiveId, circleId);

    if (!isAdded) {
      throw new ValidationError('Failed to add collective to circle');
    }

    return c.json({ message: 'Collective added to circle successfully' }, 201);
  });

  /**
   * DELETE /api/collectives/:id/circles/:circleId
   * Remove collective from a circle
   */
  app.delete('/:circleId', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id');
    const circleId = requireUuidParam(c, 'circleId');

    const isRemoved = await collectiveCircleService.removeFromCircle(
      user.userId,
      collectiveId,
      circleId,
    );

    if (!isRemoved) {
      throw new ResourceNotFoundError('Circle membership', circleId);
    }

    return c.json({ message: 'Collective removed from circle successfully' });
  });

  return app;
}
