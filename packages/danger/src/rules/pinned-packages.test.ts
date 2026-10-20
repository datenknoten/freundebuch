import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ValidationError } from '@datenknoten/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pinnedPackages } from './pinned-packages';

const fail = vi.fn();

let workDir = '';

function writePackageJson(name: string, content: string) {
  const filePath = join(workDir, name, 'package.json');
  mkdirSync(join(workDir, name));
  writeFileSync(filePath, content);
  return filePath;
}

function runWith(modifiedFiles: string[], createdFiles: string[] = []) {
  vi.stubGlobal('danger', { git: { modified_files: modifiedFiles, created_files: createdFiles } });
  pinnedPackages();
}

describe('pinnedPackages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fail', fail);
    workDir = mkdtempSync(join(tmpdir(), 'pinned-packages-'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    rmSync(workDir, { recursive: true, force: true });
  });

  describe('a changed package.json', () => {
    it('passes exact versions, workspace links and peer ranges', () => {
      const filePath = writePackageJson(
        'exact',
        JSON.stringify({
          dependencies: { hono: '4.11.1', '@freundebuch/shared': 'workspace:*' },
          devDependencies: { vitest: '4.1.11' },
          peerDependencies: { svelte: '>=5 <6' },
        }),
      );

      runWith([filePath]);

      expect(fail).not.toHaveBeenCalled();
    });

    it('fails once per range in dependencies and devDependencies', () => {
      const filePath = writePackageJson(
        'ranges',
        JSON.stringify({
          dependencies: { hono: '^4.11.1' },
          devDependencies: { vitest: '~4.1.11' },
        }),
      );

      runWith([], [filePath]);

      expect(fail).toHaveBeenCalledTimes(2);
      expect(fail.mock.calls[0]?.[0]).toContain('`hono` in `dependencies`');
      expect(fail.mock.calls[1]?.[0]).toContain('`vitest` in `devDependencies`');
    });

    it('throws ValidationError when the file is not valid JSON', () => {
      const filePath = writePackageJson('broken', '{ "dependencies": ');

      expect(() => runWith([filePath])).toThrow(ValidationError);
    });

    it('throws ValidationError when a version is not a string', () => {
      const filePath = writePackageJson(
        'wrong-shape',
        JSON.stringify({ dependencies: { hono: 4 } }),
      );

      expect(() => runWith([filePath])).toThrow(ValidationError);
    });
  });

  it('ignores changed files that are not a package.json', () => {
    runWith(['README.md', 'apps/backend/src/index.ts']);

    expect(fail).not.toHaveBeenCalled();
  });
});
