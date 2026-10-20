import { type } from 'arktype';
import { CountryCodeSchema } from '../countries/country-code-schema.js';
import { BirthdayFormatSchema } from './birthday-format.js';
import { LanguageSchema } from './language.js';
import { PageSizeSchema } from './page-size.js';

export const UpdatePreferencesRequestSchema = type({
  'friendsPageSize?': PageSizeSchema,
  'friendsTableColumns?': 'string[]',
  'birthdayFormat?': BirthdayFormatSchema,
  'language?': LanguageSchema,
  'showShortcutHints?': 'boolean',
  'defaultCountry?': CountryCodeSchema.or('null'),
});

export type UpdatePreferencesRequest = typeof UpdatePreferencesRequestSchema.infer;
