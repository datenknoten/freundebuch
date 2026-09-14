/**
 * The class recipes every surface, control and label in the app is built from.
 *
 * Decisions recorded here (see `docs/design-language.md`):
 * - radius: `rounded-lg` for controls, cards and rows, `rounded-xl` for page
 *   surfaces and modals, `rounded-t-2xl` for bottom sheets, `rounded-full` for
 *   chips, avatars and the FAB
 * - shadow: `shadow-sm` on card hover, `shadow-lg` on page surfaces and
 *   popovers, `shadow-2xl` on modals
 * - colour: hover lightens (`forest-light`), pressed darkens (`forest-dark`)
 * - motion: `transition-colors` with Tailwind's default 150ms; no explicit
 *   `duration-*` except `cardInteractive`, which pins 150ms so its border and
 *   shadow finish together
 */

/**
 * The focus treatment every text control shares: a ring plus a matching
 * border, and no ring offset — a boxed control has no gap to place one in.
 * Non-text controls use `focusRing` below instead.
 */
const inputFocus = 'focus-visible:ring-2 focus-visible:ring-forest focus-visible:border-forest';

export const formClasses = {
  input: `w-full px-3 py-2 border border-gray-300 rounded-lg ${inputFocus} font-body disabled:opacity-50 disabled:cursor-not-allowed`,
  inputSm: `w-full px-3 py-2 text-sm border border-gray-300 rounded-lg ${inputFocus} font-body disabled:opacity-50 disabled:cursor-not-allowed`,
  select: `w-full px-3 py-2 border border-gray-300 rounded-lg ${inputFocus} font-body disabled:opacity-50 disabled:cursor-not-allowed`,
  checkbox:
    'w-4 h-4 text-forest border-gray-300 rounded focus-visible:ring-forest disabled:opacity-50 disabled:cursor-not-allowed',
  textarea: `w-full px-3 py-2 border border-gray-300 rounded-lg ${inputFocus} font-body disabled:opacity-50 disabled:cursor-not-allowed resize-none`,
  label: 'block text-sm font-body font-medium text-gray-700 mb-1',
  checkboxLabel: 'text-sm font-body text-gray-700',
  /** Field-level validation message, rendered below the control. */
  error: 'mt-1 text-sm text-red-600 font-body',
  /** Appended to a control while it carries a validation error. */
  inputError: 'border-red-500 focus-visible:ring-red-500',
  /** Static hint below a control (password rules, formats, examples). */
  helper: 'mt-1 text-xs text-gray-500 font-body',
  /** For a text control built outside these recipes (the page search field). */
  inputFocus,
} as const;

/** Keyboard-only focus ring for controls that are not text inputs. */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2';

export const surfaceClasses = {
  /** Page shell, dashboard widget, auth card. */
  page: 'bg-white rounded-xl shadow-lg p-8',
  /** Entity card that navigates or opens something on click. */
  cardInteractive:
    'bg-white border border-gray-200 rounded-lg p-4 hover:border-forest hover:shadow-sm transition-[border-color,box-shadow] duration-150',
  /** Menu / dropdown panel anchored to a trigger. */
  popover: 'bg-white rounded-lg shadow-lg border border-gray-200 py-1',
  /** Combobox suggestion panel. */
  listbox: 'bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto',
  /** Centred modal panel. */
  modal: 'bg-white rounded-xl shadow-2xl',
  /** Mobile bottom sheet panel. */
  sheet: 'bg-white rounded-t-2xl shadow-xl',
  /** Tinted header strip above a group of detail rows. */
  section: 'flex items-center justify-between bg-forest/10 text-forest px-3 py-1.5 rounded-lg',
  /** The same tinted strip when the heading is the whole bar (no action beside it). */
  sectionHeading: 'flex items-center gap-2 bg-forest/10 text-forest px-3 py-1.5 rounded-lg',
  /** A single detail row inside a section. */
  row: 'flex items-center justify-between p-3 bg-gray-50 rounded-lg group',
} as const;

export const chipClasses = {
  base: 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-body font-medium',
  forest: 'bg-forest text-white',
  tint: 'bg-forest/10 text-forest',
  neutral: 'bg-gray-100 text-gray-600',
} as const;

export const headingClasses = {
  /** h1 on list, form and settings pages. */
  page: 'text-3xl font-heading text-forest',
  /** h1 on detail pages, where the heading is the entity's name. */
  entity: 'text-3xl font-heading text-gray-900',
  /** h2 inside `surfaceClasses.section`. */
  section: 'text-lg font-heading',
  /** h2 on dashboard widgets and modal titles. */
  widget: 'text-xl font-heading text-gray-900',
  /** h3 group headings inside forms and cards. */
  sub: 'text-lg font-heading text-gray-900',
} as const;

export const linkClasses = {
  back: 'inline-flex items-center gap-2 text-gray-600 hover:text-forest font-body text-sm transition-colors',
} as const;

export const codeClasses = {
  block: 'bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono overflow-x-auto',
  /** The same block where the content itself is the point (a password to read out). */
  blockLg: 'bg-gray-50 border border-gray-200 rounded-lg p-4 text-lg font-mono overflow-x-auto',
  inline: 'bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 font-mono text-sm',
  kbd: 'px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-600',
} as const;

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'secondaryAccent'
  | 'ghost'
  | 'ghostAccent'
  | 'danger'
  | 'dangerOutline'
  | 'caution';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const buttonBase = `inline-flex items-center justify-center gap-2 font-body font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`;

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-forest text-white hover:bg-forest-light active:bg-forest-dark',
  secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  /** Outlined button in the accent colour: an active filter, a selected option. */
  secondaryAccent: 'bg-white border border-forest text-forest hover:bg-forest/10',
  ghost: 'text-gray-700 hover:bg-gray-100',
  /** Borderless action that reads as a link: "clear filters", "add detail", retry. */
  ghostAccent: 'text-forest hover:bg-forest/10',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dangerOutline: 'border border-red-300 text-red-600 hover:bg-red-50',
  caution: 'bg-amber-600 text-white hover:bg-amber-700',
};

const buttonSizes: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-8 py-3 text-lg',
};

/**
 * The button recipe as a plain string, for the rare element that must not be a
 * `<button>` or `<a>` (a `<label>` styled as a file picker, for example).
 * Everything else uses `ui/button.svelte`.
 */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return `${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]}`;
}
