export const btnPrimary =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm';
export const btnSecondary =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm';
export const btnDanger =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-danger)] px-3.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-danger)]/90 active:scale-[0.98] disabled:opacity-50 sm:text-sm';
export const iconBtn =
  'rounded-[var(--tt-radius-sm)] p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';
export const miniInput =
  'h-9 w-full min-w-0 rounded-lg border border-line bg-surface px-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';

export function personName(e: { first_name: string; last_name: string }) {
  return `${e.first_name} ${e.last_name}`.trim();
}
