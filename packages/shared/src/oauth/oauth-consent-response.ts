import { type } from 'arktype';

/** The client's callback, an external origin. */
export const OAuthConsentResponseSchema = type({
  redirectURI: 'string.url',
});

export type OAuthConsentResponse = typeof OAuthConsentResponseSchema.infer;
