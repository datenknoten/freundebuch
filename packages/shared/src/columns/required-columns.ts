import type { ColumnId } from './column-definition.js';

/** Columns that are always visible and cannot be removed */
export const REQUIRED_COLUMNS: ColumnId[] = ['avatar', 'displayName'];
