// Shared error-routing machinery, lifted from features/auth/hooks/useLoginFlow
// (FieldValidationError / asFieldError / the single `run` wrapper) so a
// mutation's server-side rejection can land on the specific field it's about
// instead of a banner.
import { isRejectedInput, messageOf, statusOf } from '@/lib/api/errors';
import type { DepartmentFieldName } from '../constants/departments.constants';

export class FieldValidationError extends Error {
  constructor(readonly field: DepartmentFieldName, message: string) {
    super(message);
  }
}

export function asFieldError(err: unknown, field: DepartmentFieldName, extraStatuses: number[] = []): never {
  const status = statusOf(err);
  const belongsToField = isRejectedInput(err) || (status !== undefined && extraStatuses.includes(status));
  if (belongsToField) throw new FieldValidationError(field, messageOf(err));
  throw err;
}

export { messageOf };
