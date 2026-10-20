import { type } from 'arktype';
import type { Logger } from 'pino';

const MetInfoJsonRowSchema = type({
  external_id: 'string',
  met_date: 'string | null',
  met_location: 'string | null',
  met_context: 'string | null',
  created_at: 'string',
  updated_at: 'string',
});

export type MetInfoJsonRow = typeof MetInfoJsonRowSchema.infer;

export function parseMetInfoJson(value: unknown, logger: Logger): MetInfoJsonRow | null {
  try {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return MetInfoJsonRowSchema.assert(value);
    }
  } catch (error) {
    logger.warn(
      { resource: 'metInfo', reason: error instanceof Error ? error.message : String(error) },
      'Dropped malformed JSON aggregate element',
    );
  }
  return null;
}
