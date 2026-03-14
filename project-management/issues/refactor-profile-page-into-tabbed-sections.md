# Chore: Refactor Profile Page into Tabbed Sections

**Project:** freundebuch2
**Type:** Chore / Refactor
**Related Epic:** None (UI structure improvement)
**Phase:** Phase 1.5 (Post-MVP Enhancement)
**Priority:** Medium

---

## Summary

The profile page (`/profile`) is a single scrollable page with six sections stacked vertically. Refactor it into a tabbed layout with nested SvelteKit routes so that related settings are grouped logically and the page stays manageable as new features are added.

---

## Background

`apps/frontend/src/routes/profile/+page.svelte` is currently 240 lines and hosts six distinct concerns in sequence:

1. **User Account Information** — email address, user ID, member since date
2. **Display Preferences** — language and birthday format selectors
3. **Passkeys / WebAuthn** — `PasskeyManager` component
4. **App Passwords** — `AppPasswordManager` component
5. **Messaging Reminders** — `NotificationChannelList` component
6. **CardDAV Setup Guide** — `CardDAVSetupGuide` component

Users who want to manage a passkey must scroll past their account info and display preferences to reach it. Users looking for CardDAV instructions scroll past everything. As more features arrive — MFA, additional security settings, future integrations — this list will only grow. There is no navigation structure to help orient the user.

The solution is a tabbed layout using SvelteKit nested routing. Each tab gets its own route, a shared layout provides the tab bar, and the current monolith is dissolved into three focused pages.

---

## Proposed Tab Structure

| Tab | Route | Contents |
|-----|-------|----------|
| Account | `/profile/account` | User info (email, ID, member since), display preferences (language, birthday format) |
| Security | `/profile/security` | Passkeys, App Passwords, and future MFA settings |
| Integrations | `/profile/integrations` | Messaging reminder channels, CardDAV setup guide |

Navigating to `/profile` (with no sub-path) should redirect to `/profile/account` so existing links and bookmarks do not break.

---

## Required Changes

### New File Structure

```
apps/frontend/src/routes/profile/
  +layout.svelte          ← new: shared tab bar and page chrome
  +page.svelte            ← replace with redirect to /profile/account
  account/
    +page.svelte          ← new: Account tab content
  security/
    +page.svelte          ← new: Security tab content
  integrations/
    +page.svelte          ← new: Integrations tab content
```

### Layout (`+layout.svelte`)

The layout component renders the page heading ("Your Profile"), the tab navigation bar, and a `<slot />` (or `{@render children()}` in Svelte 5 runes mode) for the active tab's content. The tab bar highlights the active route using SvelteKit's `$page.url.pathname`.

### Account Tab (`account/+page.svelte`)

Migrates the email form, user ID field, member since display, and the Display Preferences section (language, birthday format) from the current `+page.svelte`. All existing logic, stores, and i18n keys are preserved exactly.

### Security Tab (`security/+page.svelte`)

Migrates the Passkeys section and the App Passwords section. Mounts `PasskeyManager` and `AppPasswordManager` as before. The section headings and descriptive text are preserved. This tab is intentionally designed to accommodate future MFA settings without further restructuring.

### Integrations Tab (`integrations/+page.svelte`)

Migrates the Messaging Reminders section and the CardDAV Setup Guide section. Mounts `NotificationChannelList` and `CardDAVSetupGuide` as before.

### Redirect

The root `/profile` route (`+page.svelte`) becomes a simple redirect using SvelteKit's `goto('/profile/account', { replaceState: true })` in `onMount`, or a server-side redirect via `+page.server.ts` if preferred.

---

## Key Files

**Affected:**
- `apps/frontend/src/routes/profile/+page.svelte` (current monolith — to be replaced)

**New files:**
- `apps/frontend/src/routes/profile/+layout.svelte`
- `apps/frontend/src/routes/profile/account/+page.svelte`
- `apps/frontend/src/routes/profile/security/+page.svelte`
- `apps/frontend/src/routes/profile/integrations/+page.svelte`

**Unchanged (mounted by tab pages):**
- `apps/frontend/src/lib/components/PasskeyManager.svelte`
- `apps/frontend/src/lib/components/AppPasswordManager.svelte`
- `apps/frontend/src/lib/components/NotificationChannelList.svelte`
- `apps/frontend/src/lib/components/CardDAVSetupGuide.svelte`

---

## Acceptance Criteria

- [ ] `/profile` redirects to `/profile/account` automatically (no blank or 404 page)
- [ ] `/profile/account` renders the email form, user ID, member since, and display preferences sections with identical functionality to the current page
- [ ] `/profile/security` renders the Passkeys and App Passwords sections with identical functionality
- [ ] `/profile/integrations` renders the Messaging Reminders and CardDAV Setup Guide sections with identical functionality
- [ ] A shared `+layout.svelte` provides the tab bar; the active tab is visually distinguished
- [ ] Switching between tabs does not trigger a full page reload (client-side navigation)
- [ ] All existing i18n keys, store bindings, and component props are preserved without modification
- [ ] No visual regressions: each section looks identical to its counterpart on the current page
- [ ] TypeScript compilation succeeds with no new errors or warnings
- [ ] The four leaf components (`PasskeyManager`, `AppPasswordManager`, `NotificationChannelList`, `CardDAVSetupGuide`) are not modified as part of this refactor
- [ ] The `<svelte:head>` page title updates correctly when navigating between tabs (e.g., "Account | Freundebuch", "Security | Freundebuch")
- [ ] Manual smoke test confirms all six original sections are reachable and functional after the refactor

---

## Out of Scope

- **New settings or features** — This is a structural reorganisation only. No new form fields, toggles, or API calls are introduced.
- **Backend changes** — No database schema changes, no new API endpoints, no changes to auth logic.
- **MFA implementation** — The Security tab is designed to accommodate MFA in the future, but implementing MFA is a separate issue.
- **Design system changes** — Tab styling should follow existing Tailwind utility patterns already used in the app. No new design tokens or component library additions.
- **Mobile navigation pattern** — If a bottom-sheet or drawer navigation variant is needed on small screens, that is a follow-up issue. The tab bar may simply scroll horizontally on narrow viewports for now.
- **URL history management** — Beyond the basic `/profile` → `/profile/account` redirect, deep-linking behaviour is handled by SvelteKit's default router. No custom history manipulation is needed.

---

## Dependencies

- No epic dependencies
- No backend or database changes required
- No new npm packages required; SvelteKit nested routing is already available in the project

---

## Related Issues

- None — this is a standalone frontend refactor
