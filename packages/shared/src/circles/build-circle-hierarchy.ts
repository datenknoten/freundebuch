import type { CircleResponse } from './circle-response.js';
import type { CircleWithHierarchyResponse } from './circle-with-hierarchy-response.js';

function bySortOrder(a: CircleWithHierarchyResponse, b: CircleWithHierarchyResponse) {
  return a.sortOrder - b.sortOrder;
}

function sortChildren(nodes: CircleWithHierarchyResponse[]) {
  nodes.sort(bySortOrder);
  for (const node of nodes) {
    sortChildren(node.children);
  }
}

export function buildCircleHierarchy(circles: CircleResponse[]) {
  const circleMap = new Map<string, CircleWithHierarchyResponse>();
  const roots: CircleWithHierarchyResponse[] = [];

  for (const circle of circles) {
    circleMap.set(circle.id, { ...circle, children: [] });
  }

  for (const circle of circles) {
    const node = circleMap.get(circle.id);
    if (node === undefined) {
      continue;
    }

    const parent =
      circle.parentCircleId === null ? undefined : circleMap.get(circle.parentCircleId);
    if (parent === undefined) {
      // A circle whose parent is missing (orphaned) is treated as a root.
      roots.push(node);
    } else {
      parent.children.push(node);
    }
  }

  sortChildren(roots);

  return roots;
}
