import * as fs from 'fs';
import type { DangerRule } from '../types';

const UNPINNED_PATTERN = /^[\^~><!|*]/;

function checkDeps(
  deps: Record<string, string> | undefined,
  section: string,
  filePath: string,
): void {
  if (!deps) return;

  for (const [name, version] of Object.entries(deps)) {
    // Allow pnpm workspace protocol
    if (version.startsWith('workspace:')) continue;

    if (UNPINNED_PATTERN.test(version)) {
      fail(
        `\`${filePath}\`: dependency \`${name}\` in \`${section}\` must be pinned to an exact version (found \`${version}\`).`,
      );
    }
  }
}

const pinnedPackages: DangerRule = () => {
  const packageFiles = [...danger.git.modified_files, ...danger.git.created_files].filter((f) =>
    f.endsWith('package.json'),
  );

  for (const filePath of packageFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const pkg = JSON.parse(content);

    checkDeps(pkg.dependencies, 'dependencies', filePath);
    checkDeps(pkg.devDependencies, 'devDependencies', filePath);
  }
};

export default pinnedPackages;
