/**
 * Formatting for PostgreSQL `date` columns.
 *
 * node-postgres parses a `date` value into a JS Date at **local** midnight:
 * `'2024-07-01'` becomes `Mon Jul 01 2024 00:00:00 GMT+0200` on a server in
 * Berlin. Calling `.toISOString()` on that converts to UTC and rolls the
 * calendar day back — `'2024-06-30'` — for every deployment east of UTC.
 *
 * That is not theoretical: it silently shifted every birthday, encounter date
 * and "met on" date by a day on any non-UTC instance, while CI (which runs in
 * UTC) stayed green.
 *
 * Reading the local calendar components keeps the value the database actually
 * stores, in any timezone. A value that is already a string is passed through
 * untouched — some queries return `date` as text.
 */
export function formatDateOnly(value: Date | string): string;
export function formatDateOnly(value: Date | string | null | undefined): string | undefined;
export function formatDateOnly(value: Date | string | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
