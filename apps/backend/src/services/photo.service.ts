import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
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
import { AppError } from '../utils/errors.js';
import { isPathWithinBase, isValidUuid } from '../utils/security.js';
import { isNodeError } from '../utils/type-guards.js';

/**
 * Maximum number of pixels sharp will decode (50 MP ≈ 8660x5773). Well above
 * any phone camera, far below what a decompression bomb asks for.
 */
const MAX_IMAGE_PIXELS = 50_000_000;

export interface PhotoServiceOptions {
  logger: Logger;
}

export class PhotoService {
  private logger: Logger;
  private uploadDir: string;
  private baseUrl: string;

  constructor(options: PhotoServiceOptions) {
    this.logger = options.logger;
    const config = getConfig();
    // Use environment variable or default to local uploads directory
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'friends');
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

    // Validate it's actually an image using sharp. `limitInputPixels` caps the
    // decoded surface: a small, highly compressed file can otherwise expand to
    // gigabytes of pixels (decompression bomb).
    let image: sharp.Sharp;
    try {
      image = sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS, sequentialRead: true });
      await image.metadata();
    } catch {
      throw new PhotoUploadError(PhotoValidationErrors.INVALID_IMAGE, 'INVALID_IMAGE');
    }

    // Generate filenames
    const originalFilename = `photo.${ext}`;
    const thumbnailFilename = `photo_thumb.${ext}`;
    const originalPath = path.join(friendDir, originalFilename);
    const thumbnailPath = path.join(friendDir, thumbnailFilename);

    // Decode both outputs into memory first, then write. Keeping the two
    // failure modes apart is the point: sharp rejects with a plain Error (no
    // errno) for a bad image, so a filesystem failure inside toFile() - a
    // read-only uploads mount, ENOSPC - used to be reported to the client as
    // `400 Invalid image file` and never reached Sentry.
    //
    // metadata() only reads the header, so a truncated or lying file (an IHDR
    // that claims 20000x20000) fails here, at decode time. That is a bad
    // upload, not a server fault.
    //
    // toFormat() pins the encoder that toFile() used to pick from the
    // extension, so the bytes on disk still match the filename.
    const format = this.getFormat(file.type);
    let original: Buffer;
    let thumbnail: Buffer;
    try {
      [original, thumbnail] = await Promise.all([
        // Reasonable max dimensions to prevent abuse. Both outputs clone the
        // one decoded pipeline instead of decoding twice.
        image
          .clone()
          .resize(2000, 2000, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toFormat(format)
          .toBuffer(),
        image
          .clone()
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
            fit: 'cover',
            position: 'center',
          })
          .toFormat(format)
          .toBuffer(),
      ]);
    } catch {
      throw new PhotoUploadError(PhotoValidationErrors.INVALID_IMAGE, 'INVALID_IMAGE');
    }

    // Filesystem errors propagate with their errno, so index.ts turns them
    // into a 500 and captures them.
    await writeFile(originalPath, original);
    await writeFile(thumbnailPath, thumbnail);

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
      if (!isNodeError(error) || error.code !== 'ENOENT') {
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

  /**
   * The sharp encoder matching getExtension(). toFile() derives the format
   * from the filename; writing buffers has to pin it explicitly, or a
   * mislabelled upload would land as e.g. JPEG bytes in a `.png` file.
   */
  private getFormat(mimeType: string): 'jpeg' | 'png' | 'webp' {
    switch (mimeType) {
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpeg';
    }
  }
}

export class PhotoUploadError extends AppError {
  readonly statusCode = 400;

  constructor(message: string, errorCode: string) {
    super(message, { code: errorCode });
  }
}
