import { StatusPill } from '@/components/ui/StatusPill';
import { STATUS_LABEL, STATUS_TONE } from '../../constants/compensation.constants';

export function StatusBadge({ status }: { status: string }) {
  return <StatusPill label={STATUS_LABEL[status] || status} tone={STATUS_TONE[status] || 'neutral'} />;
}
