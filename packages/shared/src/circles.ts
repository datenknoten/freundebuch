import { type } from 'arktype';

/**
 * Circle types and validation schemas for Epic 4: Categorization & Organization
 */

// ============================================================================
// Color Constants
// ============================================================================

/** Predefined color palette for circles (Tailwind-inspired) */
export const CIRCLE_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
] as const;

export type CircleColor = (typeof CIRCLE_COLORS)[number];

// ============================================================================
// Input Schemas
// ============================================================================

/** Schema for creating/updating a circle */
export const CircleInputSchema = type({
  name: 'string > 0',
  'color?': 'string | null', // hex color code (from palette or custom)
  'parent_circle_id?': 'string | null', // UUID of parent circle for hierarchy
  'sort_order?': 'number',
}).narrow((data, ctx) => {
  // Validate hex color format if provided
  if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
    ctx.mustBe('a circle with a valid hex color (e.g., #3B82F6)');
    return false;
  }
  return true;
});
export type CircleInput = typeof CircleInputSchema.infer;

/** Schema for reordering circles */
export const CircleReorderSchema = type({
  circles: type({
    id: 'string > 0', // external_id
    sort_order: 'number >= 0',
  }).array(),
});
export type CircleReorderInput = typeof CircleReorderSchema.infer;

/** Schema for merging circles */
export const CircleMergeSchema = type({
  source_circle_id: 'string > 0', // UUID of circle to merge FROM (will be deleted)
});
export type CircleMergeInput = typeof CircleMergeSchema.infer;

/** Schema for setting friend circles (replaces all) */
export const SetFriendCirclesSchema = type({
  circle_ids: 'string[]', // Array of circle external_ids
});
export type SetFriendCirclesInput = typeof SetFriendCirclesSchema.infer;

/** Schema for adding friend to a single circle */
export const AddFriendToCircleSchema = type({
  circle_id: 'string > 0', // Circle external_id
});
export type AddFriendToCircleInput = typeof AddFriendToCircleSchema.infer;

/** Schema for archiving a friend */
export const ArchiveFriendSchema = type({
  'reason?': 'string',
});
export type ArchiveFriendInput = typeof ArchiveFriendSchema.infer;

// ============================================================================
// Response Interfaces
// ============================================================================

/** Circle summary for embedding in friend responses */
export interface CircleSummary {
  id: string;
  name: string;
  color: string | null;
}

/** Full circle in API responses */
export interface Circle {
  id: string;
  name: string;
  color: string | null;
  parentCircleId: string | null;
  sortOrder: number;
  friendCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Circle with nested children for hierarchy display */
export interface CircleWithHierarchy extends Circle {
  children: CircleWithHierarchy[];
}

// ============================================================================
// Query Schemas
// ============================================================================

/** Schema for circle list query parameters */
export const CircleListQuerySchema = type({
  'hierarchy?': 'string', // 'true' to get hierarchical structure
});
export type CircleListQuery = typeof CircleListQuerySchema.infer;

/** Parsed circle list options */
export interface CircleListOptions {
  hierarchy: boolean;
}

/**
 * Parse and validate circle list query parameters
 */
export function parseCircleListQuery(query: CircleListQuery): CircleListOptions {
  return {
    hierarchy: query.hierarchy === 'true',
  };
}

// ============================================================================
// Hierarchy Helper Functions
// ============================================================================

/**
 * Build a hierarchical tree structure from a flat list of circles
 */
export function buildCircleHierarchy(circles: Circle[]): CircleWithHierarchy[] {
  const circleMap = new Map<string, CircleWithHierarchy>();
  const roots: CircleWithHierarchy[] = [];

  // First pass: create all nodes with empty children arrays
  for (const circle of circles) {
    circleMap.set(circle.id, { ...circle, children: [] });
  }

  // Second pass: link children to parents
  for (const circle of circles) {
    const node = circleMap.get(circle.id);
    if (!node) continue;

    if (circle.parentCircleId) {
      const parent = circleMap.get(circle.parentCircleId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent doesn't exist (orphaned), treat as root
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  // Sort children by sort_order at each level
  const sortChildren = (nodes: CircleWithHierarchy[]): void => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };

  sortChildren(roots);

  return roots;
}
