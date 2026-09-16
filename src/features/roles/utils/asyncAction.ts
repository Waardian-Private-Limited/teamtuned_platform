import { FieldValidationError as GenericFieldValidationError, asFieldError as genericAsFieldError, messageOf } from '@/lib/api/fieldError';
import type { RoleFieldName } from '../constants/roles.constants';

export class FieldValidationError extends GenericFieldValidationError<RoleFieldName> {}

export function asFieldError(err: unknown, field: RoleFieldName, extraStatuses: number[] = []): never {
  try {
    genericAsFieldError(err, field, extraStatuses);
  } catch (e) {
    if (e instanceof GenericFieldValidationError) throw new FieldValidationError(e.field as RoleFieldName, e.message);
    throw e;
  }
  throw err;
}

export { messageOf };
