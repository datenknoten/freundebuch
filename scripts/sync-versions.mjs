#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const version = process.argv[2];

if (!version) {
  console.error('Usage: node sync-versions.mjs <version>');
  process.exit(1);
}

const packagePaths = [
  'package.json',
  'apps/backend/package.json',
  'apps/frontend/package.json',
  'packages/shared/package.json',
];

for (const packagePath of packagePaths) {
  const fullPath = join(rootDir, packagePath);
  try {
    const content = JSON.parse(readFileSync(fullPath, 'utf8'));
    content.version = version;
    writeFileSync(fullPath, `${JSON.stringify(content, null, 2)}\n`);
    console.log(`Updated ${packagePath} to version ${version}`);
  } catch (error) {
    console.error(`Failed to update ${packagePath}:`, error.message);
    process.exit(1);
  }
}

console.log(`Successfully synced all packages to version ${version}`);
