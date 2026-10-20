import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aCircle } from '$lib/test/fixtures.js';
import { screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import CircleChip from './CircleChip.svelte';

// i18n echoes the key plus the interpolated name so assertions can target both.
vi.mock('$lib/i18n/i18n.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string, p?: { name?: string }) => string }) => void) => {
      run({ t: (k, p) => (p?.name === undefined ? k : `${k}:${p.name}`) });
      return () => undefined;
    },
  }),
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names the whole path in the remove label, like the chip renders it', async () => {
    renderWithContext(CircleChip, {
      props: {
        circle: { id: 'friends', name: 'Friends', color: null },
        removable: true,
        onremove: vi.fn(),
      },
      context: await contextWithCircles(),
    });

    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(
      'aria.removeItem:Work Friends',
    );
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

    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('aria.removeItem:Solo');
  });
});
