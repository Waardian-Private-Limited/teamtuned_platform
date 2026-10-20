import { FieldValidationError as GenericFieldValidationError, asFieldError as genericAsFieldError } from '@/lib/api/fieldError';
import {
  COMPONENT_FIELD_NAMES,
  DEBIT_FIELD_NAMES,
  type ComponentFieldName,
  type DebitFieldName,
} from '../constants/payroll-setup.constants';

export class ComponentFieldValidationError extends GenericFieldValidationError<ComponentFieldName> {}
export class DebitFieldValidationError extends GenericFieldValidationError<DebitFieldName> {}
export class FormFieldValidationError extends GenericFieldValidationError<string> {}

/** The form field the server named in its error body, when it is one this feature knows. */
export function serverFieldOf<T extends string>(err: unknown, known: readonly T[]): T | null {
  const field = (err as { data?: { field?: unknown } })?.data?.field;
  return typeof field === 'string' && (known as readonly string[]).includes(field) ? (field as T) : null;
}

export function asComponentFieldError(err: unknown, field: ComponentFieldName, extraStatuses: number[] = []): never {
  try {
    genericAsFieldError(err, serverFieldOf(err, COMPONENT_FIELD_NAMES) ?? field, extraStatuses);
  } catch (e) {
    if (e instanceof GenericFieldValidationError) throw new ComponentFieldValidationError(e.field as ComponentFieldName, e.message);
    throw e;
  }
  throw err;
}

export function asDebitFieldError(err: unknown, field: DebitFieldName, extraStatuses: number[] = []): never {
  try {
    // The server names the offending field (e.g. 'category', 'effective_from'); prefer it
    // over the caller's fallback so the message lands under the right input.
    genericAsFieldError(err, serverFieldOf(err, DEBIT_FIELD_NAMES) ?? field, extraStatuses);
  } catch (e) {
    if (e instanceof GenericFieldValidationError) throw new DebitFieldValidationError(e.field as DebitFieldName, e.message);
    throw e;
  }
  throw err;
}

export { messageOf } from '@/lib/api/fieldError';
