import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CircleChip from '$lib/components/circles/CircleChip.svelte';
import { aCircle } from '$lib/test/fixtures.js';
import { useLanguage } from '$lib/test/locale.js';
import { screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';

async function contextWithCircles() {
  const context = createTestAppContext();
  vi.spyOn(context.api.circles, 'listCircles').mockResolvedValue([
    aCircle({ id: 'work', name: 'Work' }),
    aCircle({ id: 'friends', name: 'Friends', parentCircleId: 'work' }),
  ]);
  await context.stores.circles.loadCircles();
  return context;
}

describe('CircleChip', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await useLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('remove label', () => {
    it('names the whole path, like the chip renders it', async () => {
      renderWithContext(CircleChip, {
        props: {
          circle: { id: 'friends', name: 'Friends', color: null },
          removable: true,
          onremove: vi.fn(),
        },
        context: await contextWithCircles(),
      });

      expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Remove Work Friends');
    });

    it('names just the circle when it has no ancestors', async () => {
      renderWithContext(CircleChip, {
        props: {
          circle: { id: 'solo', name: 'Solo', color: null },
          removable: true,
          onremove: vi.fn(),
        },
        context: await contextWithCircles(),
      });

      expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Remove Solo');
    });
  });
});
