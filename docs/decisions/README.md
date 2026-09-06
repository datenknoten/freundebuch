# Architecture Decision Records

Decisions worth remembering — why we picked something, what we gave up, and when
it might be worth revisiting. Format is [MADR](https://adr.github.io/madr/) 4.x.

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-better-auth-as-oauth-server-for-mcp.md) | Use Better Auth as the OAuth 2.1 authorization server for MCP | accepted |
| [0002](./0002-pr-coverage-via-danger.md) | Report PR test coverage via Danger instead of per-app Vitest thresholds | accepted |
| [0003](./0003-single-identity-anchored-on-auth-users.md) | Anchor one user identity on `auth.users.external_id` | accepted |
| [0004](./0004-single-instance-deployment.md) | Run the backend as a single instance | accepted |

## Writing a new one

- Filename: `NNNN-short-kebab-title.md`, continuing the numbering above.
- Keep it short. Context, decision, consequences is enough; add drivers and
  option comparisons only when there is real content for them.
- Status values: `proposed`, `accepted`, `rejected`, `deprecated`, or
  `superseded by` a markdown link to the successor ADR.
- Superseding an ADR means editing the old one's status line and nothing else —
  the record of what we thought at the time stays intact.
- Add the new file to the table above.
