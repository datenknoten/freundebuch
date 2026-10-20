import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import { OverlayStore } from './overlay.js';

describe('OverlayStore', () => {
  describe('register', () => {
    it('reports an open overlay until it is released', () => {
      const overlay = new OverlayStore();
      const release = overlay.register();
      const whileOpen = get(overlay.isAnyOpen);

      release();

      expect([whileOpen, get(overlay.isAnyOpen)]).toEqual([true, false]);
    });

    it('stays open while a nested overlay outlives the one below it', () => {
      const overlay = new OverlayStore();
      const releaseModal = overlay.register();
      const releaseDialog = overlay.register();

      releaseModal();
      const afterModal = get(overlay.isAnyOpen);
      releaseDialog();

      expect([afterModal, get(overlay.isAnyOpen)]).toEqual([true, false]);
    });

    it('releases only once when the release function runs twice', () => {
      const overlay = new OverlayStore();
      const releaseFirst = overlay.register();
      const releaseSecond = overlay.register();

      releaseFirst();
      releaseFirst();

      expect(get(overlay.isAnyOpen)).toBe(true);
      releaseSecond();
    });
  });
});
