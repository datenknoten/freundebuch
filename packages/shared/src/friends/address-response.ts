import { type } from 'arktype';
import { AddressTypeSchema } from './address-type.js';

export const AddressResponseSchema = type({
  id: 'string',
  'streetLine1?': 'string',
  'streetLine2?': 'string',
  'city?': 'string',
  'stateProvince?': 'string',
  'postalCode?': 'string',
  'country?': 'string',
  addressType: AddressTypeSchema,
  'label?': 'string',
  isPrimary: 'boolean',
  'latitude?': 'number',
  'longitude?': 'number',
  createdAt: 'string',
});

export type AddressResponse = typeof AddressResponseSchema.infer;
