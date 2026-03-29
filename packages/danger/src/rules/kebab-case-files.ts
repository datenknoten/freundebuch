import * as path from 'path';
import type { DangerRule } from '../types';
import { isExemptFile, isIgnoredPath } from '../utils';

const KEBAB_CASE_STEM = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

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
