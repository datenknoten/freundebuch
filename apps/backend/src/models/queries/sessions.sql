/* @name GetSessionByToken */
SELECT s.external_id, u.external_id as user_external_id, s.expires_at, s.created_at
FROM auth.sessions s
JOIN auth.users u ON s.user_id = u.id
WHERE s.token_hash = :tokenHash AND s.expires_at > CURRENT_TIMESTAMP;

/* @name CreateSession */
INSERT INTO auth.sessions (user_id, token_hash, expires_at)
VALUES (
  (SELECT id FROM auth.users WHERE external_id = :userExternalId),
  :tokenHash,
  :expiresAt
)
RETURNING external_id, expires_at, created_at;

/* @name DeleteSessionByToken */
DELETE FROM auth.sessions
WHERE token_hash = :tokenHash;

/* @name DeleteSessionByExternalId */
DELETE FROM auth.sessions
WHERE external_id = :externalId;

/* @name DeleteExpiredSessions */
DELETE FROM auth.sessions
WHERE expires_at <= CURRENT_TIMESTAMP;

/* @name DeleteUserSessions */
DELETE FROM auth.sessions
WHERE user_id = (SELECT id FROM auth.users WHERE external_id = :userExternalId);
