import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CollectiveForm from '$lib/components/collectives/CollectiveForm.svelte';
import { InvariantError } from '$lib/errors/invariant.error.js';
import { aCollective, aCollectiveType } from '$lib/test/fixtures.js';
import { useLanguage } from '$lib/test/locale.js';
import { control, labelFor, waitFor } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';

function createContext() {
  const context = createTestAppContext();
  vi.spyOn(context.api.collectives, 'listCollectiveTypes').mockResolvedValue({
    types: [
      aCollectiveType({ id: 't1', name: 'Band' }),
      aCollectiveType({ id: 't2', name: 'Club' }),
    ],
  });
  return context;
}

function typeSelect() {
  const select = control('type');
  if (select instanceof HTMLSelectElement) {
    return select;
  }
  throw new InvariantError('the type control is not a select');
}

function optionLabels(select: HTMLSelectElement) {
  return [...select.options].map((option) => option.textContent);
}

describe('CollectiveForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create mode', () => {
    it('labels the name and offers the loaded types as select options', async () => {
      renderWithContext(CollectiveForm, { props: {}, context: createContext() });

      expect(labelFor('name')).toContain('Name');
      expect(labelFor('name')).toContain('*');
      expect(control('name').required).toBe(true);
      const type = typeSelect();
      await waitFor(() => expect(optionLabels(type)).toEqual(['Select a type...', 'Band', 'Club']));
      expect(type.getAttribute('aria-describedby')).toBe('type-helper');
    });
  });

  describe('edit mode', () => {
    it('shows the unchangeable type as a disabled input', () => {
      const collective = aCollective({
        name: 'The Band',
        type: aCollectiveType({ id: 't1', name: 'Band' }),
      });
      renderWithContext(CollectiveForm, { props: { collective }, context: createContext() });

      const type = control('type');
      expect(type).toBeInstanceOf(HTMLInputElement);
      expect(type.value).toBe('Band');
      expect(type.disabled).toBe(true);
      expect(document.querySelectorAll('label[for="type"]').length).toBe(1);
    });
  });
});
