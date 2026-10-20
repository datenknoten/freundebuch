import { AppPasswordResponseSchema } from './app-password-response.js';

/** Only the create response carries the secret; it is never shown again. */
export const AppPasswordCreateResponseSchema = AppPasswordResponseSchema.merge({
  /** The formatted password. */
  password: 'string',
  /** The first 8 characters of the raw password. */
  passwordPrefix: 'string',
});

export type AppPasswordCreateResponse = typeof AppPasswordCreateResponseSchema.infer;
