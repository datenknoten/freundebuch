import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import { SessionStore } from './session.js';

describe('SessionStore', () => {
  let session: SessionStore;

  beforeEach(() => {
    session = new SessionStore();
  });

  describe('notifyUnauthorized', () => {
    it('resolves false without prompting when no session exists', async () => {
      await expect(session.notifyUnauthorized()).resolves.toBe(false);
      expect(get(session)).toBe(false);
    });

    it('shows the prompt when a session existed', () => {
      session.setHasSession(true);

      void session.notifyUnauthorized();

      expect(get(session)).toBe(true);
    });

    it('works detached from the store, as the API client calls it', async () => {
      const notifyUnauthorized = session.notifyUnauthorized.bind(session);

      await expect(notifyUnauthorized()).resolves.toBe(false);
    });
  });

  describe('resolveSessionExpired', () => {
    it('settles every parked request with true and hides the prompt', async () => {
      session.setHasSession(true);
      const first = session.notifyUnauthorized();
      const second = session.notifyUnauthorized();

      session.resolveSessionExpired();

      await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
      expect(get(session)).toBe(false);
    });
  });

  describe('abandonSessionExpired', () => {
    it('settles parked requests with false and hides the prompt', async () => {
      session.setHasSession(true);
      const pending = session.notifyUnauthorized();

      session.abandonSessionExpired();

      await expect(pending).resolves.toBe(false);
      expect(get(session)).toBe(false);
    });
  });
});
