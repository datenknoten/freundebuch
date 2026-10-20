import {
  type AppPasswordCreateInputSchema,
  AppPasswordCreateResponseSchema,
  AppPasswordResponseSchema,
  SuccessResponseSchema,
} from '$shared';
import type { ApiClient } from './api-client.js';

export interface AppPasswordsApiOptions {
  client: ApiClient;
}

const AppPasswordResponseListSchema = AppPasswordResponseSchema.array();

export class AppPasswordsApi {
  private readonly client: ApiClient;

  public constructor(options: AppPasswordsApiOptions) {
    this.client = options.client;
  }

  public listAppPasswords() {
    return this.client.request(AppPasswordResponseListSchema, '/api/app-passwords');
  }

  /** The response is the only place the password appears. */
  public createAppPassword(name: string) {
    const input = { name } satisfies typeof AppPasswordCreateInputSchema.inferIn;
    return this.client.request(AppPasswordCreateResponseSchema, '/api/app-passwords', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public async revokeAppPassword(appPasswordId: string) {
    await this.client.request(SuccessResponseSchema, `/api/app-passwords/${appPasswordId}`, {
      method: 'DELETE',
    });
  }
}
