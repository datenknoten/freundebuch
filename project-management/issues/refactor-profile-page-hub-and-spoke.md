# Chore: Refactor Profile Page into Hub-and-Spoke Layout

**Project:** freundebuch2
**Type:** Chore / Refactor
**Related Epic:** None (UI structure improvement)
**Phase:** Phase 1.5 (Post-MVP Enhancement)
**Priority:** Medium
**Status:** Implemented

---

## Summary

The profile page (`/profile`) was a single scrollable page with six sections stacked vertically. It has been refactored into a hub-and-spoke layout with nested SvelteKit routes: a card-grid overview hub at `/profile` with live status summaries, and six dedicated spoke pages — one per section — each with its own route and a back-link to the hub.

---

## Background

`apps/frontend/src/routes/profile/+page.svelte` was 240 lines and hosted six distinct concerns in sequence:

1. **User Account Information** — email address, user ID, member since date
2. **Display Preferences** — language and birthday format selectors
3. **Passkeys / WebAuthn** — `PasskeyManager` component
4. **App Passwords** — `AppPasswordManager` component
5. **Messaging Reminders** — `NotificationChannelList` component
6. **CardDAV Setup Guide** — `CardDAVSetupGuide` component

Users who wanted to manage a passkey had to scroll past account info and display preferences. Users looking for CardDAV instructions scrolled past everything. As more features arrive — MFA, additional security settings, future integrations — this list would only grow.

The solution chosen was a hub-and-spoke pattern: `/profile` shows a card grid overview organised into three category groups, and each card links to a dedicated spoke route for that section.

---

## Implemented Structure

### Hub Page (`/profile`)

The hub displays three category groups, each with an `<h2>` label and a responsive card grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`):

| Category | Cards |
|----------|-------|
| Account | Account, Display Preferences |
| Security | Passkeys, App Passwords |
| Integrations | Messaging Reminders, CardDAV Sync |

Each card shows a title, description, and a live status summary (e.g. passkey count, email address, language setting). Data is loaded in `onMount` via parallel API calls.

### Spoke Pages

| Route | Contents |
|-------|----------|
| `/profile/account` | Email form, user ID, member since, edit profile button |
| `/profile/display` | Language selector, birthday format selector |
| `/profile/passkeys` | `PasskeyManager` component |
| `/profile/app-passwords` | `AppPasswordManager` component |
| `/profile/messaging` | `NotificationChannelList` component |
| `/profile/carddav` | `CardDAVSetupGuide` component |

Each spoke follows a consistent pattern: back-link to `/profile`, page heading, subtitle, and the section content in a white rounded card.

### File Structure

```
apps/frontend/src/routes/profile/
  +layout.svelte              ← shared page chrome (bg-gray-50, max-w-7xl)
  +page.svelte                ← hub page with category groups + summary cards
  account/+page.svelte        ← email form, user ID, member since
  display/+page.svelte        ← language + birthday format selectors
  passkeys/+page.svelte       ← mounts PasskeyManager
  app-passwords/+page.svelte  ← mounts AppPasswordManager
  messaging/+page.svelte      ← mounts NotificationChannelList
  carddav/+page.svelte        ← mounts CardDAVSetupGuide

apps/frontend/src/lib/components/
  ProfileCard.svelte           ← reusable hub card component
```

---

## Key Files

**Rewritten:**
- `apps/frontend/src/routes/profile/+page.svelte` (monolith → hub page)

**New files:**
- `apps/frontend/src/routes/profile/+layout.svelte`
- `apps/frontend/src/routes/profile/account/+page.svelte`
- `apps/frontend/src/routes/profile/display/+page.svelte`
- `apps/frontend/src/routes/profile/passkeys/+page.svelte`
- `apps/frontend/src/routes/profile/app-passwords/+page.svelte`
- `apps/frontend/src/routes/profile/messaging/+page.svelte`
- `apps/frontend/src/routes/profile/carddav/+page.svelte`
- `apps/frontend/src/lib/components/ProfileCard.svelte`

**i18n updated:**
- `apps/frontend/src/lib/i18n/locales/en.json` (added `profile.hub.*` keys)
- `apps/frontend/src/lib/i18n/locales/de.json` (added `profile.hub.*` keys)

**Unchanged (mounted by spoke pages):**
- `apps/frontend/src/lib/components/PasskeyManager.svelte`
- `apps/frontend/src/lib/components/AppPasswordManager.svelte`
- `apps/frontend/src/lib/components/NotificationChannelList.svelte`
- `apps/frontend/src/lib/components/CardDAVSetupGuide.svelte`

---

## Acceptance Criteria

- [x] `/profile` renders a hub page with card-grid overview and live status summaries
- [x] `/profile/account` renders the email form, user ID, member since with identical functionality
- [x] `/profile/display` renders language and birthday format selectors with identical functionality
- [x] `/profile/passkeys` renders the Passkeys section with identical functionality
- [x] `/profile/app-passwords` renders the App Passwords section with identical functionality
- [x] `/profile/messaging` renders the Messaging Reminders section with identical functionality
- [x] `/profile/carddav` renders the CardDAV Setup Guide section with identical functionality
- [x] A shared `+layout.svelte` provides page chrome; spoke pages share consistent layout
- [x] Each spoke page has a back-link to `/profile`
- [x] Clicking between hub and spoke pages uses client-side navigation (no full reload)
- [x] All existing i18n keys, store bindings, and component props are preserved
- [x] New `profile.hub.*` i18n keys added in both `en.json` and `de.json`
- [x] No visual regressions: each section content is identical to its counterpart on the old page
- [x] TypeScript compilation succeeds with no new errors (`pnpm --filter frontend check`)
- [x] The four leaf components are not modified as part of this refactor
- [x] `<svelte:head>` page title updates correctly for each spoke page
- [x] Hub status summaries show live data (passkey count, app password count, channel count, etc.)
- [x] Responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop

---

## Design Decisions

- **Hub-and-spoke over tabs:** Chosen instead of the originally proposed tab bar because each section is largely independent. The hub provides an at-a-glance overview with status summaries, while spokes give each section room to grow without crowding a tab bar.
- **Six spoke pages instead of three tabs:** Each of the original six sections gets its own route rather than grouping them into three tabs. This keeps each page focused and makes it easier to add new sections in the future.
- **No redirect needed:** `/profile` is the hub itself, not a redirect. Existing links to `/profile` land on a useful overview page.
- **ProfileCard component:** A reusable card component (`ProfileCard.svelte`) with icon snippet, title, description, and status props.
- **Data freshness:** The hub loads counts in `onMount`. When a user navigates to a spoke and back, SvelteKit destroys/recreates the hub component, so `onMount` fires again with fresh data. No cache invalidation needed.

---

## Out of Scope

- **New settings or features** — This is a structural reorganisation only. No new form fields, toggles, or API calls are introduced beyond the hub's count queries.
- **Backend changes** — No database schema changes, no new API endpoints, no changes to auth logic.
- **MFA implementation** — The Security category is designed to accommodate MFA in the future as a new spoke page.
- **Design system changes** — Styling follows existing Tailwind utility patterns. The only new component is `ProfileCard.svelte`.

---

## Dependencies

- No epic dependencies
- No backend or database changes required
- No new npm packages required; icons use the existing `svelte-heros-v2` package

---

## Related Issues

- None — this is a standalone frontend refactor
