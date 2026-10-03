export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = items.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function withOrders<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, i) => ({ ...item, order: i }));
}
