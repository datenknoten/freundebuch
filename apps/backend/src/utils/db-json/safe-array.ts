/**
 * Safe parsers for JSON/JSONB columns returned by PgTyped queries.
 * Each parser validates individual elements against ArkType schemas
 * and returns a typed value or a safe default ([] or null) when the
 * database value is malformed.
 */

import type { Logger } from 'pino';

/**
 * Validates each element of an array against an ArkType schema.
 *
 * Non-array values become `[]`, and elements that fail validation are dropped
 * so one bad row does not blank the whole friend. Dropping used to be silent,
 * which made a schema/column mismatch look like missing data to the user and
 * left no trace anywhere; every drop is now logged with the resource and index.
 */
export function safeArray<T>(
  value: unknown,
  schema: { assert: (data: unknown) => T },
  logger: Logger,
  resource: string,
): T[] {
  if (!Array.isArray(value)) return [];
  const results: T[] = [];
  for (const [index, element] of value.entries()) {
    try {
      results.push(schema.assert(element));
    } catch (error) {
      logger.warn(
        { resource, index, reason: error instanceof Error ? error.message : String(error) },
        'Dropped malformed JSON aggregate element',
      );
    }
  }
  return results;
}
