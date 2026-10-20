#!/usr/bin/env node

import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { exitWith } from '@datenknoten/kit/cli';
import sharp from 'sharp';

const rootDir = join(import.meta.dirname, '..');

const sourceLogo = join(rootDir, 'resources', 'logo.png');
const outputDir = join(rootDir, 'apps', 'frontend', 'static');

// The source is 1394 x 792 px with the open book centered horizontally in the
// lower half; this region frames just the book.
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
 * @param {string} outName file name written into outputDir
 */
async function generateSquareIcon(size, padding, outName) {
  const content = Math.round(size * (1 - padding * 2));
  const logo = await sharp(sourceLogo)
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
    .toFile(join(outputDir, outName));
  console.log(`Created: ${outName} (${size}x${size})`);
}

/**
 * @param {number} size output edge length in px
 * @param {string} outName file name written into outputDir
 */
async function generateFavicon(size, outName) {
  await sharp(sourceLogo)
    .extract(FAVICON_EXTRACT)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(join(outputDir, outName));
  console.log(`Created: ${outName} (${size}x${size})`);
}

async function main() {
  console.log('Generating logo assets from:', sourceLogo);

  await mkdir(outputDir, { recursive: true });

  const metadata = await sharp(sourceLogo).metadata();
  console.log(`Source: ${metadata.width}x${metadata.height}`);

  await generateFavicon(32, 'favicon.png');
  await generateFavicon(16, 'favicon-16.png');

  await generateSquareIcon(180, 0.1, 'apple-touch-icon.png');
  await generateSquareIcon(192, 0.1, 'icon-192.png');
  await generateSquareIcon(512, 0.1, 'icon-512.png');
  // Maskable: extra padding keeps the logo inside the safe zone when the
  // platform masks it to a circle or squircle.
  await generateSquareIcon(512, 0.2, 'icon-maskable-512.png');

  await sharp(sourceLogo)
    .resize(400, null, { fit: 'inside' })
    .png()
    .toFile(join(outputDir, 'logo.png'));
  console.log('Created: logo.png (400px wide)');

  await sharp(sourceLogo)
    .resize(null, 36, { fit: 'inside' })
    .png()
    .toFile(join(outputDir, 'logo-navbar.png'));
  console.log('Created: logo-navbar.png (36px height)');

  console.log('\nAll assets generated successfully!');
}

void main().catch(exitWith);
