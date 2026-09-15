# Design Language

Great design isn't just about looking good - it's about making your experience smooth and intuitive. This guide outlines our visual design system so everything feels consistent and polished, whether you're on your phone or desktop.

Think of this as the recipe that keeps our app feeling like *us*. Where Tailwind CSS provides sensible defaults (breakpoints, spacing scale, etc.), we use those. For the custom touches that make this app unique, we define them here.

## Color Palette

Why these colors? We wanted a palette that feels warm and approachable while maintaining professionalism. Our greens are grounded and trustworthy, while the warm amber adds just the right touch of energy.

### Primary Colors
- **Forest Green** (`#2D5016`) - Our signature color that brings warmth and trustworthiness to primary actions
  - Light variant: `#3A6B1E` - for hover states and lighter touches
  - Dark variant: `#1F3810` - for pressed states and depth
  - Used for primary actions, headers, key UI elements

### Secondary Colors
- **Sage Green** (`#8B9D83`) - the avatar fallback colour, and only that
  - Secondary *buttons* are outlined grey, not sage: two filled greens next to
    each other read as two primary actions
  - Sage carries no interactive meaning anywhere in the app

### Accent Colors
- **Warm Amber** (`#D4A574`) - "this needs attention soon"
  - Used at 30% opacity behind a countdown badge (a birthday within a week)
  - Deliberately rare: if two things on a screen are amber, neither is urgent

### Neutral Colors
Tailwind's gray scale serves as our neutral foundation - it's tried, tested, and readable.
- **Backgrounds**: `gray-50`, `gray-100` - soft and easy on the eyes
- **Text**: `gray-900`, `gray-700`, `gray-500` - clear hierarchy from headings to hints
- **Borders**: `gray-200`, `gray-300` - subtle divisions that organize without distraction

### Semantic Colors
We stick with familiar conventions so you instantly know what's happening:
- **Success**: `green-600` - celebrations and confirmations
- **Error**: `red-600` - problems that need attention
- **Warning**: `amber-600` - heads up, but not critical
- **Info**: `blue-600` - helpful information

### Accessibility Notes
Accessibility isn't optional - all our color combinations meet WCAG 2.1 AA standards (4.5:1 for normal text, 3:1 for large text) so everyone can use the app comfortably.

## Typography

We've paired **Yanone Kaffeesatz** (for headings) with **Merriweather** (for body text) to create a design that's both modern and readable. The condensed geometric sans-serif brings energy to headings, while the serif adds warmth and readability to longer text.

### Font Families
- **Headings**: Yanone Kaffeesatz - condensed, geometric, and attention-grabbing
  - Font family: `'Yanone Kaffeesatz', sans-serif`
  - Used for all headings (H1-H5), page titles, section headers
- **Body**: Merriweather - a friendly serif that's easy to read for hours
  - Font family: `'Merriweather', serif`
  - Used for body text, paragraphs, long-form content
- **Monospace**: Tailwind's `font-mono` for code and technical content

### Type Scale

Headings use Yanone Kaffeesatz at its regular weight; the typeface is condensed
enough that bolding it makes headings look cramped, so **no heading carries
`font-bold`**. The scale is exported from
[`ui/styles.ts`](../apps/frontend/src/lib/components/ui/styles.ts) as
`headingClasses`, and components use those constants rather than raw classes:

| Recipe | Classes | Where |
|---|---|---|
| `headingClasses.page` | `text-3xl font-heading text-forest` | the `h1` of a list, form or settings page (rendered by `PageShell`) |
| `headingClasses.entity` | `text-3xl font-heading text-gray-900` | the `h1` of a detail page, where the heading is the entity's name |
| `headingClasses.widget` | `text-xl font-heading text-gray-900` | dashboard widgets and modal titles |
| `headingClasses.section` | `text-lg font-heading` | the `h2` inside a tinted section header |
| `headingClasses.sub` | `text-lg font-heading text-gray-900` | `h3` group headings inside forms and cards |

The logged-out landing hero keeps `text-6xl` as the single deliberate
exception.

- **Body** (Merriweather): `font-body text-base` (16px)
- **Small**: `text-sm` (14px) for secondary copy and dense controls
- **Tiny**: `text-xs` (12px) for hints, chips and keyboard badges

### Line Height

- **Headings**: `leading-tight`
- **Body text**: `leading-relaxed`
- **UI elements**: `leading-normal`

## Spacing

