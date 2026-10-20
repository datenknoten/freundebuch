import { beforeAll, describe, expect, it } from 'vitest';
import EncounterForm from '$lib/components/encounters/EncounterForm.svelte';
import { useLanguage } from '$lib/test/locale.js';
import { control, labelFor } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';

describe('EncounterForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  describe('create mode', () => {
    it('labels the title, date and location', () => {
      renderWithContext(EncounterForm, { props: {} });

      expect(labelFor('title')).toContain('Title');
      expect(labelFor('title')).toContain('(optional)');
      expect(control('title').required).toBe(false);

      const date = control('encounter-date');
      expect(date.type).toBe('date');
      expect(date.required).toBe(true);
      expect(labelFor('encounter-date')).toContain('*');

      // Location only exists for in-person encounters, which is the default.
      expect(labelFor('location')).toContain('Location');
    });
  });
});
