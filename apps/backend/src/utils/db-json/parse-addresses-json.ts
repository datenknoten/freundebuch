import { type } from 'arktype';
import type { Logger } from 'pino';
import { safeArray } from './safe-array.js';

const AddressJsonRowSchema = type({
  external_id: 'string',
  street_line1: 'string | null',
  street_line2: 'string | null',
  city: 'string | null',
  state_province: 'string | null',
  postal_code: 'string | null',
  country: 'string | null',
  address_type: 'string',
  label: 'string | null',
  is_primary: 'boolean',
  latitude: 'number | null',
  longitude: 'number | null',
  created_at: 'string',
});

export type AddressJsonRow = typeof AddressJsonRowSchema.infer;

export function parseAddressesJson(value: unknown, logger: Logger): AddressJsonRow[] {
  return safeArray(value, AddressJsonRowSchema, logger, 'addresses');
}
