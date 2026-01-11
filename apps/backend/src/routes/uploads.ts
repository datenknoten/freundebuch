import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import { ContactsService } from '../services/contacts.service.js';
import { PhotoService } from '../services/photo.service.js';
import type { AppContext } from '../types/context.js';
import { isValidUuid } from '../utils/security.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all upload routes
app.use('*', authMiddleware);
// Apply onboarding middleware to require self-contact
app.use('*', onboardingMiddleware);

/**
 * GET /api/uploads/contacts/:contactId/:filename
 * Serve uploaded contact photos (only to the owner)
 */
app.get('/contacts/:contactId/:filename', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('contactId');
  const filename = c.req.param('filename');

  // Validate contactId is a valid UUID to prevent path traversal
  if (!isValidUuid(contactId)) {
    return c.json({ error: 'Invalid contact ID' }, 400);
  }

  // Verify the user owns this contact
  const contactsService = new ContactsService(db, logger);
  const contact = await contactsService.getContactById(user.userId, contactId);

  if (!contact) {
    return c.json({ error: 'Contact not found' }, 404);
  }

  // Validate filename to prevent directory traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return c.json({ error: 'Invalid filename' }, 400);
  }

  // Only allow specific filenames
  const allowedFilenames = [
    'photo.jpg',
    'photo.png',
    'photo.webp',
    'photo_thumb.jpg',
    'photo_thumb.png',
    'photo_thumb.webp',
  ];
  if (!allowedFilenames.includes(filename)) {
    return c.json({ error: 'Invalid filename' }, 400);
  }

  const photoService = new PhotoService(logger);
  const uploadDir = photoService.getUploadDir();
  const filePath = path.join(uploadDir, contactId, filename);

  try {
    // Check if file exists
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Read and serve the file
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set cache headers for images (private to prevent shared cache leaks)
    c.header('Content-Type', contentType);
    c.header('Cache-Control', 'private, max-age=86400'); // 1 day cache, browser only
    c.header('Content-Length', fileBuffer.length.toString());

    return c.body(fileBuffer);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return c.json({ error: 'File not found' }, 404);
    }
    logger.error({ error, contactId, filename }, 'Failed to serve photo');
    return c.json({ error: 'Failed to serve file' }, 500);
  }
});

export default app;