Using Tailwind's spacing scale (0.25rem / 4px increments):
- Common values: `2`, `4`, `6`, `8`, `12`, `16`, `24`, `32`
- Page surfaces: `p-8`; cards and rows: `p-4` / `p-3`
- Section spacing: `space-y-4` inside a page, `space-y-6` between page regions

## Layout & Grid

### Breakpoints

Tailwind defaults: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.

### Page widths

Pages never pick their own container. `ui/page-shell.svelte` owns the width,
the grey page background (from the layout's `<main>`), the white surface, the
back link, the `h1` and the actions row. Width is chosen by page kind:

| `width` | Max width | Pages |
|---|---|---|
| `list` | `max-w-7xl` | friends, collectives, encounters, circles, profile hub, dashboard |
| `detail` | `max-w-4xl` | entity detail pages, profile subpages, legal pages |
| `form` | `max-w-2xl` | create/edit forms, onboarding |
| `narrow` | `max-w-md` | auth screens and the OAuth consent card (with `centered`) |

The navigation bar is `--nav-h` (4rem) tall and fixed; the layout renders a
spacer of the same height. No page declares `min-h-screen`.

## Surfaces, Shadows & Radius

`surfaceClasses` in `ui/styles.ts` is the full set. Radius encodes hierarchy:
`rounded-lg` for controls, cards and rows, `rounded-xl` for page surfaces and
modals, `rounded-t-2xl` for bottom sheets, `rounded-full` for chips, avatars
and the FAB.

| Recipe | Classes |
|---|---|
| `page` | `bg-white rounded-xl shadow-lg p-8` |
| `cardInteractive` | `bg-white border border-gray-200 rounded-lg p-4` + `hover:border-forest hover:shadow-sm transition-[border-color,box-shadow] duration-150` |
| `popover` | `bg-white rounded-lg shadow-lg border border-gray-200 py-1` |
| `listbox` | `bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto` |
| `modal` | `bg-white rounded-xl shadow-2xl` |
| `sheet` | `bg-white rounded-t-2xl shadow-xl` |
| `section` | `flex items-center justify-between bg-forest/10 text-forest px-3 py-1.5 rounded-lg` |
| `row` | `flex items-center justify-between p-3 bg-gray-50 rounded-lg group` |

Section headers are always the tinted variant (`bg-forest/10 text-forest`); the
filled `bg-forest text-white` header is not used.

Hover cards animate `border-color` and `box-shadow` only — never
`transition-all`.

## Z-index

Four named layers in `app.css`, referenced as `z-(--z-nav)` and friends. Never
write a numeric z-index:

| Token | Value | Used by |
|---|---|---|
| `--z-nav` | 30 | the fixed navigation bar |
| `--z-popover` | 40 | dropdowns, menus, combobox listboxes |
| `--z-fab` | 40 | the mobile floating action button |
| `--z-overlay` | 50 | the search overlay and the nav drawer |

Modals are outside the scale: a native `<dialog>` opened with `showModal()`
renders in the top layer, where the browser stacks dialogs by open order and
ignores `z-index` entirely.

## Interactive States

- **Hover lightens**: `hover:bg-forest-light`. **Pressed darkens**:
  `active:bg-forest-dark`. That is the whole rule for forest surfaces.
- **Focus**: keyboard only. Every interactive element uses `focusRing`
  (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest
  focus-visible:ring-offset-2`) or, for text inputs, the `focus-visible:` ring
  baked into `formClasses`. A plain `focus:` style is a bug.
- **Disabled**: `disabled:opacity-50 disabled:cursor-not-allowed`.
- **Transitions**: `transition-colors` with Tailwind's default 150ms. An
  explicit `duration-*` appears in exactly four places, all of them animating
  something other than colour: `surfaceClasses.cardInteractive`, the row
  actions' and swipeable row's `transition-opacity`, and the user menu's
  `transition-transform` chevron.

## Components

Everything below is a component, not a class string to copy. The components
live in `apps/frontend/src/lib/components/ui/` and are re-exported from
`$lib/components/ui`.

### Button — `ui/button.svelte`

```svelte
<Button variant="primary" size="md" loading={isSaving} onclick={save}>Save</Button>
<Button href="/friends/new" variant="secondary">Add friend</Button>
```

| Variant | Appearance |
|---|---|
| `primary` | `bg-forest text-white hover:bg-forest-light active:bg-forest-dark` |
| `secondary` | outlined: `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50` |
| `secondaryAccent` | outlined in the accent colour: `bg-white border border-forest text-forest hover:bg-forest/10` (an active filter) |
| `ghost` | `text-gray-700 hover:bg-gray-100` |
| `ghostAccent` | `text-forest hover:bg-forest/10` (borderless action that reads as a link: "clear filters", "add detail", retry) |
| `danger` | `bg-red-600 text-white hover:bg-red-700` |
| `dangerOutline` | `border border-red-300 text-red-600 hover:bg-red-50` |
| `caution` | `bg-amber-600 text-white hover:bg-amber-700` (reversible but disruptive actions) |

Sizes: `xs` (`px-2 py-1 text-xs`), `sm` (`px-3 py-1.5 text-sm`), `md`
(`px-4 py-2`, default), `lg` (`px-8 py-3 text-lg`). `block` makes it full
width, `href` renders an anchor, and `loading` disables the control and renders
the shared spinner — a loading button never swaps its label.

Extra classes stay layout-only (`mt-3`, `flex-1`). A colour that fights a
variant means the variant is missing: add one to `buttonVariants` instead of
reaching for Tailwind's important suffix.

### Surfaces and text

`buttonClasses(variant, size)` exists for the rare element that must not be a
`<button>` or `<a>`. `linkClasses.back` is the back link, and `codeClasses`
covers `block`, `blockLg`, `inline` and `kbd`.

### Form controls — `ui/form-*.svelte`

`FormInput`, `FormSelect`, `FormTextarea` and `FormCheckbox` own the label, the
required marker, the optional marker, the helper line and the error line
(`aria-invalid` plus `aria-describedby`). A field with a visible label is a
primitive; a control inside a composite widget (a combobox with its own
listbox) stays a raw element with `formClasses.input` / `inputSm` /
`checkbox`, and its panel uses `surfaceClasses.listbox`.

Every label is `formClasses.label`. There is no second label recipe.

### Feedback

- **Inline only**: there is no toast system. Errors and confirmations render
  where they happen, through `alert-banner.svelte`, which carries a coloured
  left border per variant and the right role (`alert` for errors, `status`
  otherwise). The one floating surface is the bottom-left keyboard-shortcut
  hint, which belongs to the shortcut system.
- **Loading**: `ui/spinner.svelte` (`role="status"`, three sizes, `tone` for
  coloured backgrounds). Nothing draws its own ring.
- **Nothing here**: `ui/empty-state.svelte` — icon, title, optional
  description and hint, actions slot, and a `tone="error"` for not-found and
  failure states.

### Dialogs — `ui/modal.svelte`, `ui/confirm-dialog.svelte`

Modals are native `<dialog>` elements opened with `showModal()`, which gives
the focus trap, Escape handling and an inert background from the platform.
`Modal` takes `title`, `subtitle`, `size` (`md`/`lg`/`xl`), `variant` (`center`
or a mobile `sheet`), `closable`, `fullscreen` and a `footer` snippet. The
backdrop is `bg-gray-900/50` everywhere. A modal that must not be dismissed
passes `closable={false}`; it also re-opens itself if the platform closes the
dialog behind the component's back (Chrome makes a second Escape
non-cancelable).

Every destructive action goes through `ConfirmDialog`, which names the item,
states that the action cannot be undone, and keeps itself open with the reason
when the request fails. `confirmVariant` picks `danger` (default), `caution` or
`primary`.

Because the platform owns Escape, the keyboard-shortcut guard must never call
`preventDefault()` on it while a modal is open.

### Chips and badges

`chipClasses.base` (`inline-flex items-center gap-1 rounded-full px-2 py-0.5
text-xs font-body font-medium`) plus one tone: `forest`, `tint` or `neutral`.
Categorical palettes — relationship categories (rose/blue/green) and collective
types — are **data colours**, not brand colours; each lives in exactly one
module under `lib/utils/`.

### Detail sections

A friend's or collective's sub-resources render through
`lib/components/subresources/subresource-section.svelte`, driven by a
descriptor. Empty sections stay hidden; the add-detail dropdown (desktop) and
sheet (mobile) are the entry point for adding the first one.

### Navigation and page furniture

- **`ui/fab.svelte`** — the mobile floating action button. One instance per
  page; it carries both `aria-label` and `title` so the icon has a name for
  screen readers and for pointer users.
- **`ui/search-input.svelte`** — the search field on every list page: leading
  magnifier, clear button, optional `busy` spinner, `data-search-input` for
  the shortcut layer. A list page never hand-rolls a search field.
- **`tab-nav.svelte`** — the tab strip in the setup guides, with `role="tab"`,
  `aria-selected` and roving tabindex.
- **`keyboard-hint-badge.svelte`** — the numbered badge a row shows while an
  "open link" chord is armed.
- **`legal-links.svelte`** — the privacy/terms/imprint pair, shared by the
  footer and the mobile drawer so the two never drift.

These four live in `lib/components/`, not `lib/components/ui/`, because they
know about app concepts (shortcuts, routes) rather than being pure primitives.

### Unsaved-changes tracking

`ui/dirty-tracker.svelte.ts` exports `createDirtyTracker(trackFn, onchange)`,
an effect that fires `onchange` the first time any tracked field changes and
skips the initial run. Every edit form uses it to tell its dialog it is dirty;
nothing hand-rolls the "skip the first run" guard.

## Animation & Transitions

- **Colour feedback**: `transition-colors`, default duration.
- **Card hover**: `transition-[border-color,box-shadow] duration-150`.
- **Sheets**: `animate-slide-up`.
- **Reduced motion**: `app.css` collapses every animation and transition to
  0.01ms under `prefers-reduced-motion: reduce`. Spinners stay visible, they
  simply stop turning.

## Iconography

We use **Heroicons** through [`svelte-heros-v2`](https://www.npmjs.com/package/svelte-heros-v2)
— never inline SVG markup. Import each icon from its own module so the bundle
only carries what a component uses:

```svelte
<script lang="ts">
import UserCircle from 'svelte-heros-v2/UserCircle.svelte';
</script>

<UserCircle class="w-5 h-5 text-gray-600" strokeWidth="2" />
```

Every icon in the app passes `strokeWidth="2"`.

### Sizes

- **Small**: `w-4 h-4` — inside buttons, rows and chips
- **Medium**: `w-5 h-5` — section headings, navigation
- **Large**: `w-6 h-6` — the FAB, sheet entries
- **XL**: `w-12 h-12` — empty states

### Colour

Default `text-gray-400` for decorative icons, `text-forest` for active or
branded ones, and `currentColor` inside buttons.

## Accessibility

### Focus

Visible rings on every interactive element, keyboard-only via
`focus-visible:`. Anything clickable is a real `<button>` or `<a>`: no
`role="link"` rows, no `tabindex="0"` divs.

### Colour contrast

All text meets WCAG 2.1 AA (4.5:1 normal, 3:1 large). Icons that carry meaning
have a translated `aria-label`.

### Motion and zoom

`prefers-reduced-motion` is honoured globally, and the viewport meta does not
restrict zoom.

### Light only

The app ships a single light theme and declares `color-scheme: light`, so
user-agent controls stay light instead of rendering dark widgets on white
surfaces. There is no dark mode.

## Custom Tailwind Configuration

We're on **Tailwind CSS 4**, so the design tokens live in CSS, not in a JS
config file. The source of truth is the `@theme` block in
[`apps/frontend/src/app.css`](../apps/frontend/src/app.css):

```css
@theme {
  /* Custom colors */
  --color-forest: #2d5016;
  --color-forest-light: #3a6b1e;
  --color-forest-dark: #1f3810;
  --color-sage: #8b9d83;
  --color-amber-warm: #d4a574;

  /* Custom fonts */
  --font-heading: "Yanone Kaffeesatz", sans-serif;
  --font-body: Merriweather, serif;

  /* Layering and layout */
  --z-nav: 30;
  --z-popover: 40;
  --z-fab: 40;
  --z-overlay: 50;
  --nav-h: 4rem;
}
```

Where each brand colour is actually used:

- **forest / forest-light / forest-dark** — primary actions, headings, active
  states; light on hover, dark on press.
- **sage** — avatar initials only. It is not the secondary button colour; the
  secondary button is outlined grey.
- **amber-warm** — "needs attention soon" badges, such as a birthday within a
  week.

### Fonts

Both fonts are self-hosted as `woff2` files in `apps/frontend/static/fonts/`
and registered via `@font-face` in `app.css` — no Google Fonts requests, in
keeping with our privacy-first principle. Available weights:

**Yanone Kaffeesatz:** Regular (400), Bold (700)

**Merriweather:** Light (300), Regular (400), Bold (700)

### Usage

- Colors: `bg-forest`, `text-forest-light`, `border-sage`, `text-amber-warm`
- Typography: `font-heading`, `font-body`
- Recipes: import from `$lib/components/ui` (`surfaceClasses`, `chipClasses`,
  `headingClasses`, `linkClasses`, `codeClasses`, `formClasses`, `focusRing`)
