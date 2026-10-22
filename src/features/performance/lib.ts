import { csvRecords } from '@/lib/csv';

/** CSV with a header row employee_code, kpi, value (and optionally period, note) -> rows for the import call. */
export const importRowsFromCsv = (text: string) => csvRecords(text, ['employee_code', 'kpi', 'value']);

export const fmt = (n: number | null | undefined, digits = 2) => (n === null || n === undefined ? '—' : String(Math.round(n * 10 ** digits) / 10 ** digits));
