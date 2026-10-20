/**
 * Encryption of third-party credentials at rest.
 *
 * Notification channels store bot tokens and webhook URLs that let the holder
 * post as the user, so a database dump must not be enough to use them. Values
 * are wrapped in an AES-256-GCM envelope keyed by a value that only lives in
 * the environment (`BETTER_AUTH_SECRET`), never in the database.
 *
 * Envelope: `enc:v2:<iv>:<tag>:<ciphertext>`, all three parts base64url. v2
 * additionally authenticates a context string (`credentialContext`) as GCM
 * associated data, binding every ciphertext to one user and one column: an
 * attacker with write access to the database cannot move a working credential
 * onto another account or into another column, because the tag no longer
 * verifies. `enc:v1:` rows carry no such binding and are still readable; every
 * write upgrades them.
 *
 * Rotating `BETTER_AUTH_SECRET` makes stored credentials undecryptable — see
 * `docs/self-hosting.md`.
 */

export const ENVELOPE_PREFIX_V1 = 'enc:v1:';
export const ENVELOPE_PREFIX_V2 = 'enc:v2:';
export const ALGORITHM = 'aes-256-gcm';
export const IV_BYTES = 12;
