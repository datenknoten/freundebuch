# Frontend Guidelines

SvelteKit application with Tailwind CSS. See root [AGENTS.md](../../AGENTS.md) for general project guidelines.

## Design System

**Always reference [docs/design-language.md](../../docs/design-language.md) before making UI changes.**

### Use the shared primitives, never a new class string

`src/lib/components/ui/` is the API, plus `AlertBanner`, `TabNav`,
`LegalLinks` and `KeyboardHintBadge`, which live one level up in
`src/lib/components/` because they know about app concepts rather than being
pure primitives. Composing a button, dialog, empty state or page frame out of
raw Tailwind classes is how the app ended up with nine primary-button recipes;
import instead:

- `Button` (variants primary/secondary/secondaryAccent/ghost/ghostAccent/danger/dangerOutline/caution, sizes xs–lg, `href`, `loading`, `block`)
- `Modal` (native `<dialog>`) and `ConfirmDialog` — every destructive action confirms through the latter
- `Spinner`, `EmptyState`, `Fab`, `SearchInput`, `PageShell` — `PageShell` owns page width, surface, back link, `h1` and actions
- `AlertBanner` (inline feedback; there is no toast system), `TabNav`, `LegalLinks`, `KeyboardHintBadge`
- `FormInput` / `FormSelect` / `FormTextarea` / `FormCheckbox`, or `formClasses.*` for controls inside composite widgets
- `createDirtyTracker` for "has this form changed" instead of a hand-rolled first-run guard
- Recipes: `surfaceClasses`, `chipClasses`, `headingClasses`, `linkClasses`, `codeClasses`, `focusRing`, `buttonClasses`

A friend's or collective's CRUD sections are data-driven: add a descriptor in
`friends/subresource-descriptors.ts` or `collectives/subresource-descriptors.ts`
and render `subresources/subresource-section.svelte`. Do not write a new
section component.

### Colors
- **Forest Green** (`bg-forest`) - primary actions and headings; `forest-light` on hover, `forest-dark` on press
- **Sage Green** (`bg-sage`) - avatar fallback only; the secondary button is outlined grey
- **Warm Amber** (`amber-warm`) - "needs attention soon" badges, used sparingly
- Z-index only through the tokens: `z-(--z-nav|--z-popover|--z-fab|--z-overlay)`; native `<dialog>` modals need none (top layer)

### Typography
- `font-heading` (Yanone Kaffeesatz) - all headings, never `font-bold`
- `font-body` (Merriweather) - body text
- Heading sizes come from `headingClasses`, not literal `text-*` classes

### Icons
- **Heroicons only** - Use the `svelte-heros-v2` package (Heroicons v2 for Svelte 5)
- Import icons directly: `import UserGroup from 'svelte-heros-v2/UserGroup.svelte';`
- Usage: `<UserGroup class="w-5 h-5" strokeWidth="2" />`
- Default to outline variant; pass `variation="solid"` for filled icons
- Sizes: `w-4 h-4` (small), `w-5 h-5` (default), `w-6 h-6` (large)
- **Never use inline SVG** for Heroicons - always import from the package

### Accessibility
- Focus styling is `focus-visible:` (use `focusRing`); a plain `focus:` ring is a bug
- Every user-visible string, including `aria-label` and `<title>`, goes through i18n in both `en.json` and `de.json`

## SvelteKit Patterns

### File Structure
```
src/
├── routes/           # Page routes
├── lib/
│   ├── components/   # Reusable components
│   ├── stores/       # Svelte stores
│   ├── api/          # API client functions
│   └── test/         # Shared test helpers (see Testing below)
```

### Components
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Props with `let { prop } = $props()`
- Keep components focused and small
- Extract reusable logic into stores or utilities

### Stores
- Use Svelte stores for shared state
- API responses cached in stores
- Auth state managed centrally in `stores/auth.ts`

### API Client
- All API calls go through `lib/api/` modules
- Use `ApiError` class for error handling
- Token refresh handled automatically
- Same-origin requests in production (empty `VITE_API_URL`)

### Data-Driven Sections

Detail pages that repeat the same CRUD shape across sub-resource types are driven by descriptors, not by an `editingType` discriminator with parallel if/else chains. `components/collectives/subresource-descriptors.ts` is the reference: one descriptor per type (phone, email, address, URL, circle) carrying its icon, i18n keys, API calls, Row/Form components, and per-type quirks. `subresource-section.svelte` renders any of them and owns its own CRUD, modal, and shortcut state; the only branch it keeps is the one for a type whose add flow needs a component of its own (friend → collective).

