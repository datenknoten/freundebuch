import type { Circle } from './circle.js';
import type { CircleWithHierarchy } from './circle-with-hierarchy.js';

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
