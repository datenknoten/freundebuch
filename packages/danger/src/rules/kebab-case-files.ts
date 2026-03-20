import * as path from 'path';
import type { DangerRule } from '../types';
import { isExemptFile, isIgnoredPath } from '../utils';

const KEBAB_CASE_STEM = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

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
    const stem = basename.replace(/\..*$/, '');

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
