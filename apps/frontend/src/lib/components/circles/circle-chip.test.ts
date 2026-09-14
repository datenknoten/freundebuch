import { readable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '$lib/test';
import CircleChip from './circle-chip.svelte';

// i18n echoes the key plus the interpolated name so assertions can target both.
vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string, p?: { name?: string }) => string }) => void) => {
      run({ t: (k, p) => (p?.name === undefined ? k : `${k}:${p.name}`) });
      return () => undefined;
    },
  }),
}));

// Only id, name and parentCircleId are read when walking the circle path.
vi.mock('$lib/stores/circles', () => ({
  circlesById: readable(
    new Map([
      ['work', { id: 'work', name: 'Work', parentCircleId: null }],
      ['friends', { id: 'friends', name: 'Friends', parentCircleId: 'work' }],
    ] as never),
  ),
}));

describe('CircleChip', () => {
  it('names the whole path in the remove label, like the chip renders it', () => {
    render(CircleChip, {
      circle: { id: 'friends', name: 'Friends', color: null },
      removable: true,
      onremove: vi.fn(),
    });

    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(
      'aria.removeItem:Work Friends',
    );
  });

  it('names just the circle when it has no ancestors', () => {
    render(CircleChip, {
      circle: { id: 'solo', name: 'Solo', color: null },
      removable: true,
      onremove: vi.fn(),
    });

    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('aria.removeItem:Solo');
  });
});
