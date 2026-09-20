import { FieldValidationError as GenericFieldValidationError, asFieldError as genericAsFieldError } from '@/lib/api/fieldError';
import type { ComponentFieldName, DebitFieldName } from '../constants/payroll-setup.constants';

export class ComponentFieldValidationError extends GenericFieldValidationError<ComponentFieldName> {}
export class DebitFieldValidationError extends GenericFieldValidationError<DebitFieldName> {}
export class FormFieldValidationError extends GenericFieldValidationError<string> {}

export function asComponentFieldError(err: unknown, field: ComponentFieldName, extraStatuses: number[] = []): never {
  try {
    genericAsFieldError(err, field, extraStatuses);
  } catch (e) {
    if (e instanceof GenericFieldValidationError) throw new ComponentFieldValidationError(e.field as ComponentFieldName, e.message);
    throw e;
  }
  throw err;
}

export function asDebitFieldError(err: unknown, field: DebitFieldName, extraStatuses: number[] = []): never {
  try {
    genericAsFieldError(err, field, extraStatuses);
  } catch (e) {
    if (e instanceof GenericFieldValidationError) throw new DebitFieldValidationError(e.field as DebitFieldName, e.message);
    throw e;
  }
  throw err;
}

export { messageOf } from '@/lib/api/fieldError';
