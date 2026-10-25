import { ApiError, messageOf } from '@/lib/api/errors';

/**
 * Splits an API failure into per-field messages (backend `errors` map, e.g. `lines[0].amount`, or the
 * single `field`) and a form-level message for anything that has no field.
 */
export function splitError(err: unknown): { fields: Record<string, string>; form: string } {
  const data = err instanceof ApiError ? (err.data as { field?: string; errors?: Record<string, unknown> } | null) : null;
  const fields: Record<string, string> = {};
  if (data?.errors && typeof data.errors === 'object') {
    for (const [k, v] of Object.entries(data.errors)) if (typeof v === 'string') fields[k] = v;
  }
  if (!Object.keys(fields).length && data?.field) fields[data.field] = messageOf(err);
  return { fields, form: Object.keys(fields).length ? '' : messageOf(err) };
}

/** Field errors the form can place; the rest become one plain line under the form. */
export function placeErrors(err: unknown, known: (key: string) => boolean): { fields: Record<string, string>; form: string } {
  const { fields, form } = splitError(err);
  const placed: Record<string, string> = {};
  const rest: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (known(k)) placed[k] = v;
    else rest.push(v);
  }
  return { fields: placed, form: form || rest.join(' ') };
}
