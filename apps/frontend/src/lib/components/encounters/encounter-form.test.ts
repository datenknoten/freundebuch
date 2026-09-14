import { beforeAll, describe, expect, it } from 'vitest';
import { control, labelFor, render, useLanguage } from '$lib/test';
import EncounterForm from './encounter-form.svelte';

describe('EncounterForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  it('labels the title, date and location', () => {
    render(EncounterForm, {});

    expect(labelFor('title')).toContain('Title');
    expect(labelFor('title')).toContain('(optional)');
    expect(control('title').required).toBe(false);

    const date = control('encounter-date') as HTMLInputElement;
    expect(date.type).toBe('date');
    expect(date.required).toBe(true);
    expect(labelFor('encounter-date')).toContain('*');

    // Location only exists for in-person encounters, which is the default.
    expect(labelFor('location')).toContain('Location');
  });
});
