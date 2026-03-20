import * as path from 'path';

export const EXEMPT_BASENAMES = new Set([
  'README.md',
  'LICENSE',
  'Dockerfile',
  'Makefile',
  'AGENTS.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CODEOWNERS',
  'MEMORY.md',
]);

const IGNORED_DIRS = ['node_modules/', 'dist/', '.svelte-kit/', 'vendor/', 'build/'];

export function isExemptFile(filePath: string): boolean {
  const basename = path.basename(filePath);

  if (EXEMPT_BASENAMES.has(basename)) return true;

  // Dotfiles (e.g. .gitignore, .env)
  if (basename.startsWith('.')) return true;

  // Dockerfile variants (e.g. Dockerfile.prod)
  if (basename.startsWith('Dockerfile')) return true;

  // SvelteKit convention files starting with + or $
  if (basename.startsWith('+') || basename.startsWith('$')) return true;

  return false;
}

export function isIgnoredPath(filePath: string): boolean {
  return IGNORED_DIRS.some((dir) => filePath.includes(dir));
}
