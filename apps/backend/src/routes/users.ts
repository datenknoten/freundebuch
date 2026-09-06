import { FriendCreateSchema, SetSelfProfileSchema } from '@freundebuch/shared/index.js';
import { type Context, Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { UsersService } from '../services/users.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/http.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all user routes
app.use('*', authMiddleware);

const usersService = (c: Context<AppContext>): UsersService =>
  new UsersService({ db: c.get('db'), logger: c.get('logger') });

/**
 * GET /api/users/me
 * Get the current user's profile
 */
app.get('/me', async (c) => {
  return c.json(await usersService(c).getMe(getAuthUser(c).userId));
});

// ============================================================================
// Self-Profile Routes (for onboarding)
// ============================================================================

/**
 * GET /api/users/me/self-profile
 * Get the current user's self-profile external ID
 */
app.get('/me/self-profile', async (c) => {
  const selfProfileId = await usersService(c).getSelfProfileId(getAuthUser(c).userId);
  return c.json({ selfProfileId });
});

/**
 * PUT /api/users/me/self-profile
 * Set an existing friend as the user's self-profile
 */
app.put('/me/self-profile', async (c) => {
  const { friendId } = await parseBody(c, SetSelfProfileSchema);
  const selfProfileId = await usersService(c).setSelfProfile(getAuthUser(c).userId, friendId);

  return c.json({ selfProfileId });
});

/**
 * POST /api/users/me/self-profile
 * Create a new friend and set it as the user's self-profile
 * Used during onboarding
 */
app.post('/me/self-profile', async (c) => {
  const input = await parseBody(c, FriendCreateSchema);
  const friend = await usersService(c).createSelfProfile(getAuthUser(c).userId, input);

  return c.json(friend, 201);
});

export default app;
