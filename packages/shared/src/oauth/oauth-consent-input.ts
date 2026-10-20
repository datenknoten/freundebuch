import { type } from 'arktype';

export const OAuthConsentInputSchema = type({
  accept: 'boolean',
  consent_code: 'string',
});

export type OAuthConsentInput = typeof OAuthConsentInputSchema.infer;
