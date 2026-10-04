import type { RosterStatus } from '../types/roster.types';

export const STATUS_PILL_CLASS: Record<RosterStatus, string> = {
  draft: 'border-line bg-bg-subtle text-fg-muted',
  generating: 'border-line-strong bg-bg-subtle text-fg animate-pulse',
  review: 'border-line-strong bg-surface text-fg',
  published: 'border-fg bg-fg text-fg-inverted',
  archived: 'border-line bg-bg-subtle text-fg-subtle',
  failed: 'border-[var(--tt-danger)] bg-surface text-[var(--tt-danger)]',
};

export const MAX_ROSTER_DAYS = 62;
