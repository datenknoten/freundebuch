import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Logger } from 'pino';
import sharp from 'sharp';
import { getConfig } from '../utils/config.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const THUMBNAIL_SIZE = 200;

export interface PhotoUploadResult {
  photoUrl: string;
  photoThumbnailUrl: string;
}

export class PhotoService {
  private logger: Logger;
  private uploadDir: string;
  private baseUrl: string;

  constructor(logger: Logger) {
    this.logger = logger;
    const config = getConfig();
    // Use environment variable or default to local uploads directory
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'contacts');
    this.baseUrl = `${config.FRONTEND_URL}/api/uploads/contacts`;
  }

  /**
   * Validate and process an uploaded photo
   */
  async uploadPhoto(contactExternalId: string, file: File): Promise<PhotoUploadResult> {
    this.logger.debug({ contactExternalId, fileName: file.name }, 'Processing photo upload');

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new PhotoUploadError(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        'INVALID_FILE_TYPE',
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new PhotoUploadError(
        `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        'FILE_TOO_LARGE',
      );
    }

    // Create directory for contact photos
    const contactDir = path.join(this.uploadDir, contactExternalId);
    await mkdir(contactDir, { recursive: true });

    // Get file extension based on mime type
    const ext = this.getExtension(file.type);

    // Process the image
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate it's actually an image using sharp
    let image: sharp.Sharp;
    try {
      image = sharp(buffer);
      await image.metadata();
    } catch {
      throw new PhotoUploadError('Invalid image file', 'INVALID_IMAGE');
    }

    // Generate filenames
    const originalFilename = `photo.${ext}`;
    const thumbnailFilename = `photo_thumb.${ext}`;
    const originalPath = path.join(contactDir, originalFilename);
    const thumbnailPath = path.join(contactDir, thumbnailFilename);

    // Save original (with reasonable max dimensions to prevent abuse)
    await image
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFile(originalPath);

    // Generate and save thumbnail
    await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .toFile(thumbnailPath);

    this.logger.info({ contactExternalId }, 'Photo uploaded successfully');

    return {
      photoUrl: `${this.baseUrl}/${contactExternalId}/${originalFilename}`,
      photoThumbnailUrl: `${this.baseUrl}/${contactExternalId}/${thumbnailFilename}`,
    };
  }

  /**
   * Delete a contact's photos
   */
  async deletePhoto(contactExternalId: string): Promise<void> {
    this.logger.debug({ contactExternalId }, 'Deleting contact photos');

    const contactDir = path.join(this.uploadDir, contactExternalId);

    try {
      await stat(contactDir);
      await rm(contactDir, { recursive: true });
      this.logger.info({ contactExternalId }, 'Photos deleted successfully');
    } catch (error) {
      // Directory doesn't exist, that's fine
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Get the uploads directory path for serving static files
   */
  getUploadDir(): string {
    return this.uploadDir;
  }

  private getExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpg';
    }
  }
}

export class PhotoUploadError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'PhotoUploadError';
    this.code = code;
  }
}
