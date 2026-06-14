---
name: Freundebuch
description: A digital friendship book for adults — warm, personal, privacy-first relationship keeping.
colors:
  forest: "#2d5016"
  forest-light: "#3a6b1e"
  forest-dark: "#1f3810"
  sage: "#8b9d83"
  amber-warm: "#d4a574"
  ink: "#111827"
  body-text: "#374151"
  muted-text: "#6b7280"
  surface: "#ffffff"
  bg: "#f9fafb"
  border: "#e5e7eb"
  border-strong: "#d1d5db"
  success: "#16a34a"
  error: "#dc2626"
  warning: "#d97706"
  info: "#2563eb"
typography:
  display:
    fontFamily: "Yanone Kaffeesatz, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "Yanone Kaffeesatz, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "normal"
  title:
    fontFamily: "Yanone Kaffeesatz, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Merriweather, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  label:
    fontFamily: "Merriweather, serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.75rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.forest-light}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-secondary:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
---

# Design System: Freundebuch

## 1. Overview

**Creative North Star: "The Garden Almanac"**

Freundebuch is a place you tend, not a database you query. The visual system treats relationships the way an almanac treats a garden: forest green for things rooted and trustworthy, sage for the calm supporting growth, warm amber for the small seasonal sparks worth noticing. Nothing here should feel like business software — it should feel like a warm, attentive notebook that remembers the people you care about so you don't have to. Warmth is carried by the serif body type, the condensed friendly headings, and generous breathing room — never by decoration for its own sake.

Density is low and calm. Surfaces are soft white cards floating on a near-white ground, with gently rounded corners and a quiet lift of shadow. The common path stays obvious; advanced power is disclosed progressively. The voice is "a helpful friend who knows their stuff" — professional yet fun, warm yet precise.

This system explicitly **rejects the CRM/sales aesthetic** (dense data grids, pipeline metrics, lead language), **cold enterprise SaaS**, **social-network feed patterns**, and **generic AI slop** — identical icon-heading-text card grids, muted-gray body text on tinted near-white, tiny tracked uppercase eyebrows on every section, colored side-stripe borders, and gradient text.

**Key Characteristics:**
- Warm and human, never clinical — "opening a well-loved book," not opening a dashboard.
- Nature palette: grounded greens + one amber spark, used sparingly.
- Condensed sans headings (Yanone Kaffeesatz) paired with a readable serif body (Merriweather).
- Soft, gently-elevated cards: rounded-xl corners, a single calm shadow.
- Privacy-first restraint: nothing implies data leaves the user's hands.

## 2. Colors

A nature-derived palette — grounded greens carry trust and structure, a single warm amber provides the spark, neutrals stay quiet and readable.

### Primary
- **Forest Green** (`#2d5016`): The signature color. Primary actions, active nav states, links, key UI accents, focus rings. **Forest Light** (`#3a6b1e`) is the hover/lighter touch; **Forest Dark** (`#1f3810`) is pressed/depth.

### Secondary
- **Sage Green** (`#8b9d83`): A softer companion for secondary buttons and supporting elements. Creates hierarchy without competing with forest.

### Tertiary
- **Warm Amber** (`#d4a574`): The accent spark. Reserved for highlights, active states, and gentle notifications. Used sparingly — its rarity is what gives it energy.

### Neutral
- **Ink** (`#111827`, gray-900): Headings and high-emphasis text.
- **Body Text** (`#374151`, gray-700): Default running text on white — meets ≥4.5:1.
- **Muted Text** (`#6b7280`, gray-500): Hints, metadata, timestamps. Never for primary running prose.
- **Surface** (`#ffffff`): Cards and raised panels.
- **Background** (`#f9fafb`, gray-50): The app ground.
- **Border** (`#e5e7eb`, gray-200) / **Border Strong** (`#d1d5db`, gray-300): Subtle divisions and input strokes.

### Semantic
- **Success** (`#16a34a`), **Error** (`#dc2626`), **Warning** (`#d97706`), **Info** (`#2563eb`). Familiar conventions so state reads instantly.

### Named Rules
**The Amber Spark Rule.** Warm amber appears on ≤10% of any screen. It is a seasonal highlight, not a structural color — the moment it carries layout, it stops being special.

**The Earned-Green Rule.** Forest green means "act" or "active." Don't paint decorative surfaces forest; reserve it for primary actions, the current nav item, and links, so its meaning stays legible.

## 3. Typography

**Display Font:** Yanone Kaffeesatz (with sans-serif fallback)
**Body Font:** Merriweather (with serif fallback)
**Label Font:** Merriweather (medium weight)

**Character:** A true contrast pairing — a condensed geometric sans brings friendly energy to headings, while a warm humanist serif makes long-form notes and friend pages comfortable to read for minutes at a time. Both are self-hosted as woff2 (no Google Fonts requests) in keeping with the privacy-first principle.

