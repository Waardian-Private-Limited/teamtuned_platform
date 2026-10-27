import { ApiError, messageOf } from '@/lib/api/errors';

export interface ImageIssue { index: number | null; pose: string | null; reason: string }
export interface LabourError {
  /** Server-named field (`details.field`), e.g. `aadhaar` or `addresses.present.pincode`. */
  field: string | null;
  message: string;
  code: string | null;
  status: number | null;
  details: Record<string, unknown> | null;
  /** `details.errors{key:message}` (compliance pack fields). */
  fieldErrors: Record<string, string>;
  perImage: ImageIssue[];
}

function issueOf(raw: unknown, i: number): ImageIssue {
  if (typeof raw === 'string') return { index: i, pose: null, reason: raw };
  const o = (raw || {}) as Record<string, unknown>;
  const reason = [o.reason, o.message, o.error, o.code].find((v) => typeof v === 'string') as string | undefined;
  const index = typeof o.index === 'number' ? o.index : i;
  return { index, pose: typeof o.pose === 'string' ? o.pose : null, reason: reason || 'This photo cannot be used.' };
}

/** Reads the contract error `{ code, message, details }`. */
export function parseLabourError(err: unknown): LabourError {
  const data = err instanceof ApiError ? (err.data as { code?: string; details?: Record<string, unknown> } | null) : null;
  const details = data?.details && typeof data.details === 'object' ? data.details : null;
  const per = details?.perImage;
  const perImage = Array.isArray(per)
    ? per.map(issueOf)
    : per && typeof per === 'object'
      ? Object.entries(per as Record<string, unknown>).map(([k, v], i) => ({ ...issueOf(v, i), pose: Number.isNaN(Number(k)) ? k : null, index: Number.isNaN(Number(k)) ? i : Number(k) }))
      : [];
  return {
    field: typeof details?.field === 'string' ? details.field : null,
    message: messageOf(err),
    code: data?.code ?? (err instanceof ApiError ? err.code ?? null : null),
    status: err instanceof ApiError ? err.status : null,
    details,
    fieldErrors: details?.errors && typeof details.errors === 'object' ? Object.fromEntries(Object.entries(details.errors as Record<string, unknown>).filter(([, v]) => typeof v === 'string')) as Record<string, string> : {},
    perImage,
  };
}

/**
 * Puts a failure under the right field. `known(field)` decides if the form owns that field;
 * everything else becomes one plain line (`form`) for the form footer.
 */
export function placeError(err: unknown, known: (field: string) => boolean = () => true): { fields: Record<string, string>; form: string; error: LabourError } {
  const e = parseLabourError(err);
  if (e.field && known(e.field)) return { fields: { [e.field]: e.message }, form: '', error: e };
  return { fields: {}, form: e.message, error: e };
}
