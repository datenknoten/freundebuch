import { PhotoValidationErrors } from '@freundebuch/shared/index.js';
import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoService, PhotoUploadError } from '../../src/services/photo.service.js';

// Valid UUID v4 for tests
const VALID_CONTACT_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_CONTACT_ID_2 = '6ba7b810-9dad-41d4-80b5-ec8bdd0e9ef0';

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 1000, height: 1000 }),
    resize: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn(),
}));

// Mock config
vi.mock('../../src/utils/config.js', () => ({
  getConfig: vi.fn(() => ({
    FRONTEND_URL: 'http://localhost:5173',
    BACKEND_URL: 'http://localhost:3000',
  })),
}));

describe('PhotoService', () => {
  let photoService: PhotoService;
  let mockLogger: pino.Logger;

  beforeEach(() => {
    vi.stubEnv('UPLOAD_DIR', '/tmp/test-uploads');

    mockLogger = pino({ level: 'silent' });
    photoService = new PhotoService(mockLogger);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('uploadPhoto', () => {
    it('should reject invalid file type (GIF)', async () => {
      const mockFile = new File(['fake gif data'], 'photo.gif', { type: 'image/gif' });

      await expect(photoService.uploadPhoto(VALID_CONTACT_ID, mockFile)).rejects.toThrow(
        PhotoUploadError,
      );

      await expect(photoService.uploadPhoto(VALID_CONTACT_ID, mockFile)).rejects.toMatchObject({
        code: 'INVALID_FILE_TYPE',
        message: PhotoValidationErrors.INVALID_FILE_TYPE,
      });
    });

    it('should reject invalid file type (BMP)', async () => {
      const mockFile = new File(['fake bmp data'], 'photo.bmp', { type: 'image/bmp' });

      await expect(photoService.uploadPhoto(VALID_CONTACT_ID, mockFile)).rejects.toThrow(
        PhotoUploadError,
      );

      await expect(photoService.uploadPhoto(VALID_CONTACT_ID, mockFile)).rejects.toMatchObject({
        code: 'INVALID_FILE_TYPE',
      });
    });

    it('should reject file exceeding size limit', async () => {
      const mockFile = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      // Mock the size property to be over 5MB
      Object.defineProperty(mockFile, 'size', { value: 10 * 1024 * 1024 }); // 10MB

      await expect(photoService.uploadPhoto(VALID_CONTACT_ID, mockFile)).rejects.toThrow(
        PhotoUploadError,
      );

      await expect(photoService.uploadPhoto(VALID_CONTACT_ID, mockFile)).rejects.toMatchObject({
        code: 'FILE_TOO_LARGE',
        message: PhotoValidationErrors.FILE_TOO_LARGE,
      });
    });

    it('should reject file just over the size limit', async () => {
      const mockFile = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      // Mock the size property to be just over 5MB
      Object.defineProperty(mockFile, 'size', { value: 5 * 1024 * 1024 + 1 });

      await expect(photoService.uploadPhoto(VALID_CONTACT_ID, mockFile)).rejects.toThrow(
        PhotoUploadError,
      );

      await expect(photoService.uploadPhoto(VALID_CONTACT_ID, mockFile)).rejects.toMatchObject({
        code: 'FILE_TOO_LARGE',
      });
    });

    it('should accept valid JPEG file', async () => {
      const mockFile = new File(['fake jpeg data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }); // 1MB

      const result = await photoService.uploadPhoto(VALID_CONTACT_ID, mockFile);

      expect(result).toHaveProperty('photoUrl');
      expect(result).toHaveProperty('photoThumbnailUrl');
      expect(result.photoUrl).toContain(VALID_CONTACT_ID);
      expect(result.photoUrl).toContain('.jpg');
      expect(result.photoThumbnailUrl).toContain('thumb');
    });

    it('should accept valid PNG file', async () => {
      const mockFile = new File(['fake png data'], 'photo.png', { type: 'image/png' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 });

      const result = await photoService.uploadPhoto(VALID_CONTACT_ID, mockFile);

      expect(result.photoUrl).toContain('.png');
    });

    it('should accept valid WebP file', async () => {
      const mockFile = new File(['fake webp data'], 'photo.webp', { type: 'image/webp' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 });

      const result = await photoService.uploadPhoto(VALID_CONTACT_ID, mockFile);

      expect(result.photoUrl).toContain('.webp');
    });

    it('should accept file at exactly the size limit', async () => {
      const mockFile = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 5 * 1024 * 1024 }); // Exactly 5MB

      const result = await photoService.uploadPhoto(VALID_CONTACT_ID, mockFile);

      expect(result).toHaveProperty('photoUrl');
    });

    it('should create directory for contact photos', async () => {
      const { mkdir } = await import('node:fs/promises');
      const mockFile = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      await photoService.uploadPhoto(VALID_CONTACT_ID, mockFile);

      expect(mkdir).toHaveBeenCalledWith(expect.stringContaining(VALID_CONTACT_ID), {
        recursive: true,
      });
    });

    it('should return URLs with correct format', async () => {
      const mockFile = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      const result = await photoService.uploadPhoto(VALID_CONTACT_ID_2, mockFile);

      expect(result.photoUrl).toBe(
        `http://localhost:3000/api/uploads/contacts/${VALID_CONTACT_ID_2}/photo.jpg`,
      );
      expect(result.photoThumbnailUrl).toBe(
        `http://localhost:3000/api/uploads/contacts/${VALID_CONTACT_ID_2}/photo_thumb.jpg`,
      );
    });

    it('should reject invalid contact ID (path traversal attempt)', async () => {
      const mockFile = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      await expect(photoService.uploadPhoto('../../../etc', mockFile)).rejects.toThrow(
        PhotoUploadError,
      );

      await expect(photoService.uploadPhoto('../../../etc', mockFile)).rejects.toMatchObject({
        code: 'INVALID_CONTACT_ID',
      });
    });

    it('should reject non-UUID contact ID', async () => {
      const mockFile = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      await expect(photoService.uploadPhoto('not-a-uuid', mockFile)).rejects.toThrow(
        PhotoUploadError,
      );

      await expect(photoService.uploadPhoto('not-a-uuid', mockFile)).rejects.toMatchObject({
        code: 'INVALID_CONTACT_ID',
      });
    });
  });

  describe('deletePhoto', () => {
    it('should delete existing photo directory', async () => {
      const { stat, rm } = await import('node:fs/promises');
      vi.mocked(stat).mockResolvedValue({} as any);

      await photoService.deletePhoto(VALID_CONTACT_ID);

      expect(rm).toHaveBeenCalledWith(expect.stringContaining(VALID_CONTACT_ID), {
        recursive: true,
      });
    });

    it('should handle non-existent directory gracefully', async () => {
      const { stat } = await import('node:fs/promises');
      vi.mocked(stat).mockRejectedValue({ code: 'ENOENT' });

      await expect(photoService.deletePhoto(VALID_CONTACT_ID_2)).resolves.not.toThrow();
    });

    it('should throw on other file system errors', async () => {
      const { stat } = await import('node:fs/promises');
      vi.mocked(stat).mockRejectedValue({ code: 'EACCES' });

      await expect(photoService.deletePhoto(VALID_CONTACT_ID)).rejects.toMatchObject({
        code: 'EACCES',
      });
    });

    it('should reject invalid contact ID (path traversal attempt)', async () => {
      await expect(photoService.deletePhoto('../../../etc')).rejects.toThrow(PhotoUploadError);

      await expect(photoService.deletePhoto('../../../etc')).rejects.toMatchObject({
        code: 'INVALID_CONTACT_ID',
      });
    });

    it('should reject non-UUID contact ID', async () => {
      await expect(photoService.deletePhoto('not-a-uuid')).rejects.toThrow(PhotoUploadError);

      await expect(photoService.deletePhoto('not-a-uuid')).rejects.toMatchObject({
        code: 'INVALID_CONTACT_ID',
      });
    });
  });

  describe('getUploadDir', () => {
    it('should return configured upload directory', () => {
      const dir = photoService.getUploadDir();

      expect(dir).toBe('/tmp/test-uploads');
    });
  });
});

describe('PhotoUploadError', () => {
  it('should create error with message and code', () => {
    const error = new PhotoUploadError('Test error', 'TEST_CODE');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('PhotoUploadError');
  });

  it('should be an instance of Error', () => {
    const error = new PhotoUploadError('Test error', 'TEST_CODE');

    expect(error).toBeInstanceOf(Error);
  });
});
