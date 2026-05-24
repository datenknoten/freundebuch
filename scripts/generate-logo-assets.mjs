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

// Warm paper background for the home-screen icons. iOS fills transparent
// areas and rounds the corners, so the icon needs an opaque background and
// enough padding that no part of the logo lands in the clipped corners.
const ICON_BG = { r: 0xfc, g: 0xf6, b: 0xe8, alpha: 1 };

/**
 * Render the full logo centered on an opaque square canvas with padding.
 * @param {number} size output edge length in px
 * @param {number} padding fraction of the edge reserved as margin (per side)
 * @param {string} outName file name written into OUTPUT_DIR
 */
async function generateSquareIcon(size, padding, outName) {
  const content = Math.round(size * (1 - padding * 2));
  const logo = await sharp(SOURCE_LOGO)
    .resize(content, content, {
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
  const { width = content, height = content } = await sharp(logo).metadata();

  await sharp({
    create: { width: size, height: size, channels: 4, background: ICON_BG },
  })
    .composite([
      {
        input: logo,
        left: Math.round((size - width) / 2),
        top: Math.round((size - height) / 2),
      },
    ])
    .png()
    .toFile(join(OUTPUT_DIR, outName));
  console.log(`Created: ${outName} (${size}x${size})`);
}

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

  // 3. Apple touch icon 180x180 (full logo on an opaque padded canvas)
  await generateSquareIcon(180, 0.1, 'apple-touch-icon.png');

  // 3b. PWA manifest icons (full logo on an opaque padded canvas)
  await generateSquareIcon(192, 0.1, 'icon-192.png');
  await generateSquareIcon(512, 0.1, 'icon-512.png');

  // 3c. Maskable PWA icon: extra padding so the logo stays inside the
  // safe zone when the platform masks it to a circle/squircle.
  await generateSquareIcon(512, 0.2, 'icon-maskable-512.png');

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
