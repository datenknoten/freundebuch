import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLanguage } from '$lib/test/locale.js';
import { fireEvent, screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import CountrySelect from './CountrySelect.svelte';

const context = createTestAppContext();

async function useCountryLanguage(lang: 'en' | 'de') {
  await useLanguage(lang);
  await context.stores.locale.setLanguage(lang);
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
    renderWithContext(CountrySelect, { context, props: { value: '' } });
    await fireEvent.focus(screen.getByRole('combobox'));

    expect(screen.getByText('Deutschland')).toBeTruthy();
    expect(screen.getByText('Österreich')).toBeTruthy();
    expect(screen.queryByText('Germany')).toBeNull();
  });

  it('lists English names when the UI language is English', async () => {
    await useCountryLanguage('en');
    renderWithContext(CountrySelect, { context, props: { value: '' } });
    await fireEvent.focus(screen.getByRole('combobox'));

    expect(screen.getByText('Germany')).toBeTruthy();
    expect(screen.queryByText('Deutschland')).toBeNull();
  });

  it('filters by the localized name', async () => {
    renderWithContext(CountrySelect, { context, props: { value: '' } });
    await search('deu');

    expect(screen.getByText('Deutschland')).toBeTruthy();
    expect(screen.queryByText('Österreich')).toBeNull();
  });

  it('filters by the country code', async () => {
    renderWithContext(CountrySelect, { context, props: { value: '' } });
    await search('AT');

    expect(screen.getByText('Österreich')).toBeTruthy();
    expect(screen.queryByText('Deutschland')).toBeNull();
  });

  it('reports the ISO code of the chosen country', async () => {
    const onSelect = vi.fn();
    renderWithContext(CountrySelect, { context, props: { value: '', onSelect } });
    await search('deu');

    await fireEvent.click(screen.getByText('Deutschland'));

    expect(onSelect).toHaveBeenCalledWith('DE', false);
  });

  it('reports the ISO code of the top match chosen with Enter', async () => {
    const onSelect = vi.fn();
    renderWithContext(CountrySelect, { context, props: { value: '', onSelect } });
    await search('deu');

    await fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('DE', true);
  });

  it('reports the ISO code of the entry highlighted with the arrow keys', async () => {
    const onSelect = vi.fn();
    renderWithContext(CountrySelect, { context, props: { value: '', onSelect } });
    await search('österr');
    const input = screen.getByRole('combobox');

    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('AT', true);
  });

  it('shows the localized name of the selected code', () => {
    renderWithContext(CountrySelect, { context, props: { value: 'AT' } });

    const button = screen.getByRole('button');
    expect(button.textContent).toContain('AT');
    expect(button.textContent).toContain('Österreich');
  });
});
