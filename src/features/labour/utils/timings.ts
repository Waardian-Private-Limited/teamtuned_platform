import type { LabourTimings } from '../types/labour.types';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const min = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
/** Minutes after the cutoff: how far into the work day a clock time is (the server orders times the same way). */
const after = (t: string, cutoff: string) => (min(t) - min(cutoff) + 1440) % 1440;

/** Field problems of a clock, keyed by field ({} = fine). Times are ordered from the cutoff, so a shift may cross midnight. */
export function timingsProblems(t: Partial<LabourTimings>): Record<string, string> {
  const e: Record<string, string> = {};
  for (const k of ['attendanceCutoff', 'standardStart', 'standardEnd'] as const) if (!TIME.test(t[k] || '')) e[k] = 'Enter a time';
  if (t.overtimeEnd && !TIME.test(t.overtimeEnd)) e.overtimeEnd = 'Enter a time, or leave it empty';
  if (Object.keys(e).length) return e;
  const c = t.attendanceCutoff!;
  if (after(t.standardEnd!, c) <= after(t.standardStart!, c)) e.standardEnd = 'Must be after the standard start (counting from the cutoff)';
  else if (t.overtimeEnd && after(t.overtimeEnd, c) <= after(t.standardEnd!, c)) e.overtimeEnd = 'Must be after the standard end (counting from the cutoff)';
  return e;
}

/** "Standard 09:00-18:00 · Overtime 18:00-20:00 · Night 20:00-05:00". */
export function timingsSummary(t: Partial<LabourTimings>): string {
  if (Object.keys(timingsProblems(t)).length) return '';
  return [
    `Standard ${t.standardStart}-${t.standardEnd}`,
    t.overtimeEnd ? `Overtime ${t.standardEnd}-${t.overtimeEnd}` : null,
    `Night ${t.overtimeEnd || t.standardEnd}-${t.attendanceCutoff}`,
  ].filter(Boolean).join(' · ');
}

export const pickTimings = (t: Partial<LabourTimings>): LabourTimings => ({
  attendanceCutoff: t.attendanceCutoff || '06:00', standardStart: t.standardStart || '08:00', standardEnd: t.standardEnd || '16:00', overtimeEnd: t.overtimeEnd || null,
});
