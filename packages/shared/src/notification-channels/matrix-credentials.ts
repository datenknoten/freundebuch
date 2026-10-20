import { type } from 'arktype';

/**
 * `homeserver` is https-only, matching `sendMatrixMessage`, which rejects any
 * other protocol as part of its SSRF guard. Accepting `http://` here let a
 * channel be created and persisted that could never deliver: nothing
 * validates the URL on the create path, so the failure only surfaced later,
 * once per day, in the digest scheduler.
 */
export const MatrixCredentialsSchema = type({
  homeserver: /^https:\/\/.+/,
  accessToken: 'string > 0',
  roomId: /^!.+:.+/,
});

export const MatrixCredentialsUpdateSchema = type({
  'homeserver?': /^https:\/\/.+/,
  'accessToken?': 'string > 0',
  'roomId?': /^!.+:.+/,
});
