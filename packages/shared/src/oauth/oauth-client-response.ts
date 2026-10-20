import { type } from 'arktype';

export const OAuthClientResponseSchema = type({
  clientId: 'string',
  name: 'string',
  icon: 'string | null',
});

export type OAuthClientResponse = typeof OAuthClientResponseSchema.infer;
