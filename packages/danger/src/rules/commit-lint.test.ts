import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitLint } from './commit-lint';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

const fail = vi.fn();
const warn = vi.fn();

async function runWith(messages: string[]) {
  vi.stubGlobal('danger', { git: { commits: messages.map((message) => ({ message })) } });
  await commitLint();
}

describe('commitLint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fail', fail);
    vi.stubGlobal('warn', warn);
    // Danger runs from the repo root, where @commitlint/load finds commitlint.config.mjs.
    vi.spyOn(process, 'cwd').mockReturnValue(REPO_ROOT);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('a hand-written commit', () => {
    it('passes a Conventional Commit with a known scope and a sentence-case subject', async () => {
      await runWith(['fix(backend): Keep the session cookie on refresh\n\nBecause.']);

      expect(fail).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });

    it('fails a lower-case subject and names the header and the rule', async () => {
      await runWith(['fix(backend): keep the session cookie']);

      expect(fail).toHaveBeenCalledOnce();
      expect(fail.mock.calls[0]?.[0]).toBe(
        'Commit "fix(backend): keep the session cookie": subject must be sentence-case [subject-case]',
      );
    });

    it('reports the warnings of a commit that also has an error', async () => {
      await runWith(['fix: keep the session cookie']);

      expect(fail).toHaveBeenCalled();
      expect(warn.mock.calls[0]?.[0]).toContain('[scope-empty]');
    });

    it('keeps the warnings of an otherwise valid commit quiet', async () => {
      await runWith(['fix: Keep the session cookie']);

      expect(fail).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  it('skips merge commits and semantic-release commits', async () => {
    await runWith(["Merge branch 'main' into feature", 'chore(release): 3.4.0 [skip ci]']);

    expect(fail).not.toHaveBeenCalled();
  });
});
