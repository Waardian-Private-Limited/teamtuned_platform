import type { ActionError } from '@/features/reimbursement/hooks/useClaimActions';

/** Errors with no field of their own on this form, as one line under it. */
export function leftoverError(error: ActionError | null, known: string[]): string {
  if (!error) return '';
  return [error.form, ...Object.entries(error.fields).filter(([k]) => !known.includes(k)).map(([, v]) => v)].filter(Boolean).join(' ');
}
