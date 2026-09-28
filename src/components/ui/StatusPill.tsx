import { cx } from '@/theme/tokens';

type Tone = 'active' | 'inactive' | 'terminated' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  active: 'border-[var(--tt-success)]/25 bg-[var(--tt-success-soft)] text-[var(--tt-success)]',
  inactive: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
  terminated: 'border-line bg-bg-subtle text-fg-muted line-through',
  neutral: 'border-line bg-bg-subtle text-fg-muted',
};

const DOT_CLASSES: Record<Tone, string> = {
  active: 'bg-[var(--tt-success)]',
  inactive: 'bg-[var(--tt-danger)]',
  terminated: 'bg-fg-subtle',
  neutral: 'bg-fg-subtle',
};

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors duration-200',
        TONE_CLASSES[tone]
      )}
    >
      <span className={cx('h-1.5 w-1.5 rounded-full transition-colors duration-200', DOT_CLASSES[tone])} />
      {label}
    </span>
  );
}
