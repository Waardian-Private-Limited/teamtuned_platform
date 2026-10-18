import { cx } from '@/theme/tokens';
import { initials } from '../utils/format';

const SIZES = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
} as const;

export function CandidateAvatar({ name, size = 'md', className }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full border border-line bg-bg-subtle font-bold tracking-wide text-fg',
        SIZES[size],
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
