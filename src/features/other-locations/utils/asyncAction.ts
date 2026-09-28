import { FieldValidationError as GenericFieldValidationError, asFieldError as genericAsFieldError } from '@/lib/api/fieldError';
import type { OtherLocationFieldName } from '../constants/otherLocations.constants';

export class FieldValidationError extends GenericFieldValidationError<OtherLocationFieldName> {}

export function asFieldError(err: unknown, field: OtherLocationFieldName, extraStatuses: number[] = []): never {
  try {
    genericAsFieldError(err, field, extraStatuses);
  } catch (e) {
    if (e instanceof GenericFieldValidationError) throw new FieldValidationError(e.field as OtherLocationFieldName, e.message);
    throw e;
  }
  throw err;
}
