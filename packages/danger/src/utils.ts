import * as path from 'path';

// All-uppercase markdown docs (README.md, AGENTS.md, CHANGELOG.md, ...) are
// allowed by the kebab-case rule's SCREAMING_CASE handling, so they don't need
// listing here — only non-markdown exceptions belong below.
export const EXEMPT_BASENAMES = new Set(['LICENSE', 'Dockerfile', 'Makefile', 'CODEOWNERS']);

const IGNORED_DIRS = [
  'node_modules/',
  'dist/',
  '.svelte-kit/',
  'vendor/',
  'build/',
  // Generated impeccable-design artifacts (e.g. timestamped critique files
  // like 2026-06-14T08-26-30Z__<slug>.md) are not hand-authored source.
  '.impeccable/',
];

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