A section instance is reused when the page switches to another entity without unmounting, so it must drop stale in-flight loads and reset its items and modals when the entity changes.

## Testing

Component and store tests share the helpers in `src/lib/test/` — one import surface, `$lib/test`:

| Helper | Exports | Use for |
|--------|---------|---------|
| `render.ts` | `render`, `screen`, `fireEvent`, `waitFor`, `within`, `cleanup`, `tick`, `control`, `labelFor` | Component rendering (re-exports `@testing-library/svelte`; `tick()` flushes pending state before assertions; `control(id)`/`labelFor(id)` look up a field and its label) |
| `fetch-mock.ts` | `stubFetch`, `restoreFetch`, `jsonResponse`, `unauthorizedResponse`, `nonJsonResponse` | Stubbing API responses without touching the network |
| `store-harness.ts` | `createUpdateRecorder` | Recording the states a store emits |
| `fixtures.ts` | `aFriend`, `aPhone`, `anEmail`, `anAddress`, `aUrl`, `aCollective`, … | Override-friendly test data builders |
| `locale.ts` | `useLanguage`, `withDefaultLocale` | `useLanguage('en'\|'de')` boots i18next with the real bundles; `withDefaultLocale` pins the default locale for date/number formatting |
| `setup.ts` | — (loaded by Vitest) | jsdom has no `<dialog>` behaviour; the shim supplies `showModal`/`close` and queues the `close` event like the platform does |

Reach for these instead of importing `@testing-library/svelte` directly or hand-rolling a fetch stub. Svelte 5 component testing is enabled by the `svelteTesting()` Vite plugin — no per-file setup needed.

Anything rendered through `toLocaleDateString` and friends depends on the machine: Node fixes its default locale from `LANG` at startup, so asserting a bare `"May"` passes in CI and fails on a `de_DE` laptop. Assert locale-independent facts, or wrap the render in `withDefaultLocale('en-US', …)` and assert the full formatted string. `TZ` is pinned to UTC in `vite.config.ts`, so date-only values do not drift a day in western timezones.

There are two i18n strategies, and the assertion decides which:

- **Wiring, roles, structure** → mock `$lib/i18n/index.js` so `t` echoes the
  key. Assertions then target stable key paths rather than copy, and no test
  breaks when a sentence is reworded:

```ts
vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => {};
    },
  }),
}));
```

- **The copy itself** (a field is labelled, a string is translated at all) →
  `await useLanguage('en')` (or `'de'`) in `beforeAll` and assert the real
  bundle text. An echo mock cannot catch a hard-coded English literal; this
  can.

Coverage is reported per PR at an 80% threshold — see [docs/development.md](../../docs/development.md#coverage-reporting).

## Internationalization (i18n)

**All user-facing text must use the i18n system - never hardcode strings.**

### Using Translations
```svelte
<script>
import { createI18n } from '$lib/i18n/index.js';
const i18n = createI18n();
</script>

<!-- In template -->
{$i18n.t('section.key')}
{$i18n.t('section.keyWithParam', { name: 'value' })}
```

### Locale Files
- `src/lib/i18n/locales/en.json` - English translations
- `src/lib/i18n/locales/de.json` - German translations

### Adding New Translations
1. Add keys to both `en.json` and `de.json`
2. Use nested keys: `"friendDetail.sections.phoneNumbers"`
3. Support interpolation: `"Hello, {{name}}!"`
4. Keep translations organized by feature/component

### Common Sections
- `common.*` - Shared buttons, labels (save, cancel, delete, etc.)
- `nav.*` - Navigation items
- `friends.*` - Friends feature
- `circles.*` - Circles feature
- `friendDetail.*` - Friend detail page sections
- `dashboard.*` - Dashboard widgets
- `globalSearch.*` - Search modal
- `facets.*` - Filter/facet labels

## Accessibility

- Visible focus rings on all interactive elements
- WCAG AA contrast ratios (4.5:1 for text)
- `prefers-reduced-motion` support
- Semantic HTML elements
- ARIA labels where needed

## Commands

```bash
# From monorepo root
aube --filter @freundebuch/frontend dev          # Run dev server
aube --filter @freundebuch/frontend build        # Build for production
aube --filter @freundebuch/frontend test         # Run tests
aube --filter @freundebuch/frontend type-check   # Check types

# Or from apps/frontend/
aube dev
aube build
aube test
```

## Related Epics

- Epic 1: Contact Management UI
- Epic 2: Groups & Tags UI
- Epic 3: Search UI
