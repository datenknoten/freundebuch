import { type } from 'arktype';

/** App passwords authenticate CardDAV and MCP clients. */
export const AppPasswordCreateInputSchema = type({
  name: 'string >= 1 & string <= 100',
});

export type AppPasswordCreateInput = typeof AppPasswordCreateInputSchema.infer;
