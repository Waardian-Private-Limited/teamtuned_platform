const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const p = parts(iso);
  return p ? `${p[2]} ${MONTHS[p[1] - 1]} ${p[0]}` : null;
}

export function tenureSince(iso: string | null, today = new Date()): string | null {
  const p = iso ? parts(iso) : null;
  if (!p) return null;
  let months = (today.getFullYear() - p[0]) * 12 + (today.getMonth() + 1 - p[1]);
  if (today.getDate() < p[2]) months -= 1;
  if (months < 0) return null;
  if (months === 0) return 'Less than a month';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr` : '', m ? `${m} mo` : ''].filter(Boolean).join(' ');
}

export function formatTime(hhmm: string | null): string | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return (words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[words.length - 1][0]}`).toUpperCase();
}

export function titleCase(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function localIsoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysIso(iso: string, n: number): string {
  const p = parts(iso);
  if (!p) return iso;
  return localIsoDate(new Date(p[0], p[1] - 1, p[2] + n));
}

export function weekdayOf(iso: string, width: 'short' | 'long'): string {
  const p = parts(iso);
  if (!p) return '';
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-IN', { weekday: width });
}
