import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, useLanguage } from '$lib/test';
import CountrySelect from './country-select.svelte';

// Hoisted above the mock factory so the test body and the mocked module share
// the same store. Hand-rolled rather than `writable`, because `vi.hoisted`
// runs before this file's imports.
const language = vi.hoisted(() => {
  let value = 'en';
  const subscribers = new Set<(v: string) => void>();
  return {
    subscribe(run: (v: string) => void) {
      subscribers.add(run);
      run(value);
      return () => {
        subscribers.delete(run);
      };
    },
    set(next: string) {
      value = next;
      for (const run of subscribers) run(value);
    },
  };
});

vi.mock('$lib/stores/locale', () => ({ currentLanguage: language }));

async function useCountryLanguage(lang: 'en' | 'de') {
  await useLanguage(lang);
  language.set(lang);
}

async function search(query: string) {
  const input = screen.getByRole('combobox');
  await fireEvent.focus(input);
  await fireEvent.input(input, { target: { value: query } });
}

describe('CountrySelect', () => {
  beforeEach(async () => {
    await useCountryLanguage('de');
  });

  it('lists countries by their name in the UI language', async () => {
    render(CountrySelect, { value: '' });
    await fireEvent.focus(screen.getByRole('combobox'));

    expect(screen.getByText('Deutschland')).toBeTruthy();
    expect(screen.getByText('Österreich')).toBeTruthy();
    expect(screen.queryByText('Germany')).toBeNull();
  });

  it('lists English names when the UI language is English', async () => {
    await useCountryLanguage('en');
    render(CountrySelect, { value: '' });
    await fireEvent.focus(screen.getByRole('combobox'));

    expect(screen.getByText('Germany')).toBeTruthy();
    expect(screen.queryByText('Deutschland')).toBeNull();
  });

  it('filters by the localized name', async () => {
    render(CountrySelect, { value: '' });
    await search('deu');

    expect(screen.getByText('Deutschland')).toBeTruthy();
    expect(screen.queryByText('Österreich')).toBeNull();
  });

  it('filters by the country code', async () => {
    render(CountrySelect, { value: '' });
    await search('AT');

    expect(screen.getByText('Österreich')).toBeTruthy();
    expect(screen.queryByText('Deutschland')).toBeNull();
  });

  it('reports the ISO code of the chosen country', async () => {
    const onSelect = vi.fn();
    render(CountrySelect, { value: '', onSelect });
    await search('deu');

    await fireEvent.click(screen.getByText('Deutschland'));

    expect(onSelect).toHaveBeenCalledWith('DE', false);
  });

  it('reports the ISO code of the top match chosen with Enter', async () => {
    const onSelect = vi.fn();
    render(CountrySelect, { value: '', onSelect });
    await search('deu');

    await fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('DE', true);
  });

  it('reports the ISO code of the entry highlighted with the arrow keys', async () => {
    const onSelect = vi.fn();
    render(CountrySelect, { value: '', onSelect });
    await search('österr');
    const input = screen.getByRole('combobox');

    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('AT', true);
  });

  it('shows the localized name of the selected code', () => {
    render(CountrySelect, { value: 'AT' });

    const button = screen.getByRole('button');
    expect(button.textContent).toContain('AT');
    expect(button.textContent).toContain('Österreich');
  });
});
