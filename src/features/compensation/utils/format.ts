export function inr(n: number | null | undefined, { sign = false } = {}) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  const text = `₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}`;
  if (v < 0) return `−${text}`;
  return sign && v > 0 ? `+${text}` : text;
}

export function pct(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  return `${v > 0 ? '+' : ''}${v.toFixed(Math.abs(v) < 10 ? 2 : 1)}%`;
}

export function date(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function month(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(`${value}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function currentMonth(offset = 0) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function currentFyStart() {
  const d = new Date();
  return d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}
