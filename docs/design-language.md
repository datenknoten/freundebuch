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
- **Sage Green** (`#8B9D83`) - A softer companion for secondary actions and supporting elements
  - Perfect for buttons that are important but not primary
  - Creates visual hierarchy without competing with Forest Green

### Accent Colors
- **Warm Amber** (`#D4A574`) - The spark that draws attention to highlights and calls-to-action
  - Used sparingly for active states and important notifications
  - Adds warmth without overwhelming the greens

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
Using Tailwind's default scale:
- **Headings** (Yanone Kaffeesatz):
  - H1: `font-heading text-4xl` (36px) / `font-bold`
  - H2: `font-heading text-3xl` (30px) / `font-bold`
  - H3: `font-heading text-2xl` (24px) / `font-semibold`
  - H4: `font-heading text-xl` (20px) / `font-semibold`
  - H5: `font-heading text-lg` (18px) / `font-medium`
- **Body** (Merriweather): `font-body text-base` (16px) / `font-normal`
- **Small**: `font-body text-sm` (14px)
- **Tiny**: `font-body text-xs` (12px)

### Line Height
- **Headings**: `leading-tight`
- **Body text**: `leading-relaxed`
- **UI elements**: `leading-normal`

## Spacing

Using Tailwind's spacing scale (based on 0.25rem / 4px increments):
- Common values: `2`, `4`, `6`, `8`, `12`, `16`, `24`, `32`
- Component padding: typically `p-4` or `p-6`
- Section spacing: `space-y-8` or `space-y-12`

## Layout & Grid

### Breakpoints
Using Tailwind defaults:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Container
- Max width: `max-w-7xl` (1280px)
- Padding: `px-4 sm:px-6 lg:px-8`

## Shadows & Elevation

Using Tailwind's shadow utilities:
- **Subtle**: `shadow-sm` - for cards at rest
- **Standard**: `shadow-md` - for elevated cards, dropdowns
- **Prominent**: `shadow-lg` - for modals, popovers
- **Interactive**: `hover:shadow-xl` - for interactive cards

## Border Radius

- **Small**: `rounded-sm` (2px) - for inputs, buttons
- **Default**: `rounded-md` (6px) - for cards, containers
- **Large**: `rounded-lg` (8px) - for prominent cards
- **Full**: `rounded-full` - for avatars, badges

## Interactive States

### Buttons
- **Default**: Primary color background
- **Hover**: Slightly darker (`hover:bg-[#1F3810]`)
- **Active**: Pressed state with darker color
- **Focus**: Ring outline (`focus:ring-2 focus:ring-offset-2 focus:ring-[#2D5016]`)
- **Disabled**: Reduced opacity (`disabled:opacity-50 disabled:cursor-not-allowed`)

### Links
- **Default**: Forest green color
- **Hover**: Underline + slightly darker
- **Visited**: Same as default (for consistency)
- **Focus**: Ring outline

### Form Elements
- **Default**: Border `gray-300`
- **Focus**: Border primary color + ring
- **Error**: Border `red-500` + error message
- **Disabled**: Gray background, reduced opacity

## Components

### Buttons

#### Variants
- **Primary**: Forest green background, white text
  - `bg-[#2D5016] hover:bg-[#1F3810] text-white font-medium px-6 py-2.5 rounded-md`
- **Secondary**: Sage green background, dark text
  - `bg-[#8B9D83] hover:bg-[#7A8C72] text-gray-900 font-medium px-6 py-2.5 rounded-md`
- **Outline**: Border only
  - `border-2 border-[#2D5016] text-[#2D5016] hover:bg-[#2D5016] hover:text-white font-medium px-6 py-2.5 rounded-md`
- **Ghost**: No background, minimal styling
  - `text-[#2D5016] hover:bg-gray-100 font-medium px-4 py-2 rounded-md`

#### Sizes
- **Small**: `px-4 py-1.5 text-sm`
- **Medium**: `px-6 py-2.5 text-base` (default)
- **Large**: `px-8 py-3 text-lg`

### Cards
- **Default**: `bg-white rounded-lg shadow-sm p-6`
- **Hover**: `hover:shadow-md transition-shadow duration-200`
- **Interactive**: Add `cursor-pointer`

### Form Elements
- **Input**: `border border-gray-300 rounded-md px-4 py-2.5 focus:ring-2 focus:ring-[#2D5016] focus:border-[#2D5016]`
- **Label**: `text-sm font-medium text-gray-700 mb-1.5`
- **Error message**: `text-sm text-red-600 mt-1`

### Navigation
- **Active state**: Forest green background or border-left indicator
- **Hover state**: Light gray background
- **Text**: Medium weight, gray-700 default, gray-900 active

### Feedback Components
- **Toast notifications**: Position top-right, slide-in animation, auto-dismiss after 5s
- **Modals**: Centered, `max-w-md` or `max-w-lg`, overlay with `bg-gray-900/50`
- **Alerts**: Colored left border matching semantic colors, light background

## Animation & Transitions

### Duration
- **Fast**: `duration-150` - for small UI feedback
- **Normal**: `duration-200` - for most transitions (default)
- **Slow**: `duration-300` - for larger movements, modals

### Easing
- **Default**: `ease-in-out` - for most transitions
- **Enter**: `ease-out` - for entering elements
- **Exit**: `ease-in` - for exiting elements

### Common Transitions
- **Hover states**: `transition-colors duration-200`
- **Shadows**: `transition-shadow duration-200`
- **Transform**: `transition-transform duration-200`

## Iconography

We use **Heroicons**, the official Tailwind CSS icon set. They're clean, consistent, and play nicely with our design system.

### Icon Set
- **Heroicons** - consistent stroke width across all icons (1.5px for outline variant)
- Two variants: Outline (default), Solid (for active/selected states)
- Installation: `npm install @heroicons/react`

### Sizes
- **Small**: `w-4 h-4` (16px)
- **Medium**: `w-5 h-5` (20px) - default
- **Large**: `w-6 h-6` (24px)
- **XL**: `w-8 h-8` (32px) - for headers, empty states

### Color
- Default: `text-gray-600`
- Active: `text-[#2D5016]`
- Decorative: Match surrounding text color

## Accessibility

### Focus Indicators
- Visible focus rings on all interactive elements
- Use `focus-visible:` modifier to show only for keyboard navigation
- Ring color: Primary forest green

### Color Contrast
- All text must meet WCAG AA standards
- Test forest green against white/light backgrounds
- Provide alternative text for all icons conveying meaning

### Motion
- Respect `prefers-reduced-motion` for users who need reduced animation
- Implement: `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } }`

## Custom Tailwind Configuration

Ready to bring these colors and fonts into your project? Here's what you'll need to add to `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#2D5016',
          light: '#3A6B1E',
          dark: '#1F3810',
        },
        sage: {
          DEFAULT: '#8B9D83',
        },
        amber: {
          warm: '#D4A574',
        },
      },
      fontFamily: {
        heading: ['"Yanone Kaffeesatz"', 'sans-serif'],
        body: ['Merriweather', 'serif'],
      },
    },
  },
}
```

### Font Weights

Ensure the following weights are available for each font:

**Yanone Kaffeesatz:**
- Regular (400)
- Medium (500)
- Semi-Bold (600)
- Bold (700)

**Merriweather:**
- Light (300)
- Regular (400)
- Bold (700)
- Black (900)

### Usage
- Colors: `bg-forest`, `text-forest-light`, `border-sage`
- Typography: `font-heading`, `font-body`
