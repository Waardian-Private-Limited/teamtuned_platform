import { ApiError, messageOf } from '@/lib/api/errors';

export interface FormErrors {
  fields: Record<string, string>;
  form: string;
}

/** Splits an API failure into per-field messages (400 `errors` map or single `field`) and a form-level message. */
export function formErrors(err: unknown): FormErrors {
  const data = err instanceof ApiError ? (err.data as { errors?: Record<string, unknown>; field?: string } | null) : null;
  const fields: Record<string, string> = {};
  if (data?.errors && typeof data.errors === 'object') {
    for (const [key, value] of Object.entries(data.errors)) if (typeof value === 'string') fields[key] = value;
  }
  if (!Object.keys(fields).length && data?.field) fields[data.field] = messageOf(err);
  return Object.keys(fields).length ? { fields, form: '' } : { fields: {}, form: messageOf(err) };
}
