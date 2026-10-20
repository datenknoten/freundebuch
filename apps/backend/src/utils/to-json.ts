import type { Json } from '../models/queries/users.queries.js';

/** Safe conversion of an object to the PgTyped Json type */
export function toJson(value: object): Json {
  // JSON.parse(JSON.stringify(...)) round-trips through JSON serialization,
  // which strips undefined values and class instances, producing a plain Json value.
  return JSON.parse(JSON.stringify(value)) as Json;
}
