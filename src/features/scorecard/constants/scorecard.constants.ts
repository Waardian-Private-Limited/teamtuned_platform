export const SECTION_LABELS = { attendance: 'Attendance', tasks: 'Tasks', meetings: 'Meetings' } as const;

/** What a score reads as. Only the lowest band is flagged. */
export function band(score: number | null): { label: string; risk: boolean } {
  if (score === null) return { label: 'Not enough data', risk: false };
  if (score >= 85) return { label: 'Excellent', risk: false };
  if (score >= 70) return { label: 'Good', risk: false };
  if (score >= 50) return { label: 'Fair', risk: false };
  return { label: 'Needs attention', risk: true };
}
