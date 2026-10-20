import { type } from 'arktype';

export const HouseNumberInfoResponseSchema = type({
  number: 'string',
  /** The street this house number is on, for verification */
  'street?': 'string',
});

export type HouseNumberInfoResponse = typeof HouseNumberInfoResponseSchema.infer;
