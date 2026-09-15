import { readable } from 'svelte/store';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { control, labelFor, render, useLanguage } from '$lib/test';
import CollectiveForm from './collective-form.svelte';

const loadTypes = vi.fn().mockResolvedValue(undefined);

vi.mock('$lib/stores/collectives', () => ({
  collectives: {
    loadTypes: (...args: unknown[]) => loadTypes(...args),
    isLoadingTypes: false,
    subscribe: (run: (v: { isLoadingTypes: boolean }) => void) => {
      run({ isLoadingTypes: false });
      return () => undefined;
    },
  },
  collectiveTypes: readable([
    { id: 't1', name: 'Band' },
    { id: 't2', name: 'Club' },
  ]),
}));

describe('CollectiveForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  it('labels the name and offers the loaded types as select options', () => {
    render(CollectiveForm, {});

    expect(labelFor('name')).toContain('Name');
    expect(labelFor('name')).toContain('*');
    expect(control('name').required).toBe(true);

    const type = control('type') as HTMLSelectElement;
    expect(type.tagName).toBe('SELECT');
    expect([...type.options].map((o) => o.textContent)).toEqual([
      'Select a type...',
      'Band',
      'Club',
    ]);
    expect(type.getAttribute('aria-describedby')).toBe('type-helper');
  });

  it('shows the unchangeable type as a disabled input in edit mode', () => {
    render(CollectiveForm, {
      collective: {
        id: 'c1',
        name: 'The Band',
        type: { id: 't1', name: 'Band' },
        notes: null,
      } as never,
    });

    const type = control('type') as HTMLInputElement;
    expect(type.tagName).toBe('INPUT');
    expect(type.value).toBe('Band');
    expect(type.disabled).toBe(true);
    expect(document.querySelectorAll('label[for="type"]').length).toBe(1);
  });
});
