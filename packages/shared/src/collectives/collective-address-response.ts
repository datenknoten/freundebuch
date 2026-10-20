import { type } from 'arktype';

export const CollectiveAddressResponseSchema = type({
  streetLine1: 'string | null',
  streetLine2: 'string | null',
  city: 'string | null',
  stateProvince: 'string | null',
  postalCode: 'string | null',
  country: 'string | null',
});

export type CollectiveAddressResponse = typeof CollectiveAddressResponseSchema.infer;
