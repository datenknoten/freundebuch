import { type } from 'arktype';
import type { Logger } from 'pino';
import { safeArray } from './safe-array.js';

const CircleJsonRowSchema = type({
  external_id: 'string',
  name: 'string',
  color: 'string | null',
});

export type CircleJsonRow = typeof CircleJsonRowSchema.infer;

export function parseCirclesJson(value: unknown, logger: Logger): CircleJsonRow[] {
  return safeArray(value, CircleJsonRowSchema, logger, 'circles');
}
