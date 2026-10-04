import { cx } from '@/theme/tokens';
import { STATUS_LABELS } from '../../../constants/roster.constants';
import type { RosterStatus } from '../../../types/roster.types';
import { STATUS_PILL_CLASS } from '../../../utils/rosterStatus';

export function RosterStatusPill({ status }: { status: RosterStatus }) {
  return (
    <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', STATUS_PILL_CLASS[status])}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
