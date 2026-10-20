export type QueryValue = string | number | boolean | undefined;

/** Appends the defined params as a query string; returns `path` unchanged when none is defined. */
export function withQuery(path: string, params: Record<string, QueryValue>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query.length > 0 ? `${path}?${query}` : path;
}
