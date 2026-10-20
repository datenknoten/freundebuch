import { describe, expect, it } from 'vitest';
import { listCountries } from './list-countries.js';

describe('listCountries', () => {
  it('lists countries with localized names in the collation order of the language', () => {
    const countries = listCountries('de');
    expect(countries).toContainEqual({ code: 'AT', name: 'Österreich' });
    const names = countries.map((country) => country.name);
    expect(names.indexOf('Ägypten')).toBeLessThan(names.indexOf('Albanien'));
  });
});
