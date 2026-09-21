import { FieldValidationError as GenericFieldValidationError, asFieldError as genericAsFieldError } from '@/lib/api/fieldError';
import type { SubOrgFieldName } from '../constants/sub-organizations.constants';

export class FieldValidationError extends GenericFieldValidationError<SubOrgFieldName> {}

export function asFieldError(err: unknown, field: SubOrgFieldName, extraStatuses: number[] = []): never {
  try {
    genericAsFieldError(err, field, extraStatuses);
  } catch (e) {
    if (e instanceof GenericFieldValidationError) {
      throw new FieldValidationError(e.field as SubOrgFieldName, e.message);
    }
    throw e;
  }
  throw err;
}

export { messageOf } from '@/lib/api/fieldError';
