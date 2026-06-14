---
target: friend detail
total_score: 26
p0_count: 0
p1_count: 2
timestamp: 2026-06-14T08-26-30Z
slug: nd-src-lib-components-friends-friend-detail-svelte
---
# Critique: Friend Detail

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Spinner + last-seen badge + delete progress; loading is a spinner, not a skeleton |
| 2 | Match System / Real World | 3 | Warm terminology is strong; EN labels ("Home", "Primary", "Close Friends") leak into the DE UI |
| 3 | User Control and Freedom | 3 | Back link + modal cancel + delete confirm; no undo after delete, modal lacks Esc |
| 4 | Consistency and Standards | 2 | `bg-opacity-50` (Tailwind v3) is dead in v4; scrim color differs from DESIGN.md; hardcoded z-50 |
| 5 | Error Prevention | 3 | Delete confirmation present and clear |
| 6 | Recognition Rather Than Recall | 3 | Actions labeled and visible; keyboard hints exist |
| 7 | Flexibility and Efficiency | 3 | Real keyboard shortcuts (e=edit, o=open link), FAB, add dropdown |
| 8 | Aesthetic and Minimalist Design | 2 | 15 solid forest-green header bars dominate; decorative green at scale; off-palette teal chips |
| 9 | Error Recovery | 2 | Not-found state is good; delete failure only `console.error` — silent to the user |
| 10 | Help and Documentation | 2 | Keyboard hints exist; no empty-state teaching, no contextual help |
| **Total** | | **26/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment:** Does not read as generic AI slop — terminology and brand voice are distinctive and warm. BUT the page reads more like a colorful admin tool than a "well-loved book." The cause: every content section is capped by a full-width, fully-saturated forest-green bar. That is decorative green at scale, which directly violates this project's own Earned-Green Rule (forest = act/active, not decorative surface). The warmth that should come from serif type + restraint is buried under green.

**Deterministic scan:** detect.mjs returned 2 `border-accent-on-rounded` warnings (route `[id]/+page.svelte:53`, `[id]/edit/+page.svelte:40`). Both are FALSE POSITIVES — `border-b-2 border-forest` on a `rounded-full` element is the CSS loading spinner, not an accent stripe. No true slop antipatterns detected by the scanner; the real issues are aesthetic/brand-fit and one CSS bug, surfaced by review.

## Overall Impression

A capable, feature-rich detail page with genuinely good power-user ergonomics (keyboard shortcuts, FAB, progressive disclosure of empty sections). It is held back by one dominant visual decision — the solid green section bars — and a small set of consistency/contrast defects. Biggest opportunity: quiet the section headers so forest green means "action" again, and let the serif + whitespace carry the warmth.

## What's Working

- **Brand voice in the UI**: "Zuletzt gesehen: vor 2 Tagen", Freundekreise, warm German copy. This is the friendship-book register, not CRM.
- **Power-user ergonomics**: `data-shortcut="e"`, the "o" open-link index system, long-press FAB with create menu. Real flexibility most apps skip.
- **Progressive disclosure**: empty sections hide themselves; the page only shows what the friend actually has.

## Priority Issues

- **[P1] Solid forest-green section-header bars (15 sections)**: `bg-forest text-white px-3 py-1.5 rounded-lg` repeats across every section component. Fully-saturated green at this scale dominates the page and breaks the Earned-Green Rule (green should signal action, not decorate every header). It makes a warm friendship book look like a green admin dashboard.
  - **Fix**: Demote section headers to forest **text** + icon on transparent (or a quiet sage/gray-50 tint) with a hairline divider, and reserve solid forest for the actual "+ Add" button so the interactive thing is the saturated thing.
  - **Suggested command**: /impeccable quieter
- **[P1] Delete-modal scrim is opaque black (Tailwind v4 bug)**: `bg-black bg-opacity-50` — `bg-opacity-*` was removed in Tailwind v4 (this project), so the utility is a no-op and the destructive-action backdrop renders fully opaque black, not a 50% scrim. Jarring at the highest-stakes moment.
  - **Fix**: Use `bg-gray-900/50` (the DESIGN.md scrim token). Audit the repo for other `bg-opacity-*` / `text-opacity-*` survivors.
  - **Suggested command**: /impeccable harden
- **[P2] Contrast fails on small gray-500 text**: nickname (`text-gray-500 text-sm`) and the "how we met" date (`text-gray-600`) — gray-500 (#6b7280) on white is ~4.0:1, under AA 4.5:1 for this size. DESIGN.md forbids gray-500 for running prose.
  - **Fix**: Bump to gray-700 (#374151) for these; keep gray-500 only for the metadata footer.
  - **Suggested command**: /impeccable audit
- **[P2] Add affordances blur together**: the per-section "+ hinzufügen" is white-on-green INSIDE the decorative green bar (no distinct button shape), and the header also has a "Hinzufügen" dropdown. Two add paths, and the inline one doesn't look clickable.
  - **Fix**: Give the inline add a real button affordance once the header is quieted; clarify the relationship between header-add and section-add.
  - **Suggested command**: /impeccable layout
- **[P2] Off-palette teal chips**: the "Primary" address badge and "Close Friends" circle pill render teal/cyan, outside the forest/sage/amber palette. If these are user-assigned circle colors, fine; if hardcoded, they clash.
  - **Fix**: Confirm source; if hardcoded, map to palette (forest tint for system labels).
  - **Suggested command**: /impeccable colorize

## Persona Red Flags

**Sam (Accessibility-Dependent)**: gray-500 nickname/date fail AA contrast. Delete modal is a hand-rolled `<div>`, not `<dialog>` — no focus trap, no Esc dismiss, focus not moved into it. Address state shown via color chips ("Home"/"Primary") — meaning leans on color.

**Alex (Power User)**: Mostly satisfied — edit shortcut, link-open shortcut, FAB. Friction: delete modal can't be dismissed with Esc; no keyboard path to confirm/cancel destructive action.

**Casey (Mobile)**: FAB bottom-right is in the thumb zone — good. But primary Edit/Delete actions sit at the top of the header, out of thumb reach on a long page. State survives via the friends store.

## Minor Observations

- Loading is a centered spinner; product register prefers a skeleton of the detail layout.
- Delete failure path only logs to console — user sees the modal close with no feedback (should surface an error toast).
- Hardcoded `z-50` / `z-40` instead of a semantic z-index scale.
- Address entry renders as a bordered sub-container inside the main white card — mild nested-card feel.

## Questions to Consider

- What if section headers were near-invisible — forest-text label + icon + hairline — and the only saturated green on the page was the primary action?
- Does a friendship book need a colored bar over every section at all, or would whitespace + a serif label feel warmer?
- What would the highest-stakes moment (delete) look like if it reassured instead of flashing an opaque black void?
