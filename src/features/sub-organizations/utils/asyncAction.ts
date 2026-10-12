import { FieldValidationError as GenericFieldValidationError, asFieldError as genericAsFieldError } from '@/lib/api/fieldError';
import { ApiError } from '@/lib/api/errors';
import { SUB_ORG_FIELD_NAMES, type SubOrgFieldName } from '../constants/sub-organizations.constants';

function serverFieldOf(err: unknown): SubOrgFieldName | null {
  const data = err instanceof ApiError ? (err.data as { details?: { field?: string }; field?: string } | null) : null;
  const field = data?.details?.field ?? data?.field;
  return SUB_ORG_FIELD_NAMES.find((name) => name === field) ?? null;
}

export class FieldValidationError extends GenericFieldValidationError<SubOrgFieldName> {}

export function asFieldError(err: unknown, field: SubOrgFieldName, extraStatuses: number[] = []): never {
  try {
    genericAsFieldError(err, field, extraStatuses);
  } catch (e) {
    if (e instanceof GenericFieldValidationError) {
      throw new FieldValidationError(serverFieldOf(err) ?? (e.field as SubOrgFieldName), e.message);
    }
    throw e;
  }
  throw err;
}

export { messageOf } from '@/lib/api/fieldError';
