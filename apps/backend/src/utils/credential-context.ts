/** The columns holding a credential; part of the authenticated context. */
export type CredentialColumn = 'telegram_bot_token' | 'matrix_access_token' | 'discord_webhook_url';

/**
 * The associated data a v2 ciphertext is bound to. Changing the shape of this
 * string invalidates every stored credential, so it is deliberately boring.
 */
export function credentialContext(userExternalId: string, column: CredentialColumn): string {
  return `notification-channel:${userExternalId}:${column}`;
}
