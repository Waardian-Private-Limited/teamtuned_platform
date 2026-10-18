import { StatusPill } from '@/components/ui/StatusPill';
import { STATUS_LABEL } from '../../constants/insurance.constants';
import type { CoverStatus } from '../../types/insurance.types';

const TONE = { active: 'active', ending_soon: 'neutral', expired: 'inactive', ended: 'terminated' } as const;

export function StatusBadge({ status }: { status: CoverStatus }) {
  return <StatusPill label={STATUS_LABEL[status]} tone={TONE[status]} />;
}
