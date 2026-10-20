/**
 * The class recipes every surface in the app is built from.
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
export const SURFACE_CLASSES = {
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
