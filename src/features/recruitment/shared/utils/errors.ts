import { ApiError, messageOf, statusOf } from '@/lib/api/errors';

/** The `{ field }` a recruitment API error names (snake_case request field), if any. */
export function serverFieldOf(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  const data = err.data as { field?: unknown } | null;
  return typeof data?.field === 'string' ? data.field : null;
}

export function isForbidden(err: unknown) {
  return statusOf(err) === 403;
}

export { messageOf };