### Hierarchy
- **Display** (Yanone Bold 700, ~2.25rem/36px, line-height 1.1): Page titles ("Your Freundebuch", a friend's name).
- **Headline** (Yanone Bold 700, ~1.875rem/30px, 1.15): Major section headers.
- **Title** (Yanone Semibold 600, ~1.5rem/24px, 1.2): Card titles, sub-sections.
- **Body** (Merriweather 400, 1rem/16px, line-height 1.625): Running prose, notes, descriptions. Cap measure at 65–75ch.
- **Label** (Merriweather Medium 500, 0.875rem/14px): Form labels, metadata, chips.

### Named Rules
**The Serif-Body Rule.** Body copy is always the serif (Merriweather). Switching body to the condensed sans for "cleanliness" kills the warmth — the serif IS the well-loved-book feel.

**The Heading Restraint Rule.** Yanone is condensed; let it be large but never tighten letter-spacing below -0.04em, and keep the display ceiling at ~36px in app context. This is an app, not a billboard.

## 4. Elevation

A gently-elevated system, not a flat one. Cards rest with a soft shadow that lifts them just off the near-white ground — the "warm & rounded, gently elevated" feel. Depth is calm and ambient, never harsh; there are no hard drop shadows or 2014-era dark blurs.

### Shadow Vocabulary
- **Rest** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` — Tailwind `shadow-lg`): The default for content cards.
- **Subtle** (`shadow-sm`): Inline chips, small surfaces at rest.
- **Prominent** (`shadow-xl`): Modals, popovers, the mobile menu drawer.

### Named Rules
**The Soft-Lift Rule.** If a shadow looks like a dark line under the card, it's wrong — the blur is too small or the alpha too high. Lift should read as warm light from above, diffuse and gentle.

## 5. Components

The feel across the board: **warm & rounded, gently elevated** — inviting, tactile-but-soft, never clinical.

### Buttons
- **Shape:** Gently curved (`rounded-lg`, 0.75rem).
- **Primary:** Forest green background, white text, semibold serif. Padding ~`0.5rem 1rem` (px-4 py-2); wider variants use px-4 py-3 full-width. `inline-flex items-center gap-2` for icon+label.
- **Hover / Focus:** Hover lightens to Forest Light (`#3a6b1e`) via `transition-colors`. Focus shows a forest ring (`focus:ring-2 focus:ring-forest`), keyboard-only via `focus-visible`.
- **Secondary:** Sage background, ink text. **Ghost:** forest text, `hover:bg-gray-100`.
- **Disabled:** `opacity-50` + `cursor-not-allowed`.

### Chips / Tags
- **Style:** Soft forest tint — `bg-forest/10 text-forest`, `rounded-full`, small serif. Hover deepens to `bg-forest/20`.
- **State:** Used for tags (#hiking), circle pills, and counts.

### Cards / Containers
- **Corner Style:** Generous — `rounded-xl` (0.75rem+) is the live default for content cards.
- **Background:** Surface white (`#ffffff`) on the gray-50 ground.
- **Shadow Strategy:** `shadow-lg` at rest (see Elevation).
- **Border:** Usually none — the shadow does the separating. Dividers inside use `border-gray-200`.
- **Internal Padding:** `p-6` (1.5rem) standard.

### Inputs / Fields
- **Style:** White field, `border-gray-300`, `rounded-lg`, `px-3 py-2`, serif text.
- **Focus:** `ring-2 ring-forest` with `border-transparent` — a forest glow, not a hard border shift.
- **Error / Disabled:** Error text `text-red-600`; required marker is a red asterisk. Disabled `opacity-50 cursor-not-allowed`.
- **Label:** `text-sm font-medium text-gray-700`, sits above the field.

### Navigation
- **Style:** Sidebar/top items as `rounded-md` rows, serif medium, icon + label with `gap-2`.
- **States:** Default `text-gray-700`; hover `bg-gray-100 hover:text-forest`; active forest. `transition-colors duration-200`.
- **Mobile:** Off-canvas drawer (`w-64`, `bg-white shadow-lg`) sliding in over a `bg-gray-900/50` scrim, `transition-transform duration-200 ease-in-out`.

### Iconography
- **Heroicons** via `svelte-heros-v2` — never inline SVG markup. Outline default (1.5px stroke), Solid for active. Sizes w-4/w-5/w-6; color inherits or `text-forest` when active.

## 6. Do's and Don'ts

### Do:
- **Do** keep body copy in Merriweather serif and cap line length at 65–75ch — the serif is the warmth.
- **Do** reserve forest green for actions/active state and amber for ≤10% sparks (the Earned-Green and Amber Spark rules).
- **Do** float content on soft `rounded-xl` `shadow-lg` cards over the gray-50 ground.
- **Do** verify contrast: body text uses gray-700 (`#374151`) or darker on white; never muted gray-500 for running prose.
- **Do** show a forest `ring-2` focus state on every interactive element, keyboard-visible.
- **Do** honor `prefers-reduced-motion` — the `slide-up` toast animation already disables under it; every new motion needs the same fallback.
- **Do** write warm, human copy: "Added to your Freundebuch!" not "Contact created successfully."

### Don't:
- **Don't** build the CRM/sales aesthetic — dense data grids, pipeline metrics, or lead/touchpoint/contact language. We are a friendship book, not a CRM.
- **Don't** ship cold enterprise-SaaS surfaces or social-network feed patterns (follower counts, engagement bait).
- **Don't** fall into generic AI slop: identical icon-heading-text card grids, muted-gray body text on tinted near-white, tiny uppercase tracked eyebrows on every section.
- **Don't** use colored side-stripe borders (`border-left` >1px as an accent) on cards or alerts — use full borders, background tints, or leading icons.
- **Don't** use gradient text (`background-clip: text`) or decorative glassmorphism.
- **Don't** tighten Yanone heading letter-spacing below -0.04em or push display past ~36px in app context — this is an app, not a billboard.
- **Don't** swap body type to the condensed sans for "cleanliness" — it kills the well-loved-book warmth.
