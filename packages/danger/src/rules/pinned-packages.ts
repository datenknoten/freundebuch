import { readFileSync } from 'node:fs';
import { parseJson } from '@datenknoten/kit/schema';
import { type } from 'arktype';

const UNPINNED_PATTERN = /^[\^~><!|*]/;

/** peerDependencies state a supported range on purpose, so only these two sections are checked. */
const PINNED_SECTIONS = ['dependencies', 'devDependencies'] as const;

const PackageJsonSchema = type({
  'dependencies?': 'Record<string, string>',
  'devDependencies?': 'Record<string, string>',
  'peerDependencies?': 'Record<string, string>',
});

function checkSection(
  filePath: string,
  section: string,
  dependencies: Record<string, string> = {},
) {
  for (const [name, version] of Object.entries(dependencies)) {
    if (version.startsWith('workspace:') === true) {
      continue;
    }
    if (UNPINNED_PATTERN.test(version) === true) {
      fail(
        `\`${filePath}\`: dependency \`${name}\` in \`${section}\` must be pinned to an exact version (found \`${version}\`).`,
      );
    }
  }
}

/**
 * Fails the MR for every range in the dependencies of a changed package.json.
 *
 * @throws {ValidationError} when a changed package.json is not valid JSON or its dependency
 *   sections are not string maps.
 */
export function pinnedPackages() {
  const changedFiles = [...danger.git.modified_files, ...danger.git.created_files];
  for (const filePath of changedFiles.filter((file) => file.endsWith('package.json'))) {
    const packageJson = parseJson(PackageJsonSchema, readFileSync(filePath, 'utf-8'));
    for (const section of PINNED_SECTIONS) {
      checkSection(filePath, section, packageJson[section]);
    }
  }
}
