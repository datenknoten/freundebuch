import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pino from 'pino';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoService, PhotoUploadError } from '../../src/services/photo.service.js';
import { resetConfig } from '../../src/utils/config.js';

/**
 * Real sharp, real filesystem: the sibling suite mocks both, so it cannot see
 * what happens when a file passes header inspection and only fails once the
 * pixels are decoded. That is the case a hostile upload produces, and it used
 * to escape as a 500.
 */

const VALID_FRIEND_ID = '550e8400-e29b-41d4-a716-446655440000';

/** A PNG whose header parses but whose compressed pixel data is garbage. */
async function pngWithCorruptPixelData(): Promise<Uint8Array<ArrayBuffer>> {
  const valid = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 1, g: 2, b: 3 } },
  })
    .png()
    .toBuffer();

  const corrupt = Buffer.from(valid);
  let offset = 8; // PNG signature
  while (offset < corrupt.length) {
    const length = corrupt.readUInt32BE(offset);
    const type = corrupt.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') {
      for (let i = offset + 8; i < offset + 8 + Math.min(length, 8); i++) {
        corrupt[i] ^= 0xff;
      }
    }
    offset += 12 + length;
  }
  return new Uint8Array(corrupt);
}

describe('PhotoService decode failures', () => {
  let uploadDir: string;
  let photoService: PhotoService;

  beforeEach(async () => {
    uploadDir = await mkdtemp(path.join(tmpdir(), 'freundebuch-photos-'));
    vi.stubEnv('UPLOAD_DIR', uploadDir);
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    resetConfig();

    photoService = new PhotoService({ logger: pino({ level: 'silent' }) });
  });

  afterEach(async () => {
    await rm(uploadDir, { recursive: true, force: true });
    resetConfig();
    vi.unstubAllEnvs();
  });

  it('rejects an image that only fails once its pixels are decoded', async () => {
    const file = new File([await pngWithCorruptPixelData()], 'photo.png', { type: 'image/png' });

    const upload = photoService.uploadPhoto(VALID_FRIEND_ID, file);

    await expect(upload).rejects.toBeInstanceOf(PhotoUploadError);
    await expect(upload).rejects.toMatchObject({ code: 'INVALID_IMAGE' });
  });

  it('still stores an image whose pixels decode', async () => {
    const valid = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();

    const result = await photoService.uploadPhoto(
      VALID_FRIEND_ID,
      new File([new Uint8Array(valid)], 'photo.png', { type: 'image/png' }),
    );

    expect(result.photoUrl).toContain('photo.png');
    expect(await readdir(path.join(uploadDir, VALID_FRIEND_ID))).toEqual(
      expect.arrayContaining(['photo.png', 'photo_thumb.png']),
    );
  });
});
