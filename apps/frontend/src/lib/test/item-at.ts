/**
 * The element at `index`, failing the test with the index when it is missing
 * instead of a null dereference several lines later.
 */
export function itemAt<T>(items: ArrayLike<T>, index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`no item at index ${index}`);
  return item;
}
