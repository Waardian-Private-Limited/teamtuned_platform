import { FieldValidationError as GenericFieldValidationError, asFieldError as genericAsFieldError } from '@/lib/api/fieldError';
import type { SiteFieldName } from '../constants/sites.constants';

export class FieldValidationError extends GenericFieldValidationError<SiteFieldName> {}

export function asFieldError(err: unknown, field: SiteFieldName, extraStatuses: number[] = []): never {
  try {
    genericAsFieldError(err, field, extraStatuses);
  } catch (e) {
    if (e instanceof GenericFieldValidationError) throw new FieldValidationError(e.field as SiteFieldName, e.message);
    throw e;
  }
  throw err;
}
