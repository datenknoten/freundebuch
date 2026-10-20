import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import { MAX_FILE_SIZE } from './photo-limits.js';
import { PhotoUploadMetadataSchema } from './photo-upload-metadata.js';

const VALID = { mimeType: 'image/jpeg', size: 1024, fileName: 'me.jpg' };

describe('PhotoUploadMetadataSchema', () => {
  describe('with an allowed MIME type', () => {
    it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (mimeType) => {
      expect(PhotoUploadMetadataSchema({ ...VALID, mimeType })).not.toBeInstanceOf(type.errors);
    });
  });

  describe('with a MIME type outside the allow-list', () => {
    it.each(['image/gif', 'image/svg+xml', 'application/pdf'])('rejects %s', (mimeType) => {
      expect(PhotoUploadMetadataSchema({ ...VALID, mimeType })).toBeInstanceOf(type.errors);
    });
  });

  describe('at the size limit', () => {
    it('accepts a file of exactly the maximum size', () => {
      expect(PhotoUploadMetadataSchema({ ...VALID, size: MAX_FILE_SIZE })).not.toBeInstanceOf(
        type.errors,
      );
    });

    it('rejects a file one byte over the maximum size', () => {
      expect(PhotoUploadMetadataSchema({ ...VALID, size: MAX_FILE_SIZE + 1 })).toBeInstanceOf(
        type.errors,
      );
    });
  });

  describe('without a file name', () => {
    it('rejects an empty file name', () => {
      expect(PhotoUploadMetadataSchema({ ...VALID, fileName: '' })).toBeInstanceOf(type.errors);
    });
  });
});
