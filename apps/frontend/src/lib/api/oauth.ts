import {
  OAuthClientResponseSchema,
  type OAuthConsentInputSchema,
  OAuthConsentResponseSchema,
} from '$shared';
import type { ApiClient } from './api-client.js';

export interface OAuthApiOptions {
  client: ApiClient;
}

/** The consent step of the OAuth flow that MCP clients start. */
export class OAuthApi {
  private readonly client: ApiClient;

  public constructor(options: OAuthApiOptions) {
    this.client = options.client;
  }

  public getClient(clientId: string) {
    return this.client.request(
      OAuthClientResponseSchema,
      `/api/auth/oauth2/client/${encodeURIComponent(clientId)}`,
    );
  }

  /** Resolves the client callback to redirect to, for a grant and for a denial alike. */
  public submitConsent(consentCode: string, isAccepted: boolean) {
    const input = {
      accept: isAccepted,
      consent_code: consentCode,
    } satisfies typeof OAuthConsentInputSchema.inferIn;
    return this.client.request(OAuthConsentResponseSchema, '/api/auth/oauth2/consent', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}
