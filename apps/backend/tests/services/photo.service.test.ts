import { PhotoValidationErrors } from '@freundebuch/shared/index.js';
import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoService, PhotoUploadError } from '../../src/services/photo.service.js';

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

      await expect(photoService.uploadPhoto('contact-123', mockFile)).rejects.toThrow(
        PhotoUploadError,
      );

      await expect(photoService.uploadPhoto('contact-123', mockFile)).rejects.toMatchObject({
        code: 'INVALID_FILE_TYPE',
        message: PhotoValidationErrors.INVALID_FILE_TYPE,
      });
    });

    it('should reject invalid file type (BMP)', async () => {
      const mockFile = new File(['fake bmp data'], 'photo.bmp', { type: 'image/bmp' });

      await expect(photoService.uploadPhoto('contact-123', mockFile)).rejects.toThrow(
        PhotoUploadError,
      );

      await expect(photoService.uploadPhoto('contact-123', mockFile)).rejects.toMatchObject({
        code: 'INVALID_FILE_TYPE',
      });
    });

    it('should reject file exceeding size limit', async () => {
      const mockFile = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      // Mock the size property to be over 5MB
      Object.defineProperty(mockFile, 'size', { value: 10 * 1024 * 1024 }); // 10MB

      await expect(photoService.uploadPhoto('contact-123', mockFile)).rejects.toThrow(
        PhotoUploadError,
      );

      await expect(photoService.uploadPhoto('contact-123', mockFile)).rejects.toMatchObject({
        code: 'FILE_TOO_LARGE',
        message: PhotoValidationErrors.FILE_TOO_LARGE,
      });
    });

    it('should reject file just over the size limit', async () => {
      const mockFile = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      // Mock the size property to be just over 5MB
      Object.defineProperty(mockFile, 'size', { value: 5 * 1024 * 1024 + 1 });

      await expect(photoService.uploadPhoto('contact-123', mockFile)).rejects.toThrow(
        PhotoUploadError,
      );

      await expect(photoService.uploadPhoto('contact-123', mockFile)).rejects.toMatchObject({
        code: 'FILE_TOO_LARGE',
      });
    });

    it('should accept valid JPEG file', async () => {
      const mockFile = new File(['fake jpeg data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }); // 1MB

      const result = await photoService.uploadPhoto('contact-123', mockFile);

      expect(result).toHaveProperty('photoUrl');
      expect(result).toHaveProperty('photoThumbnailUrl');
      expect(result.photoUrl).toContain('contact-123');
      expect(result.photoUrl).toContain('.jpg');
      expect(result.photoThumbnailUrl).toContain('thumb');
    });

    it('should accept valid PNG file', async () => {
      const mockFile = new File(['fake png data'], 'photo.png', { type: 'image/png' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 });

      const result = await photoService.uploadPhoto('contact-123', mockFile);

      expect(result.photoUrl).toContain('.png');
    });

    it('should accept valid WebP file', async () => {
      const mockFile = new File(['fake webp data'], 'photo.webp', { type: 'image/webp' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 });

      const result = await photoService.uploadPhoto('contact-123', mockFile);

      expect(result.photoUrl).toContain('.webp');
    });

    it('should accept file at exactly the size limit', async () => {
      const mockFile = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 5 * 1024 * 1024 }); // Exactly 5MB

      const result = await photoService.uploadPhoto('contact-123', mockFile);

      expect(result).toHaveProperty('photoUrl');
    });

    it('should create directory for contact photos', async () => {
      const { mkdir } = await import('node:fs/promises');
      const mockFile = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      await photoService.uploadPhoto('new-contact', mockFile);

      expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('new-contact'), {
        recursive: true,
      });
    });

    it('should return URLs with correct format', async () => {
      const mockFile = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      const result = await photoService.uploadPhoto('contact-456', mockFile);

      expect(result.photoUrl).toBe(
        'http://localhost:3000/api/uploads/contacts/contact-456/photo.jpg',
      );
      expect(result.photoThumbnailUrl).toBe(
        'http://localhost:3000/api/uploads/contacts/contact-456/photo_thumb.jpg',
      );
    });
  });

  describe('deletePhoto', () => {
    it('should delete existing photo directory', async () => {
      const { stat, rm } = await import('node:fs/promises');
      vi.mocked(stat).mockResolvedValue({} as any);

      await photoService.deletePhoto('contact-123');

      expect(rm).toHaveBeenCalledWith(expect.stringContaining('contact-123'), {
        recursive: true,
      });
    });

    it('should handle non-existent directory gracefully', async () => {
      const { stat } = await import('node:fs/promises');
      vi.mocked(stat).mockRejectedValue({ code: 'ENOENT' });

      await expect(photoService.deletePhoto('non-existent')).resolves.not.toThrow();
    });

    it('should throw on other file system errors', async () => {
      const { stat } = await import('node:fs/promises');
      vi.mocked(stat).mockRejectedValue({ code: 'EACCES' });

      await expect(photoService.deletePhoto('contact-123')).rejects.toMatchObject({
        code: 'EACCES',
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
