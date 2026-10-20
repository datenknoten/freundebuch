import { describe, expect, it } from 'vitest';
import { COLUMN_DEFINITIONS, COLUMN_IDS, getColumnDefinitions } from './column-definition.js';
import { DEFAULT_COLUMNS } from './default-columns.js';
import { REQUIRED_COLUMNS } from './required-columns.js';

describe('getColumnDefinitions', () => {
  describe('with a list of column ids', () => {
    it('returns the definitions in the requested order', () => {
      expect(getColumnDefinitions(['nickname', 'avatar']).map((column) => column.id)).toEqual([
        'nickname',
        'avatar',
      ]);
    });

    it('returns an empty list for no ids', () => {
      expect(getColumnDefinitions([])).toEqual([]);
    });
  });
});

describe('COLUMN_DEFINITIONS', () => {
  describe('for every column id', () => {
    it.each(COLUMN_IDS)('keys %s by its own id and i18n key', (id) => {
      expect(COLUMN_DEFINITIONS[id]).toMatchObject({ id, i18nKey: `friends.columns.${id}` });
    });
  });
});

describe('DEFAULT_COLUMNS', () => {
  describe('compared with REQUIRED_COLUMNS', () => {
    it('includes every required column', () => {
      expect(DEFAULT_COLUMNS).toEqual(expect.arrayContaining(REQUIRED_COLUMNS));
    });
  });
});
