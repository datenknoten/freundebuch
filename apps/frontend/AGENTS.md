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
- **Heroicons only** - Consistent stroke width, outline/solid variants
- Sizes: `w-4 h-4` (small), `w-5 h-5` (default), `w-6 h-6` (large)

## SvelteKit Patterns

### File Structure
```
src/
├── routes/           # Page routes
├── lib/
│   ├── components/   # Reusable components
│   ├── stores/       # Svelte stores
│   └── api/          # API client functions
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

## Accessibility

- Visible focus rings on all interactive elements
- WCAG AA contrast ratios (4.5:1 for text)
- `prefers-reduced-motion` support
- Semantic HTML elements
- ARIA labels where needed

## Commands

```bash
# From monorepo root
pnpm --filter frontend dev          # Run dev server
pnpm --filter frontend build        # Build for production
pnpm --filter frontend test         # Run tests
pnpm --filter frontend type-check   # Check types

# Or from apps/frontend/
pnpm dev
pnpm build
pnpm test
```

## Related Epics

- Epic 1: Contact Management UI
- Epic 2: Groups & Tags UI
- Epic 3: Search UI
