import {
  type ContactCreateInput,
  ContactCreateSchema,
  type ErrorResponse,
  UpdateProfileRequestSchema,
  type User,
} from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import {
  getUserByEmailWithSelfContact,
  getUserSelfContact,
  setUserSelfContact,
  updateUserReturningWithSelfContact,
} from '../models/queries/users.queries.js';
import { ContactsService } from '../services/contacts.service.js';
import type { AppContext } from '../types/context.js';
import { toError } from '../utils/errors.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all user routes
app.use('*', authMiddleware);

/**
 * GET /api/users/me
 * Get the current user's profile
 */
app.get('/me', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    // Single query to get user with self-contact info
    const [user] = await getUserByEmailWithSelfContact.run({ email: authUser.email }, db);

    if (!user) {
      logger.error({ userId: authUser.userId }, 'User not found');
      return c.json<ErrorResponse>({ error: 'User not found' }, 404);
    }

    const selfContactExternalId = user.self_contact_external_id;

    return c.json<User>({
      externalId: user.external_id,
      email: user.email,
      createdAt: user.created_at.toISOString(),
      updatedAt: user.updated_at.toISOString(),
      selfContactId: selfContactExternalId ?? undefined,
      hasCompletedOnboarding: selfContactExternalId !== null,
    });
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to get user profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get user profile' }, 500);
  }
});

/**
 * PUT /api/users/me
 * Update the current user's profile
 */
app.put('/me', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    const body = await c.req.json();
    const validated = UpdateProfileRequestSchema(body);

    if (validated instanceof type.errors) {
      logger.warn({ body, errors: validated }, 'Invalid update profile request');
      return c.json<ErrorResponse>(
        {
          error: 'Invalid request',
          details: validated,
        },
        400,
      );
    }

    // If no email update, return current user (single query)
    if (!validated.email) {
      const [user] = await getUserByEmailWithSelfContact.run({ email: authUser.email }, db);

      if (!user) {
        return c.json<ErrorResponse>({ error: 'User not found' }, 404);
      }

      const selfContactExternalId = user.self_contact_external_id;

      return c.json<User>({
        externalId: user.external_id,
        email: user.email,
        createdAt: user.created_at.toISOString(),
        updatedAt: user.updated_at.toISOString(),
        selfContactId: selfContactExternalId ?? undefined,
        hasCompletedOnboarding: selfContactExternalId !== null,
      });
    }

    // Update user email and return with self-contact info (single query)
    const [updatedUser] = await updateUserReturningWithSelfContact.run(
      {
        externalId: authUser.userId,
        email: validated.email,
      },
      db,
    );

    if (!updatedUser) {
      logger.error({ userId: authUser.userId }, 'Failed to update user');
      return c.json<ErrorResponse>({ error: 'Failed to update user' }, 500);
    }

    logger.info({ userId: authUser.userId, newEmail: validated.email }, 'User profile updated');

    const selfContactExternalId = updatedUser.self_contact_external_id;

    return c.json<User>({
      externalId: updatedUser.external_id,
      email: updatedUser.email,
      createdAt: updatedUser.created_at.toISOString(),
      updatedAt: updatedUser.updated_at.toISOString(),
      selfContactId: selfContactExternalId ?? undefined,
      hasCompletedOnboarding: selfContactExternalId !== null,
    });
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to update user profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update user profile' }, 500);
  }
});

// ============================================================================
// Self-Contact Routes (for onboarding)
// ============================================================================

/**
 * GET /api/users/me/self-contact
 * Get the current user's self-contact external ID
 */
app.get('/me/self-contact', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    const result = await getUserSelfContact.run({ userExternalId: authUser.userId }, db);
    const selfContactExternalId = result[0]?.self_contact_external_id ?? null;

    return c.json({ selfContactId: selfContactExternalId });
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to get self-contact');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get self-contact' }, 500);
  }
});

/**
 * PUT /api/users/me/self-contact
 * Set an existing contact as the user's self-contact
 */
app.put('/me/self-contact', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    const body = await c.req.json();

    const SetSelfContactSchema = type({ contactId: 'string.uuid' });
    const validated = SetSelfContactSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const result = await setUserSelfContact.run(
      {
        userExternalId: authUser.userId,
        contactExternalId: validated.contactId,
      },
      db,
    );

    if (result.length === 0) {
      return c.json<ErrorResponse>({ error: 'Contact not found or does not belong to user' }, 404);
    }

    logger.info(
      { userId: authUser.userId, contactId: validated.contactId },
      'Self-contact set successfully',
    );

    return c.json({ selfContactId: result[0]?.self_contact_external_id });
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to set self-contact');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to set self-contact' }, 500);
  }
});

/**
 * POST /api/users/me/self-contact
 * Create a new contact and set it as the user's self-contact
 * Used during onboarding
 */
app.post('/me/self-contact', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    const body = await c.req.json();

    const validated = ContactCreateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    // Check if user already has a self-contact
    const existingResult = await getUserSelfContact.run({ userExternalId: authUser.userId }, db);
    if (existingResult[0]?.self_contact_external_id) {
      return c.json<ErrorResponse>({ error: 'Self-contact already exists' }, 409);
    }

    // Create the contact
    const contactsService = new ContactsService(db, logger);
    const newContact = await contactsService.createContact(
      authUser.userId,
      validated as ContactCreateInput,
    );

    // Set it as the self-contact
    const setResult = await setUserSelfContact.run(
      {
        userExternalId: authUser.userId,
        contactExternalId: newContact.id,
      },
      db,
    );

    if (setResult.length === 0) {
      logger.error(
        { userId: authUser.userId, contactId: newContact.id },
        'Failed to set self-contact after creation',
      );
      return c.json<ErrorResponse>({ error: 'Failed to set self-contact' }, 500);
    }

    logger.info(
      { userId: authUser.userId, contactId: newContact.id },
      'Self-contact created and set successfully',
    );

    return c.json(newContact, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to create self-contact');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to create self-contact' }, 500);
  }
});

export default app;
