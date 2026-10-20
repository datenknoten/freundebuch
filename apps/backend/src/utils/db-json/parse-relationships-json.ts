import { type } from 'arktype';
import type { Logger } from 'pino';
import { safeArray } from './safe-array.js';

const RelationshipJsonRowSchema = type({
  external_id: 'string',
  related_friend_external_id: 'string',
  related_friend_display_name: 'string',
  related_friend_photo_thumbnail_url: 'string | null',
  relationship_type_id: 'string',
  relationship_type_label: 'string',
  relationship_category: 'string',
  notes: 'string | null',
  created_at: 'string',
});

export type RelationshipJsonRow = typeof RelationshipJsonRowSchema.infer;

export function parseRelationshipsJson(value: unknown, logger: Logger) {
  return safeArray(value, RelationshipJsonRowSchema, logger, 'relationships');
}
