import { FieldValidationError as GenericFieldValidationError, asFieldError as genericAsFieldError, messageOf } from '@/lib/api/fieldError';
import { ApiError } from '@/lib/api/errors';
import { SHIFT_FIELD_NAMES, type ShiftFieldName } from '../constants/shiftTemplates.constants';

export class FieldValidationError extends GenericFieldValidationError<ShiftFieldName> {}

// The server names the offending field (`field` in the error body); use it
// when it is one of ours so a bad end time outlines the end-time input, not
// the name.
function serverField(err: unknown): ShiftFieldName | null {
  if (!(err instanceof ApiError)) return null;
  const field = (err.data as { field?: unknown } | null)?.field;
  return SHIFT_FIELD_NAMES.includes(field as ShiftFieldName) ? (field as ShiftFieldName) : null;
}

export function asFieldError(err: unknown, fallbackField: ShiftFieldName, extraStatuses: number[] = []): never {
  const field = serverField(err) ?? fallbackField;
  try {
    genericAsFieldError(err, field, extraStatuses);
  } catch (e) {
    if (e instanceof GenericFieldValidationError) throw new FieldValidationError(e.field as ShiftFieldName, e.message);
    throw e;
  }
  throw err;
}

export { messageOf };
