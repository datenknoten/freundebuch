# Refactor: Replace Inline SVG Icons with Heroicons Package

**Project:** freundebuch2
**Type:** Refactor
**Related Epic:** [Epic 14: Subresource Inline Editing](../epics/epic-14-done-subresource-inline-editing.md) (UI consistency)
**Phase:** Phase 1.5 (Post-MVP Enhancement)
**Priority:** Medium

---

## Summary

Replace all inline SVG icon definitions across the frontend codebase with a proper Heroicons package. Currently, every icon in the application is an inline `<svg>` element with hard-coded path data copy-pasted from Heroicons, which creates maintenance burden, inconsistency, and unnecessary bundle size.

A proper Heroicons package will give us tree-shakeable imports, consistent sizing and stroke-width values, easier updates when Heroicons releases new versions, and cleaner component code.

---

## Background

The frontend design language ([docs/design-language.md](../../docs/design-language.md)) and agent guidelines ([apps/frontend/AGENTS.md](../../apps/frontend/AGENTS.md)) both specify "Heroicons only" with consistent stroke widths and standardized sizing (`w-4 h-4`, `w-5 h-5`, `w-6 h-6`). The current implementation technically uses Heroicons, but in the worst possible way: raw SVG markup embedded directly in component templates.

**Current Problems:**

1. **Inconsistent stroke-width:** All icons use `stroke-width="2"`, which is the Heroicons default, but this value is repeated 200+ times across the codebase. Any future design change requires global search-and-replace.

2. **No type safety:** There's no autocomplete or type checking for icon names. Developers must manually look up the correct path data from heroicons.com and copy-paste it into components.

3. **Bundle size overhead:** Every inline SVG includes the full `xmlns`, `viewBox`, `fill`, `stroke`, and attribute declarations. A component-based approach would eliminate this duplication.

4. **Maintenance burden:** When Heroicons releases a new icon or updates an existing design, there's no straightforward way to update the application. Each icon location must be found and manually replaced.

5. **Code readability:** Complex path data clutters component markup. Compare:
   ```svelte
   <!-- Current: 3 lines of path gibberish -->
   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
   </svg>

   <!-- Proposed: One clean import -->
   <UsersIcon class="w-5 h-5" />
   ```

**Components affected** (non-exhaustive list from manual inspection):
- `NavBar.svelte` - Navigation icons (plus, users, calendar, building, user, logout, search, hamburger menu)
- `UserMenu.svelte` - User menu dropdown icons
- `EncounterDetail.svelte` - Calendar, edit, delete, map-pin icons
- `EncounterCard.svelte` - Calendar, location, users icons
- `LastEncounterBadge.svelte` - Calendar, plus icons
- `FriendMultiSelect.svelte` - Search and selection icons
- `CircleEditModal.svelte` - Circle management icons
- `CircleChip.svelte` - Close (X) icon
- `FavoriteButton.svelte` - Star icon
- `CollectiveCard.svelte`, `MemberList.svelte` - Collective/member icons
- `NotificationChannelList.svelte` - Platform and action icons
- `GlobalSearch.svelte` - Search icon
- `LanguageSwitcher.svelte` - Language/globe icon
- `HelpDialog.svelte` - Close (X) icon
- Friend detail sections (`AddressSection.svelte`, `EmailSection.svelte`, `PhoneSection.svelte`, etc.) - Edit, delete, add icons
- All mobile components (`MobileAddChoiceModal.svelte`, `SwipeableRow.svelte`, etc.)

A full audit using `grep -r '<svg' apps/frontend/src` returns **73 Svelte files** with inline SVG icons.

---

## Feature Description

### 1. Install Heroicons Package

Install the official Heroicons package for Svelte from `@steeze-ui/icons` or a similar Svelte-compatible Heroicons library. The package must support:

- **Tree-shaking:** Unused icons are not included in the production bundle
- **Svelte 5 compatibility:** Works with modern Svelte 5 runes and component patterns
- **Outline and solid variants:** Heroicons provides both styles; the package must expose both
- **Class forwarding:** Icons must accept a `class` prop for Tailwind utility classes

**Recommended packages to evaluate:**

1. `@steeze-ui/icons` + `@steeze-ui/heroicons` - Well-maintained, tree-shakeable, Svelte-native
2. `svelte-hero-icons` - Direct Heroicons Svelte wrapper
3. `heroicons` (official) + manual Svelte wrapper component - Fallback if no Svelte package meets requirements

If no existing package is satisfactory, create a lightweight wrapper component (`apps/frontend/src/lib/components/Icon.svelte`) that accepts an icon name and renders the corresponding Heroicons SVG from the official `heroicons` package.

### 2. Create a Standardized Icon Component (if needed)

If using a wrapper approach, the `Icon.svelte` component should follow this pattern:

```svelte
<script lang="ts">
type IconName = 'users' | 'calendar' | 'map-pin' | 'plus' | 'x-mark' | ...;  // Union of all used icons

let {
  name,
  variant = 'outline',
  class: className = '',
  ...props
}: {
  name: IconName;
  variant?: 'outline' | 'solid';
  class?: string;
  [key: string]: any;
} = $props();

// Import icon data from heroicons package and render
// Implementation depends on the chosen package
</script>
```

The component must enforce the same default attributes used in the current inline SVGs:
- `fill="none"` for outline icons
- `stroke="currentColor"` for outline icons
- `viewBox="0 0 24 24"`
- `stroke-width` should be configurable but default to `2` (current standard) or `1.5` (Heroicons default)

