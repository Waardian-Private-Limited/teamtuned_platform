export { splitError, placeErrors } from '@/features/expense-bills/utils/errors';

export const lineKey = (i: number, field: string) => `lines[${i}].${field}`;
