import type { Circle } from './circle.js';

/** Circle with nested children for hierarchy display */
export interface CircleWithHierarchy extends Circle {
  children: CircleWithHierarchy[];
}
