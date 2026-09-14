/**
 * Colour fallback for circles that have none.
 *
 * `circle-chip` used `#e5e7eb` and the circles page `#6B7280`, so the same
 * colourless circle looked grey-100 in one place and grey-500 in another.
 * `circle-chip` computes its text colour from the background luminance, so the
 * fallback has to stay light: gray-200.
 */
export const DEFAULT_CIRCLE_COLOR = '#e5e7eb';
