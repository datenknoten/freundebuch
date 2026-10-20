import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kebabCaseFiles } from './kebab-case-files';

const fail = vi.fn();

function runWith(createdFiles: string[]) {
  vi.stubGlobal('danger', { git: { created_files: createdFiles } });
  kebabCaseFiles();
}

describe('kebabCaseFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fail', fail);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('Svelte components', () => {
    it('accepts a PascalCase component and a SvelteKit route file', () => {
      runWith([
        'apps/frontend/src/lib/AlertBanner.svelte',
        'apps/frontend/src/routes/+page.svelte',
      ]);

      expect(fail).not.toHaveBeenCalled();
    });

    it('rejects a kebab-case component and suggests the PascalCase name', () => {
      runWith(['apps/frontend/src/lib/alert-banner.svelte']);

      expect(fail).toHaveBeenCalledOnce();
      expect(fail.mock.calls[0]?.[0]).toContain('Rename to `AlertBanner.svelte`');
    });
  });

  describe('other files', () => {
    it('accepts kebab-case, migration prefixes, upper-case docs and exempt names', () => {
      runWith([
        'apps/backend/src/services/friends.service.test.ts',
        'database/migrations/1774799536929_fix-bug.ts',
        'docs/AGENTS.md',
        'apps/sabredav/src/Auth/AppPasswordBackend.php',
        'docker/Dockerfile.prod',
        'LICENSE',
        'node_modules/SomePackage/Index.js',
      ]);

      expect(fail).not.toHaveBeenCalled();
    });

    it('rejects a camelCase source file and suggests the kebab-case name', () => {
      runWith(['apps/backend/src/utils/dateHelpers.ts']);

      expect(fail).toHaveBeenCalledOnce();
      expect(fail.mock.calls[0]?.[0]).toContain('Rename to `date-helpers.ts`');
    });

    it('rejects a mixed-case markdown name', () => {
      runWith(['docs/Readme.md']);

      expect(fail).toHaveBeenCalledOnce();
    });
  });
});
