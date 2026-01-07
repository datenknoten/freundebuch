#!/usr/bin/env node

import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const SOURCE_LOGO = join(rootDir, 'resources', 'logo.png');
const OUTPUT_DIR = join(rootDir, 'apps', 'frontend', 'static');

// Source dimensions: 1394 x 792
// The open book is centered horizontally and positioned in the lower half
// Extract a square region tightly focused on just the book
const FAVICON_EXTRACT = {
  left: 247,
  top: 140,
  width: 900,
  height: 650,
};

async function generateAssets() {
  console.log('Generating logo assets from:', SOURCE_LOGO);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const source = sharp(SOURCE_LOGO);
  const metadata = await source.metadata();
  console.log(`Source: ${metadata.width}x${metadata.height}`);

  // 1. Favicon 32x32 (cropped to book area)
  await sharp(SOURCE_LOGO)
    .extract(FAVICON_EXTRACT)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(join(OUTPUT_DIR, 'favicon.png'));
  console.log('Created: favicon.png (32x32)');

  // 2. Favicon 16x16
  await sharp(SOURCE_LOGO)
    .extract(FAVICON_EXTRACT)
    .resize(16, 16, { fit: 'cover' })
    .png()
    .toFile(join(OUTPUT_DIR, 'favicon-16.png'));
  console.log('Created: favicon-16.png (16x16)');

  // 3. Apple touch icon 180x180 (cropped with slight padding)
  await sharp(SOURCE_LOGO)
    .extract(FAVICON_EXTRACT)
    .resize(160, 160, { fit: 'cover' })
    .extend({
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile(join(OUTPUT_DIR, 'apple-touch-icon.png'));
  console.log('Created: apple-touch-icon.png (180x180)');

  // 4. Full logo for landing page (400px wide, proportional)
  await sharp(SOURCE_LOGO)
    .resize(400, null, { fit: 'inside' })
    .png()
    .toFile(join(OUTPUT_DIR, 'logo.png'));
  console.log('Created: logo.png (400px wide)');

  // 5. Navbar logo (36px height, proportional)
  await sharp(SOURCE_LOGO)
    .resize(null, 36, { fit: 'inside' })
    .png()
    .toFile(join(OUTPUT_DIR, 'logo-navbar.png'));
  console.log('Created: logo-navbar.png (36px height)');

  console.log('\nAll assets generated successfully!');
}

generateAssets().catch((err) => {
  console.error('Failed to generate assets:', err);
  process.exit(1);
});
