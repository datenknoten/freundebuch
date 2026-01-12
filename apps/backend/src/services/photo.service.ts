import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  MAX_FILE_SIZE,
  PhotoMimeTypeSchema,
  type PhotoUploadResult,
  PhotoValidationErrors,
  THUMBNAIL_SIZE,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import type { Logger } from 'pino';
import sharp from 'sharp';
import { getConfig } from '../utils/config.js';
import { isPathWithinBase, isValidUuid } from '../utils/security.js';

export class PhotoService {
  private logger: Logger;
  private uploadDir: string;
  private baseUrl: string;

  constructor(logger: Logger) {
    this.logger = logger;
    const config = getConfig();
    // Use environment variable or default to local uploads directory
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'contacts');
    this.baseUrl = `${config.BACKEND_URL}/api/uploads/friends`;
  }

  /**
   * Validate and process an uploaded photo
   */
  async uploadPhoto(friendExternalId: string, file: File): Promise<PhotoUploadResult> {
    this.logger.debug({ friendExternalId, fileName: file.name }, 'Processing photo upload');

    // Defense-in-depth: Validate friendExternalId is a valid UUID
    if (!isValidUuid(friendExternalId)) {
      throw new PhotoUploadError('Invalid friend ID', 'INVALID_FRIEND_ID');
    }

    // Defense-in-depth: Verify path stays within upload directory
    const friendDir = path.join(this.uploadDir, friendExternalId);
    if (!isPathWithinBase(this.uploadDir, friendExternalId)) {
      this.logger.warn({ friendExternalId }, 'Path traversal attempt detected');
      throw new PhotoUploadError('Invalid friend ID', 'INVALID_FRIEND_ID');
    }

    // Validate file type using ArkType schema
    const mimeTypeResult = PhotoMimeTypeSchema(file.type);
    if (mimeTypeResult instanceof type.errors) {
      throw new PhotoUploadError(PhotoValidationErrors.INVALID_FILE_TYPE, 'INVALID_FILE_TYPE');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new PhotoUploadError(PhotoValidationErrors.FILE_TOO_LARGE, 'FILE_TOO_LARGE');
    }

    // Create directory for friend photos
    await mkdir(friendDir, { recursive: true });

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
      throw new PhotoUploadError(PhotoValidationErrors.INVALID_IMAGE, 'INVALID_IMAGE');
    }

    // Generate filenames
    const originalFilename = `photo.${ext}`;
    const thumbnailFilename = `photo_thumb.${ext}`;
    const originalPath = path.join(friendDir, originalFilename);
    const thumbnailPath = path.join(friendDir, thumbnailFilename);

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

    this.logger.info({ friendExternalId }, 'Photo uploaded successfully');

    return {
      photoUrl: `${this.baseUrl}/${friendExternalId}/${originalFilename}`,
      photoThumbnailUrl: `${this.baseUrl}/${friendExternalId}/${thumbnailFilename}`,
    };
  }

  /**
   * Delete a friend's photos
   */
  async deletePhoto(friendExternalId: string): Promise<void> {
    this.logger.debug({ friendExternalId }, 'Deleting friend photos');

    // Defense-in-depth: Validate friendExternalId is a valid UUID
    if (!isValidUuid(friendExternalId)) {
      throw new PhotoUploadError('Invalid friend ID', 'INVALID_FRIEND_ID');
    }

    // Defense-in-depth: Verify path stays within upload directory
    if (!isPathWithinBase(this.uploadDir, friendExternalId)) {
      this.logger.warn({ friendExternalId }, 'Path traversal attempt detected');
      throw new PhotoUploadError('Invalid friend ID', 'INVALID_FRIEND_ID');
    }

    const friendDir = path.join(this.uploadDir, friendExternalId);

    try {
      await stat(friendDir);
      await rm(friendDir, { recursive: true });
      this.logger.info({ friendExternalId }, 'Photos deleted successfully');
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
