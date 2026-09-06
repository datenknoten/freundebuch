import { type } from 'arktype';

/**
 * App password types and validation schemas for CardDAV / MCP clients
 */

// ============================================================================
// Input Schemas
// ============================================================================

/** Schema for creating an app password */
export const AppPasswordCreateSchema = type({
  name: 'string >= 1 & string <= 100',
});
export type AppPasswordCreateInput = typeof AppPasswordCreateSchema.infer;
