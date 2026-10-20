import { FOCUS_RING } from './focus-ring.js';

const BUTTON_BASE = `inline-flex items-center justify-center gap-2 font-body font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`;

const BUTTON_VARIANTS = {
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
} as const;

const BUTTON_SIZES = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-8 py-3 text-lg',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

/**
 * The button recipe as a plain string, for the rare element that must not be a
 * `<button>` or `<a>` (a `<label>` styled as a file picker, for example).
 * Everything else uses `ui/Button.svelte`.
 */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]}`;
}
