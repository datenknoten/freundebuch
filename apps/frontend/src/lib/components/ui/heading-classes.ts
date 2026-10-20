export const HEADING_CLASSES = {
  /** h1 on list, form and settings pages. */
  page: 'text-3xl font-heading text-forest',
  /** h1 on detail pages, where the heading is the entity's name. */
  entity: 'text-3xl font-heading text-gray-900',
  /** h2 inside `SURFACE_CLASSES.section`. */
  section: 'text-lg font-heading',
  /** h2 on dashboard widgets and modal titles. */
  widget: 'text-xl font-heading text-gray-900',
  /** h3 group headings inside forms and cards. */
  sub: 'text-lg font-heading text-gray-900',
} as const;
