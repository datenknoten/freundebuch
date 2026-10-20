import { DataIntegrityError } from '../errors/data-integrity.error.js';
import type { Json } from '../models/queries/users.queries.js';

/**
 * Convert a value to the PgTyped `Json` type the way `JSON.stringify` serializes it:
 * `undefined`, functions and symbols are dropped from objects and become `null` in
 * arrays, non-finite numbers become `null`, and a `Date` becomes its ISO string.
 * Throws `DataIntegrityError` for a value JSON cannot represent at all, such as a bigint.
 */
export function toJson(value: unknown): Json {
  const json = toJsonValue(value);
  if (json === undefined) {
    throw new DataIntegrityError('non-JSON value');
  }
  return json;
}

/** `undefined` marks a value that `JSON.stringify` omits. */
function toJsonValue(value: unknown): Json | undefined {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) === true ? value : null;
  }
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }
  if (typeof value === 'bigint') {
    throw new DataIntegrityError('non-JSON value');
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) === true ? null : value.toISOString();
  }
  if (Array.isArray(value) === true) {
    return value.map((item) => toJsonValue(item) ?? null);
  }
  const entries: [string, Json][] = [];
  for (const [key, item] of Object.entries(value)) {
    const json = toJsonValue(item);
    if (json !== undefined) {
      entries.push([key, json]);
    }
  }
  return Object.fromEntries(entries);
}
