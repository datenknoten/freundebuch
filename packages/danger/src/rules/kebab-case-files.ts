import * as path from 'path';
import type { DangerRule } from '../types';
import { isExemptFile, isIgnoredPath } from '../utils';

// Lowercase alphanumeric segments separated by single hyphens. A segment may
// start with a digit so date-prefixed names (e.g. 2026-06-13-backend-review)
// and names like 2fa-setup are valid kebab-case.
const KEBAB_CASE_STEM = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Markdown docs may use a fully UPPER_CASE name (e.g. README.md, AGENTS.md,
// CODE_OF_CONDUCT.md) — but not mixed case (Readme.md still fails). Segments
// are uppercase alphanumerics separated by single hyphens or underscores.
const SCREAMING_CASE_STEM = /^[A-Z0-9]+([_-][A-Z0-9]+)*$/;

// Migration files use a "<timestamp>_<name>" pattern — strip the prefix before checking
const MIGRATION_PREFIX = /^\d+_/;

function toKebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

const kebabCaseFiles: DangerRule = () => {
  for (const filePath of danger.git.created_files) {
    if (isIgnoredPath(filePath)) continue;
    if (isExemptFile(filePath)) continue;

    const basename = path.basename(filePath);

    // Strip all extensions (e.g. "foo.test.ts" -> "foo")
    let stem = basename.replace(/\..*$/, '');

    // Strip migration timestamp prefix (e.g. "1774799536929_fix-bug" -> "fix-bug")
    stem = stem.replace(MIGRATION_PREFIX, '');

    // Markdown docs may instead be fully UPPER_CASE (README.md, AGENTS.md, ...).
    const isMarkdown = basename.toLowerCase().endsWith('.md');
    if (isMarkdown && SCREAMING_CASE_STEM.test(stem)) continue;

    if (!KEBAB_CASE_STEM.test(stem)) {
      const suggestion = toKebabCase(stem);
      fail(
        `New file \`${filePath}\` does not use kebab-case. ` +
          `Rename to \`${suggestion}${basename.slice(stem.length)}\`.`,
      );
    }
  }
};

export default kebabCaseFiles;
