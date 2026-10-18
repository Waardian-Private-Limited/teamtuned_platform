// Formatting helpers for the test attempt drawer's integrity and AI review views
// (RECRUITMENT_DESIGN.md §9.3 / §9.4). Everything tolerates missing fields: attempts
// made before proctoring carry no integrity or AI review at all.
import type { RiskLevel } from '../../types/interviews.dto';

export const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** 0 s · 45 s · 3m 05s · 1h 02m */
export function formatMs(ms: number | null | undefined): string {
  const n = toNum(ms);
  if (n === null) return '—';
  const total = Math.max(0, Math.round(n / 1000));
  if (total < 60) return `${total}s`;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** Offset from the start as mm:ss (or h:mm:ss). */
export function formatOffset(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

export const RISK_META: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: 'Low', color: 'var(--tt-success)' },
  medium: { label: 'Medium', color: 'var(--tt-warning)' },
  high: { label: 'High', color: 'var(--tt-danger)' },
};

export function riskOf(v: unknown): RiskLevel | null {
  return v === 'low' || v === 'medium' || v === 'high' ? v : null;
}

export const SEVERITY_COLOR: Record<string, string> = {
  info: 'var(--tt-fg-subtle)',
  warn: 'var(--tt-warning)',
  high: 'var(--tt-danger)',
};

export const EVENT_LABEL: Record<string, string> = {
  visibility_hidden: 'Left the test tab',
  visibility_visible: 'Came back to the tab',
  window_blur: 'Window lost focus',
  window_focus: 'Window focused',
  fullscreen_exit: 'Exited full screen',
  fullscreen_enter: 'Entered full screen',
  copy: 'Copy',
  cut: 'Cut',
  paste: 'Paste',
  context_menu: 'Right-click',
  print: 'Print',
  shortcut_blocked: 'Blocked shortcut',
  multi_screen: 'Multiple screens',
  resize: 'Window resized',
  devtools: 'Developer tools suspected',
  offline: 'Went offline',
  online: 'Back online',
  question_view: 'Viewed question',
};

/** Event types worth a tone in the timeline. */
export const EVENT_TONE: Record<string, string> = {
  visibility_hidden: 'var(--tt-warning)',
  fullscreen_exit: 'var(--tt-warning)',
  paste: 'var(--tt-warning)',
  copy: 'var(--tt-warning)',
  cut: 'var(--tt-warning)',
  print: 'var(--tt-danger)',
  devtools: 'var(--tt-danger)',
  multi_screen: 'var(--tt-danger)',
  shortcut_blocked: 'var(--tt-warning)',
};

export const FLAG_LABEL: Record<string, string> = {
  too_fast: 'Too fast',
  fast: 'Too fast',
  paste_in_answer: 'Pasted',
  pasted: 'Pasted',
  high_paste: 'Pasted',
  fast_typing: 'Very fast typing',
  typing_too_fast: 'Very fast typing',
  many_answer_changes: 'Many changes',
  answer_changes: 'Many changes',
  away: 'Left during question',
  tab_switch: 'Left during question',
};

export const humanize = (code: string) => {
  const s = code.replace(/[_-]+/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : code;
};

export const flagLabel = (f: string) => FLAG_LABEL[f] ?? humanize(f);

export const eventLabel = (t: string) => EVENT_LABEL[t] ?? humanize(t);

/** A short detail for an event's data (away time, chars pasted, key, size). */
export function eventDetail(type: string, data: Record<string, unknown> | null | undefined): string {
  const d = data ?? {};
  const parts: string[] = [];
  const away = toNum(d.awayMs);
  if (away !== null) parts.push(`away ${formatMs(away)}`);
  const chars = toNum(d.chars);
  if (chars !== null) parts.push(`${chars} chars`);
  if (d.blocked === true) parts.push('blocked');
  if (typeof d.key === 'string' && d.key) parts.push(d.key);
  const screens = toNum(d.screens);
  if (screens !== null && type === 'multi_screen') parts.push(`${screens} screens`);
  const w = toNum(d.w);
  const h = toNum(d.h);
  if (w !== null && h !== null) parts.push(`${w}×${h}`);
  return parts.join(' · ');
}

export const clampPct = (v: number | null | undefined) => Math.max(0, Math.min(100, toNum(v) ?? 0));
