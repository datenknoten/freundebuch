# Frontend Guidelines

SvelteKit application with Tailwind CSS. See root [AGENTS.md](../../AGENTS.md) for general project guidelines.

## Design System

**Always reference [docs/design-language.md](../../docs/design-language.md) before making UI changes.**

### Colors
- **Forest Green** (`#2D5016`) - Primary actions, headers
- **Sage Green** (`#8B9D83`) - Secondary actions
- **Warm Amber** (`#D4A574`) - Accents, highlights

### Typography
- `font-heading` (Yanone Kaffeesatz) - All headings
- `font-body` (Merriweather) - Body text

### Icons
- **Heroicons only** - Use the `svelte-heros-v2` package (Heroicons v2 for Svelte 5)
- Import icons directly: `import UserGroup from 'svelte-heros-v2/UserGroup.svelte';`
- Usage: `<UserGroup class="w-5 h-5" strokeWidth="2" />`
- Default to outline variant; pass `variation="solid"` for filled icons
- Sizes: `w-4 h-4` (small), `w-5 h-5` (default), `w-6 h-6` (large)
- **Never use inline SVG** for Heroicons - always import from the package

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

Detail pages that repeat the same CRUD shape across sub-resource types are driven by descriptors, not by an `editingType` discriminator with parallel if/else chains. `components/collectives/subresource-descriptors.ts` is the reference: one descriptor per type (phone, email, address, URL, circle) carrying its icon, i18n keys, API calls, Row/Form components, and per-type quirks. `subresource-section.svelte` renders any of them branch-free and owns its own CRUD, modal, and shortcut state.

A section instance is reused when the page switches to another entity without unmounting, so it must drop stale in-flight loads and reset its items and modals when the entity changes.

## Testing

Component and store tests share the helpers in `src/lib/test/` — one import surface, `$lib/test`:

| Helper | Exports | Use for |
|--------|---------|---------|
| `render.ts` | `render`, `screen`, `fireEvent`, `waitFor`, `within`, `cleanup`, `tick` | Component rendering (re-exports `@testing-library/svelte`; `tick()` flushes pending state before assertions) |
| `fetch-mock.ts` | `stubFetch`, `restoreFetch`, `jsonResponse`, `unauthorizedResponse`, `nonJsonResponse` | Stubbing API responses without touching the network |
| `store-harness.ts` | `createUpdateRecorder` | Recording the states a store emits |
| `fixtures.ts` | `aFriend`, `aPhone`, `anEmail`, `anAddress`, `aUrl`, `aCollective`, … | Override-friendly test data builders |

Reach for these instead of importing `@testing-library/svelte` directly or hand-rolling a fetch stub. Svelte 5 component testing is enabled by the `svelteTesting()` Vite plugin — no per-file setup needed.

i18n is the exception: `vi.mock` is hoisted per module, so each component test declares its own mock of `$lib/i18n/index.js` whose `t` echoes the key back. Assertions then target stable translation keys rather than translated strings:

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
