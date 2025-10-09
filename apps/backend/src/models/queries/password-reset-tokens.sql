/* @name CreatePasswordResetToken */
INSERT INTO auth.password_reset_tokens (user_id, token_hash, expires_at)
VALUES (
  (SELECT id FROM auth.users WHERE external_id = :userExternalId),
  :tokenHash,
  :expiresAt
)
RETURNING external_id, expires_at, created_at;

/* @name GetPasswordResetToken */
SELECT
  prt.external_id,
  u.external_id as user_external_id,
  prt.expires_at,
  prt.used_at,
  prt.created_at
FROM auth.password_reset_tokens prt
JOIN auth.users u ON prt.user_id = u.id
WHERE prt.token_hash = :tokenHash
  AND prt.expires_at > CURRENT_TIMESTAMP
  AND prt.used_at IS NULL;

/* @name MarkPasswordResetTokenAsUsed */
UPDATE auth.password_reset_tokens
SET used_at = CURRENT_TIMESTAMP
WHERE token_hash = :tokenHash
RETURNING external_id, used_at;

/* @name DeleteExpiredPasswordResetTokens */
DELETE FROM auth.password_reset_tokens
WHERE expires_at <= CURRENT_TIMESTAMP OR used_at IS NOT NULL;

/* @name DeleteUserPasswordResetTokens */
DELETE FROM auth.password_reset_tokens
WHERE user_id = (SELECT id FROM auth.users WHERE external_id = :userExternalId);
