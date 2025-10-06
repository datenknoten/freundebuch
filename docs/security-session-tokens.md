# Session Token Security

## Overview

Session tokens are stored **hashed** in the database using SHA-256. This ensures that if the database is compromised, attackers cannot use the stored hashes to hijack user sessions.

## Implementation

### Storage

When a session is created:

1. Generate a cryptographically random 64-character hex token using `crypto.randomBytes(32)`
2. Hash the token using SHA-256
3. Store **only the hash** in the `auth.sessions.token_hash` column
4. Return the **plaintext token** to the client (stored in cookies/headers)

### Verification

When a session is validated:

1. Client sends the plaintext token
2. Server hashes the incoming token using SHA-256
3. Server queries the database for a matching `token_hash`
4. If found and not expired, session is valid

### Code Example

```typescript
import { hashSessionToken, generateSessionToken } from './utils/auth';
import { createSession, getSessionByToken } from './models/queries/sessions.queries';

// Creating a session
const plainToken = generateSessionToken(); // Return this to client
const tokenHash = hashSessionToken(plainToken); // Store this in DB

await createSession.run({
  userExternalId: user.external_id,
  tokenHash: tokenHash,
  expiresAt: getSessionExpiry()
}, pool);

// Validating a session
const tokenHash = hashSessionToken(incomingToken);
const session = await getSessionByToken.run({
  tokenHash: tokenHash
}, pool);
```

## Why SHA-256 (not bcrypt)?

- **Speed**: Session lookups happen on every authenticated request
- **Sufficient**: Session tokens are 256-bit cryptographically random values (not user passwords)
- **No brute-forcing**: Unlike passwords, tokens have maximum entropy and cannot be guessed
- **bcrypt unnecessary**: bcrypt's slowness defends against weak passwords—tokens don't have this problem

## Security Properties

1. **Database breach protection**: Stolen hashes cannot be used to hijack sessions
2. **Backup exposure protection**: Backups containing hashes are safe
3. **Log safety**: Accidentally logged hashes don't grant access
4. **Forward secrecy**: Historical hashes can't be used to reconstruct original tokens

## Database Schema

```sql
CREATE TABLE auth.sessions (
  id SERIAL PRIMARY KEY,
  external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash, never plaintext
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token_hash ON auth.sessions (token_hash);
```

## Migration Notes

If migrating from plaintext tokens:

1. **Cannot rehash existing tokens**: Plaintext tokens were never stored
2. **Must invalidate all sessions**: All users need to re-authenticate
3. **Update schema**: Rename `token` column to `token_hash`
4. **Update queries**: Use `hashSessionToken()` before all DB operations

## Testing

Comprehensive tests in `apps/backend/tests/auth.test.ts`:

- ✅ Hash format validation (64-char hex)
- ✅ Deterministic hashing (same input → same hash)
- ✅ Collision resistance (different inputs → different hashes)
- ✅ Known vector validation (SHA-256 correctness)

## References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [RFC 6749 OAuth 2.0 - Token Security](https://tools.ietf.org/html/rfc6749#section-10.3)
