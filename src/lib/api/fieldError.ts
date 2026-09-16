// Shared error-routing machinery: a mutation's server-side rejection lands on
// the specific form field it's about instead of a generic toast banner.
// Generic over the field-name union so every feature (departments, roles, ...)
// shares one implementation instead of re-declaring FieldValidationError.
import { isRejectedInput, messageOf, statusOf } from './errors';

export class FieldValidationError<TField extends string = string> extends Error {
  constructor(readonly field: TField, message: string) {
    super(message);
  }
}

export function asFieldError<TField extends string>(err: unknown, field: TField, extraStatuses: number[] = []): never {
  const status = statusOf(err);
  const belongsToField = isRejectedInput(err) || (status !== undefined && extraStatuses.includes(status));
  if (belongsToField) throw new FieldValidationError(field, messageOf(err));
  throw err;
}

export { messageOf };
