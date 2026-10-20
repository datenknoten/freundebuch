/**
 * The focus treatment every text control shares: a ring plus a matching
 * border, and no ring offset — a boxed control has no gap to place one in.
 * Non-text controls use `FOCUS_RING` instead.
 */
const INPUT_FOCUS = 'focus-visible:ring-2 focus-visible:ring-forest focus-visible:border-forest';

export const FORM_CLASSES = {
  input: `w-full px-3 py-2 border border-gray-300 rounded-lg ${INPUT_FOCUS} font-body disabled:opacity-50 disabled:cursor-not-allowed`,
  inputSm: `w-full px-3 py-2 text-sm border border-gray-300 rounded-lg ${INPUT_FOCUS} font-body disabled:opacity-50 disabled:cursor-not-allowed`,
  select: `w-full px-3 py-2 border border-gray-300 rounded-lg ${INPUT_FOCUS} font-body disabled:opacity-50 disabled:cursor-not-allowed`,
  checkbox:
    'w-4 h-4 text-forest border-gray-300 rounded focus-visible:ring-forest disabled:opacity-50 disabled:cursor-not-allowed',
  textarea: `w-full px-3 py-2 border border-gray-300 rounded-lg ${INPUT_FOCUS} font-body disabled:opacity-50 disabled:cursor-not-allowed resize-none`,
  label: 'block text-sm font-body font-medium text-gray-700 mb-1',
  checkboxLabel: 'text-sm font-body text-gray-700',
  /** Field-level validation message, rendered below the control. */
  error: 'mt-1 text-sm text-red-600 font-body',
  /** Appended to a control while it carries a validation error. */
  inputError: 'border-red-500 focus-visible:ring-red-500',
  /** Static hint below a control (password rules, formats, examples). */
  helper: 'mt-1 text-xs text-gray-500 font-body',
  /** For a text control built outside these recipes (the page search field). */
  inputFocus: INPUT_FOCUS,
} as const;
