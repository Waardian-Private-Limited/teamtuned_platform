// Department-specific re-export of the shared field-error machinery
// (@/lib/api/fieldError), typed to this feature's field names.
import { FieldValidationError as GenericFieldValidationError, asFieldError as genericAsFieldError, messageOf } from '@/lib/api/fieldError';
import type { DepartmentFieldName } from '../constants/departments.constants';

export class FieldValidationError extends GenericFieldValidationError<DepartmentFieldName> {}

export function asFieldError(err: unknown, field: DepartmentFieldName, extraStatuses: number[] = []): never {
  try {
    genericAsFieldError(err, field, extraStatuses);
  } catch (e) {
    if (e instanceof GenericFieldValidationError) throw new FieldValidationError(e.field as DepartmentFieldName, e.message);
    throw e;
  }
  throw err;
}

export { messageOf };
