// Immutable get/set by path — used to edit one leaf of the policy config
// tree without touching the rest, so React state updates stay structural.

export type PathKey = string | number;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAtPath(obj: any, path: PathKey[]): any {
  return path.reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setAtPath<T>(obj: T, path: PathKey[], value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  const current = obj as unknown;
  const isArray = Array.isArray(current);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clone: any = isArray ? [...(current as unknown[])] : { ...(current as object || {}) };
  clone[head] = setAtPath(clone[head], rest, value);
  return clone as T;
}
