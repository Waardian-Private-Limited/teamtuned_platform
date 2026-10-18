import { getOrgTimezone, orgDateOf } from '@/lib/datetime';

// Wall-clock <-> instant conversion in the organization's zone. The API stores
// and answers UTC; a recruiter types a date + time meaning "in our office".

function offsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - utcMs;
}

/** 'yyyy-MM-dd' + 'HH:mm' read in the org zone → ISO UTC string, or null when invalid. */
export function orgWallToUtcIso(date: string, time: string, tz: string = getOrgTimezone()): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  const tm = /^(\d{1,2}):(\d{2})/.exec(time || '');
  if (!dm || !tm) return null;
  const guess = Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]));
  if (!Number.isFinite(guess)) return null;
  // Two passes settle DST edges where the offset at the guess differs from the offset at the answer.
  let utc = guess - offsetMs(guess, tz);
  utc = guess - offsetMs(utc, tz);
  return new Date(utc).toISOString();
}

/** An instant → { date: 'yyyy-MM-dd', time: 'HH:mm' } on the org's wall clock. */
export function utcToOrgWall(iso: string, tz: string = getOrgTimezone()): { date: string; time: string } {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return { date: '', time: '' };
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t));
  return { date: orgDateOf(t, tz), time };
}

/** Monday of the week containing `date` ('yyyy-MM-dd'). */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
