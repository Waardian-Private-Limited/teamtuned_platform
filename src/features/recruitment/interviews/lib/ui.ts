// Small class recipes shared by the recruitment interviews / offers / settings /
// referrals screens (same geometry as the roles screens' toolbar buttons).

export const btn = {
  primary:
    'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
  secondary:
    'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
  danger:
    'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-danger)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-danger)]/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
  small:
    'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-50',
  /** Small filled button. A separate recipe (not btn.small + overrides): two hover:bg-* utilities race on CSS order. */
  smallPrimary:
    'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-2.5 text-xs font-semibold text-[var(--tt-on-primary)] transition-colors hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50',
  icon:
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40',
} as const;

export const toolbarCard =
  'flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 2xl:p-4';

export const listCard = 'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs';

export const countBadge =
  'inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold tabular-nums text-fg-muted 2xl:text-sm';

export const pageTitle = 'text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl';

export const thClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';

export const tdClass = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 text-xs sm:text-sm text-fg';

export const nativeSelect =
  'h-9 w-full appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-xs font-semibold text-fg outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] cursor-pointer sm:text-sm';

export function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] || '' : '')).toUpperCase();
}

/** Lists may come back as a bare array or as a paged `{ items }` object. */
export function itemsOf<T>(value: T[] | { items?: T[] } | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return Array.isArray(value.items) ? value.items : [];
}

/** The `{ field }` a server-side validation error points at, if any. */
export function fieldOf(err: unknown): string | undefined {
  const data = (err as { data?: unknown } | null)?.data as { field?: unknown; details?: { field?: unknown } } | null | undefined;
  const f = data?.field ?? data?.details?.field;
  return typeof f === 'string' ? f : undefined;
}

export const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function formatInr(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `₹${INR.format(n)}` : '—';
}
