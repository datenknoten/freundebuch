import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  MAX_FILE_SIZE,
  PHOTO_VALIDATION_ERRORS,
  PhotoMimeTypeSchema,
  type PhotoUploadResponse,
  THUMBNAIL_SIZE,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import type { Logger } from 'pino';
import sharp, { type Sharp } from 'sharp';
import type { Config } from '../config.js';
import { PhotoUploadError } from '../errors/photo-upload.error.js';
import { isNodeError } from '../utils/is-node-error.js';
import { isPathWithinBase } from '../utils/is-path-within-base.js';
import { isValidUuid } from '../utils/is-valid-uuid.js';

/**
 * Maximum number of pixels sharp will decode (50 MP ≈ 8660x5773). Well above
 * any phone camera, far below what a decompression bomb asks for.
 */
const MAX_IMAGE_PIXELS = 50_000_000;

export type PhotoConfig = Pick<Config, 'BACKEND_URL' | 'UPLOAD_DIR'>;

export interface PhotoServiceOptions {
  logger: Logger;
  config: PhotoConfig;
}

export class PhotoService {
  private readonly logger: Logger;
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(options: PhotoServiceOptions) {
    this.logger = options.logger;
    this.uploadDir = options.config.UPLOAD_DIR;
    this.baseUrl = `${options.config.BACKEND_URL}/api/uploads/friends`;
  }

  public async uploadPhoto(friendExternalId: string, file: File) {
    this.logger.debug({ friendExternalId, fileName: file.name }, 'Processing photo upload');

    // Defense-in-depth: Validate friendExternalId is a valid UUID
    if (isValidUuid(friendExternalId) === false) {
      throw new PhotoUploadError('Invalid friend ID', 'INVALID_FRIEND_ID');
    }

    // Defense-in-depth: Verify path stays within upload directory
    const friendDir = path.join(this.uploadDir, friendExternalId);
    if (isPathWithinBase(this.uploadDir, friendExternalId) === false) {
      this.logger.warn({ friendExternalId }, 'Path traversal attempt detected');
      throw new PhotoUploadError('Invalid friend ID', 'INVALID_FRIEND_ID');
    }

    const mimeTypeResult = PhotoMimeTypeSchema(file.type);
    if (mimeTypeResult instanceof type.errors) {
      throw new PhotoUploadError(PHOTO_VALIDATION_ERRORS.INVALID_FILE_TYPE, 'INVALID_FILE_TYPE');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new PhotoUploadError(PHOTO_VALIDATION_ERRORS.FILE_TOO_LARGE, 'FILE_TOO_LARGE');
    }

    await mkdir(friendDir, { recursive: true });

    const ext = this.getExtension(file.type);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate it's actually an image using sharp. `limitInputPixels` caps the
    // decoded surface: a small, highly compressed file can otherwise expand to
    // gigabytes of pixels (decompression bomb).
    let image: Sharp;
    try {
      image = sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS, sequentialRead: true });
      await image.metadata();
    } catch {
      throw new PhotoUploadError(PHOTO_VALIDATION_ERRORS.INVALID_IMAGE, 'INVALID_IMAGE');
    }

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
      throw new PhotoUploadError(PHOTO_VALIDATION_ERRORS.INVALID_IMAGE, 'INVALID_IMAGE');
    }

    // Filesystem errors propagate with their errno, so index.ts turns them
    // into a 500 and captures them.
    await writeFile(originalPath, original);
    await writeFile(thumbnailPath, thumbnail);

    this.logger.info({ friendExternalId }, 'Photo uploaded successfully');

    return {
      photoUrl: `${this.baseUrl}/${friendExternalId}/${originalFilename}`,
      photoThumbnailUrl: `${this.baseUrl}/${friendExternalId}/${thumbnailFilename}`,
    } satisfies PhotoUploadResponse;
  }

  public async deletePhoto(friendExternalId: string) {
    this.logger.debug({ friendExternalId }, 'Deleting friend photos');

    // Defense-in-depth: Validate friendExternalId is a valid UUID
    if (isValidUuid(friendExternalId) === false) {
      throw new PhotoUploadError('Invalid friend ID', 'INVALID_FRIEND_ID');
    }

    // Defense-in-depth: Verify path stays within upload directory
    if (isPathWithinBase(this.uploadDir, friendExternalId) === false) {
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
      if (isNodeError(error) === false || error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /** The uploads directory, for serving static files. */
  public getUploadDir() {
    return this.uploadDir;
  }

  private getExtension(mimeType: string) {
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
  private getFormat(mimeType: string) {
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
