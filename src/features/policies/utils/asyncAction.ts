// Policy-specific re-export of the shared field-error machinery
// (@/lib/api/fieldError), typed to this feature's field names.
import { FieldValidationError as GenericFieldValidationError, asFieldError as genericAsFieldError, messageOf } from '@/lib/api/fieldError';
import type { PolicyFieldName } from '../constants/policies.constants';

export class FieldValidationError extends GenericFieldValidationError<PolicyFieldName> {}

export function asFieldError(err: unknown, field: PolicyFieldName, extraStatuses: number[] = []): never {
  try {
    genericAsFieldError(err, field, extraStatuses);
  } catch (e) {
    if (e instanceof GenericFieldValidationError) throw new FieldValidationError(e.field as PolicyFieldName, e.message);
    throw e;
  }
  throw err;
}

export { messageOf };
