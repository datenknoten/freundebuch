#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exitWith, rejectUsage } from '@datenknoten/kit/cli';
import { parseJson } from '@datenknoten/kit/schema';
import { type } from 'arktype';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const PACKAGE_PATHS = [
  'package.json',
  'apps/backend/package.json',
  'apps/frontend/package.json',
  'apps/mcp-server/package.json',
  'packages/danger/package.json',
  'packages/shared/package.json',
];

const PackageJsonSchema = type({ version: 'string' });

const rootDir = join(import.meta.dirname, '..');

/**
 * @param {string} packagePath path relative to the repository root
 * @param {string} version
 */
function syncVersion(packagePath, version) {
  const fullPath = join(rootDir, packagePath);
  const packageJson = parseJson(PackageJsonSchema, readFileSync(fullPath, 'utf8'));
  writeFileSync(fullPath, `${JSON.stringify({ ...packageJson, version }, null, 2)}\n`);
  console.log(`Updated ${packagePath} to version ${version}`);
}

async function main() {
  const { version } = await yargs(hideBin(process.argv))
    .command('$0 <version>', 'Write <version> into every workspace package.json', (command) =>
      command.positional('version', {
        type: 'string',
        demandOption: true,
        describe: 'The release version, e.g. 3.4.0',
      }),
    )
    .version(false)
    .strict()
    .locale('en')
    .fail(rejectUsage)
    .parseAsync();

  for (const packagePath of PACKAGE_PATHS) {
    syncVersion(packagePath, version);
  }
  console.log(`Successfully synced all packages to version ${version}`);
}

void main().catch(exitWith);
