import { type } from 'arktype';
import { CountryCodeSchema } from '../countries/country-code-schema.js';
import { AddressTypeSchema } from './address-type.js';

export const AddressInputSchema = type({
  'street_line1?': 'string',
  'street_line2?': 'string',
  'city?': 'string',
  'state_province?': 'string',
  'postal_code?': 'string',
  'country?': CountryCodeSchema,
  address_type: AddressTypeSchema,
  'label?': 'string',
  is_primary: 'boolean = false',
});

export type AddressInput = typeof AddressInputSchema.infer;