### 3. Systematically Replace Inline SVGs

Go through all 73 files identified in the background section and replace inline SVG declarations with the new icon component or package import.

**Replacement strategy:**

1. **Group by icon type:** Create a lookup table mapping each unique SVG path to its Heroicons name. Many icons are repeated (e.g., the calendar icon appears in `EncounterDetail.svelte`, `EncounterCard.svelte`, `LastEncounterBadge.svelte`, `NavBar.svelte`).

2. **Replace in batches:** Start with the most commonly used icons (calendar, users, plus, x-mark, map-pin, search) to get the biggest impact early.

3. **Preserve sizing classes:** All existing size classes (`w-4 h-4`, `w-5 h-5`, `w-6 h-6`) must be preserved exactly as-is. Do not change icon sizes as part of this refactor.

4. **Preserve color classes:** Some icons use custom colors (e.g., `text-forest-green`, `text-warm-amber`). All color utilities must be preserved.

5. **Smoke test each component:** After replacing icons in a component, manually test it in the browser to verify the visual appearance is identical. If an icon looks different (thicker/thinner stroke, wrong variant), investigate which Heroicons icon was actually used before.

**Example replacement:**

```diff
- <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
- </svg>
+ <UsersIcon class="w-5 h-5" />
```

### 4. Update Frontend Agent Guidelines

After the migration is complete, update `apps/frontend/AGENTS.md` to document the new icon pattern:

```diff
 ### Icons
-- **Heroicons only** - Consistent stroke width, outline/solid variants
+- **Heroicons only** - Use the `@steeze-ui/heroicons` package
+- Import icons directly: `import { UsersIcon } from '@steeze-ui/heroicons'`
+- Default to outline variant; use solid only for filled states (e.g., filled star for favorites)
 - Sizes: `w-4 h-4` (small), `w-5 h-5` (default), `w-6 h-6` (large)
```

Alternatively, if using a custom wrapper:

```diff
 ### Icons
-- **Heroicons only** - Consistent stroke width, outline/solid variants
+- **Heroicons only** - Use the `<Icon />` component from `$lib/components/Icon.svelte`
+- Example: `<Icon name="users" class="w-5 h-5" />`
+- Default to outline variant; pass `variant="solid"` for filled icons
 - Sizes: `w-4 h-4` (small), `w-5 h-5` (default), `w-6 h-6` (large)
```

---

## Benefits

1. **Bundle size reduction:** Tree-shaking eliminates unused icons. Shared icons are deduplicated in the bundle instead of repeated in every component.

2. **Type safety:** TypeScript autocomplete for icon names prevents typos and makes discovery easier.

3. **Consistency enforcement:** A single component or package enforces uniform stroke-width, viewBox, and attribute defaults. No more accidental `stroke-width="1.5"` vs `stroke-width="2"` mismatches.

4. **Easier updates:** Updating Heroicons is a single package version bump, not a manual hunt-and-replace across 73 files.

5. **Cleaner code:** Component templates become more readable without verbose path data cluttering the markup.

6. **Accessibility:** A proper package may include ARIA attributes and screen reader support out of the box.

---

## Acceptance Criteria

- [ ] A Heroicons package (or custom wrapper component) is installed and documented in `apps/frontend/AGENTS.md`
- [ ] All 73 Svelte files with inline `<svg>` icons have been migrated to use the new approach
- [ ] No visual regressions: every icon looks identical before and after the migration (same size, stroke, variant)
- [ ] All existing Tailwind size classes (`w-4 h-4`, `w-5 h-5`, `w-6 h-6`) and color classes are preserved
- [ ] A manual smoke test of key pages (Friends list, Friend detail, Circles, Encounters, Collectives, Settings, Global search) confirms icons render correctly
- [ ] The production bundle size is the same or smaller than before (verify with `pnpm --filter frontend build` and inspecting chunk sizes)
- [ ] No hardcoded path data remains in any component (verified with `grep -r 'stroke-linecap="round" stroke-linejoin="round"' apps/frontend/src` returning no results)
- [ ] `apps/frontend/AGENTS.md` is updated with the new icon usage pattern
- [ ] TypeScript compilation succeeds with no errors or warnings related to icon components

---

## Out of Scope

- **Icon design changes** - This is a refactor, not a redesign. All icons remain visually identical. Any stroke-width adjustments or icon replacements are separate issues.
- **Custom icon additions** - If the application needs non-Heroicons icons in the future, that's a separate decision. This issue only addresses the existing Heroicons usage.
- **Animated icons** - Heroicons are static. Animations (e.g., spinner loading states) are out of scope unless the chosen package provides them.
- **Icon color palette expansion** - All existing color classes are preserved as-is. Design language updates are separate from this technical refactor.
- **SVG optimization** - The chosen package is responsible for optimizing icon SVGs. Manual SVGO configuration is not in scope.

---

## Dependencies

- `apps/frontend/package.json` must be updated with the new icon package dependency
- No database or backend changes required
- No Epic dependencies; this is a pure frontend refactor

---

## Related Epics and Issues

- [Epic 14: Subresource Inline Editing](../epics/epic-14-done-subresource-inline-editing.md) - Improved UI consistency across the frontend
- [Epic 1: Friend Management](../epics/epic-01-done-friend-management.md) - Friend UI components affected by this refactor
- [Epic 10: Search Functionality](../epics/epic-10-done-search-functionality.md) - Search UI uses icons extensively
- [Epic 12: Collectives](../epics/epic-12-planned-collectives.md) - Collective components use icons
