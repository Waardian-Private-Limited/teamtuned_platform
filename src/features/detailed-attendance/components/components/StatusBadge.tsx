import { PencilLine } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { TONE } from '../../constants/detailed.constants';
import type { Badge } from '../../types/detailed.model';

/** One state for the day: a dot, the word, and a small pencil when HR set it by hand. */
export function StatusBadge({ badge, className }: { badge: Badge; className?: string }) {
  const tone = TONE[badge.tone];
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold', tone.chip, className)}>
      <span aria-hidden className={cx('h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)} />
      {badge.label}
      {badge.overridden && <span title="Set by HR" className="inline-flex"><PencilLine aria-hidden className="h-3 w-3 opacity-70" /></span>}
    </span>
  );
}
