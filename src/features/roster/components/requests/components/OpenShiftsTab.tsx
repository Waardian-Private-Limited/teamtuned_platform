'use client';

import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import type { OpenShift } from '../../../types/roster.types';
import { OpenShiftCard } from './OpenShiftCard';

interface Props {
  shifts: OpenShift[];
  loading: boolean;
  error: string;
  onClaim: (id: number) => Promise<unknown>;
  onWithdraw: (claimId: number) => Promise<unknown>;
}

export function OpenShiftsTab({ shifts, loading, error, onClaim, onWithdraw }: Props) {
  if (loading) return <TableSkeleton rows={3} columns={3} />;
  if (error) return <p className="text-sm font-medium text-[var(--tt-danger)]">{error}</p>;
  if (shifts.length === 0) {
    return <EmptyState compact title="No open shifts" description="When your team needs extra cover, the shifts you can pick up will appear here." />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {shifts.map((s) => <OpenShiftCard key={s.id} shift={s} onClaim={onClaim} onWithdraw={onWithdraw} />)}
    </div>
  );
}
