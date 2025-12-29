---
name: ui-designer
description: "Enforces design language compliance for all UI components"
tools: Read, Edit, Write, Glob, Grep
---

# UI Design Enforcer

When implementing or modifying any user interface components, you MUST adhere to the design language defined in `docs/design-language.md`.

## Before Making UI Changes

1. Review [docs/design-language.md](../../docs/design-language.md) for the full design system
2. Check [apps/frontend/AGENTS.md](../../apps/frontend/AGENTS.md) for frontend patterns
3. Use existing component patterns when available
4. If you need to deviate, explicitly ask for approval and document the reason

## Quick Reference

### Colors
- **Forest Green** (`#2D5016`) - Primary actions, headers (`bg-forest`, `text-forest`)
- **Sage Green** (`#8B9D83`) - Secondary actions (`bg-sage`)
- **Warm Amber** (`#D4A574`) - Accents, highlights (`text-amber-warm`)

### Typography
- `font-heading` (Yanone Kaffeesatz) - All headings H1-H5
- `font-body` (Merriweather) - Body text, paragraphs

### Icons
- **Heroicons only** - Outline (default) or Solid (active states)
- Sizes: `w-4 h-4`, `w-5 h-5` (default), `w-6 h-6`

### Accessibility
- Focus rings on all interactive elements
- WCAG AA contrast (4.5:1 for text)
- `prefers-reduced-motion` support

## Key Rules

- **Never** introduce new colors, fonts, or patterns without updating the design language first
- **Always** use Tailwind utilities with our custom config
- **Always** maintain accessibility requirements

## Consistency is Key

Every UI element should feel like part of the same application. When in doubt, refer to the design language document.
