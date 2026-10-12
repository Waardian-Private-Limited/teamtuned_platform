import { ApiError, messageOf } from '@/lib/api/errors';

export function fieldOf<T extends string>(err: unknown, fields: readonly T[]): T | null {
  const field = err instanceof ApiError ? (err.data as { field?: string } | null)?.field : undefined;
  return field && (fields as readonly string[]).includes(field) ? (field as T) : null;
}

export function routeError<T extends string>(
  err: unknown,
  fields: readonly T[],
  setField: (errors: Partial<Record<T, string>>) => void,
  setForm: (message: string) => void
) {
  const map = err instanceof ApiError ? (err.data as { errors?: Record<string, unknown> } | null)?.errors : undefined;
  if (map && typeof map === 'object') {
    const picked = Object.fromEntries(Object.entries(map).filter(([k, v]) => (fields as readonly string[]).includes(k) && typeof v === 'string')) as Partial<Record<T, string>>;
    if (Object.keys(picked).length) {
      setField(picked);
      return;
    }
  }
  const field = fieldOf(err, fields);
  if (field) setField({ [field]: messageOf(err) } as Partial<Record<T, string>>);
  else setForm(messageOf(err));
}
