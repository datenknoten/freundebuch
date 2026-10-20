import { basename as baseNameOf } from 'node:path';

// Lowercase alphanumeric segments separated by single hyphens. A segment may
// start with a digit so date-prefixed names (e.g. 2026-06-13-backend-review)
// and names like 2fa-setup are valid kebab-case.
const KEBAB_CASE_STEM = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Markdown docs may use a fully UPPER_CASE name (e.g. README.md, AGENTS.md,
// CODE_OF_CONDUCT.md) — but not mixed case (Readme.md still fails). Segments
// are uppercase alphanumerics separated by single hyphens or underscores.
const SCREAMING_CASE_STEM = /^[A-Z0-9]+([_-][A-Z0-9]+)*$/;

// A Svelte component's file name is the component name at the import.
const PASCAL_CASE_STEM = /^[A-Z][A-Za-z0-9]*$/;

const MIGRATION_PREFIX = /^\d+_/;

// PSR-4 (apps/sabredav) resolves a class to a file of the same name, so
// `Freundebuch\DAV\Auth\AppPasswordBackend` *must* live in
// `src/Auth/AppPasswordBackend.php`. Renaming those to kebab-case would break
// autoloading outright, so PHP sources follow PascalCase by requirement rather
// than by preference.
const PSR4_EXTENSION = '.php';

const EXEMPT_BASENAMES: Record<string, true> = { LICENSE: true, Makefile: true, CODEOWNERS: true };

// Dotfiles, Dockerfile variants, and SvelteKit's route files (+page.svelte) and aliases ($lib).
const EXEMPT_PREFIXES = ['.', 'Dockerfile', '+', '$'] as const;

const IGNORED_DIRS = [
  'node_modules/',
  'dist/',
  '.svelte-kit/',
  'vendor/',
  'build/',
  // Generated impeccable-design artifacts (e.g. timestamped critique files
  // like 2026-06-14T08-26-30Z__<slug>.md) are not hand-authored source.
  '.impeccable/',
] as const;

function isExempt(filePath: string, baseName: string) {
  return (
    IGNORED_DIRS.some((dir) => filePath.includes(dir)) === true ||
    filePath.toLowerCase().endsWith(PSR4_EXTENSION) === true ||
    EXEMPT_BASENAMES[baseName] === true ||
    EXEMPT_PREFIXES.some((prefix) => baseName.startsWith(prefix)) === true
  );
}

function toKebabCase(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function toPascalCase(name: string) {
  return name
    .split(/[-_]/)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
}

function checkFileName(filePath: string) {
  const baseName = baseNameOf(filePath);
  if (isExempt(filePath, baseName) === true) {
    return;
  }

  const stem = baseName.replace(/\..*$/, '').replace(MIGRATION_PREFIX, '');
  const extensions = baseName.slice(stem.length);

  if (baseName.endsWith('.svelte') === true) {
    if (PASCAL_CASE_STEM.test(stem) === false) {
      fail(
        `New component \`${filePath}\` does not use PascalCase. Rename to \`${toPascalCase(stem)}${extensions}\`.`,
      );
    }
    return;
  }

  if (baseName.toLowerCase().endsWith('.md') === true && SCREAMING_CASE_STEM.test(stem) === true) {
    return;
  }

  if (KEBAB_CASE_STEM.test(stem) === false) {
    fail(
      `New file \`${filePath}\` does not use kebab-case. Rename to \`${toKebabCase(stem)}${extensions}\`.`,
    );
  }
}

/** Fails the MR for every created file whose name breaks the naming rules: PascalCase components, kebab-case everything else. */
export function kebabCaseFiles() {
  for (const filePath of danger.git.created_files) {
    checkFileName(filePath);
  }
}
