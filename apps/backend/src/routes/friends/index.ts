import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.js';
import { onboardingMiddleware } from '../../middleware/onboarding.js';
import { friendsRateLimitMiddleware } from '../../middleware/rate-limit.js';
import type { AppContext } from '../../types/context.js';
import coreRoutes from './core.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import organizationRoutes from './organization.routes.js';
import searchRoutes from './search.routes.js';
import addressesRoutes from './sub-resources/addresses.routes.js';
import datesRoutes from './sub-resources/dates.routes.js';
import emailsRoutes from './sub-resources/emails.routes.js';
import metInfoRoutes from './sub-resources/met-info.routes.js';
import phonesRoutes from './sub-resources/phones.routes.js';
import professionalHistoryRoutes from './sub-resources/professional-history.routes.js';
import relationshipsRoutes from './sub-resources/relationships.routes.js';
import socialProfilesRoutes from './sub-resources/social-profiles.routes.js';
import urlsRoutes from './sub-resources/urls.routes.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all friend routes
app.use('*', authMiddleware);
// Apply onboarding middleware to require self-friend before using friends
app.use('*', onboardingMiddleware);
// Apply rate limiting to all friend routes
app.use('*', friendsRateLimitMiddleware);

// Dashboard routes (must be before /:id to avoid being caught by wildcard)
app.route('/', dashboardRoutes);

// Search routes (must be before /:id to avoid being caught by wildcard)
app.route('/search', searchRoutes);

// Core friend CRUD routes
app.route('/', coreRoutes);

// Organization routes (photos, circles, favorites, archive)
app.route('/', organizationRoutes);

// Sub-resource routes - mounted under /:id
app.route('/:id/phones', phonesRoutes);
app.route('/:id/emails', emailsRoutes);
app.route('/:id/addresses', addressesRoutes);
app.route('/:id/urls', urlsRoutes);
app.route('/:id/dates', datesRoutes);
app.route('/:id/met-info', metInfoRoutes);
app.route('/:id/social-profiles', socialProfilesRoutes);
app.route('/:id/relationships', relationshipsRoutes);
app.route('/:id/professional-history', professionalHistoryRoutes);

export default app;
