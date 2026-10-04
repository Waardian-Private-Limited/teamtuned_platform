'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { cx } from '@/theme/tokens';
import type { SwapRequest } from '../../../types/roster.types';
import { SwapCard } from './SwapCard';

interface Props {
  requests: SwapRequest[];
  loading: boolean;
  error: string;
  myId: number | null;
  needsMyResponse: (r: SwapRequest) => boolean;
  onCancel: (id: number) => Promise<unknown>;
  onRespond: (id: number, decision: 'approved' | 'rejected') => Promise<unknown>;
}

export function MyRequestsTab({ requests, loading, error, myId, needsMyResponse, onCancel, onRespond }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  if (loading) return <TableSkeleton rows={3} columns={3} />;
  if (error) return <p className="text-sm font-medium text-[var(--tt-danger)]">{error}</p>;
  const pending = requests.filter((r) => r.status === 'pending');
  const closed = requests.filter((r) => r.status !== 'pending');
  if (requests.length === 0) {
    return <EmptyState compact title="No requests yet" description="Swap, give away or release a shift from My roster and it will show up here." />;
  }
  return (
    <div className="space-y-4">
      {pending.length === 0 ? <p className="text-sm text-fg-muted">You have no pending requests.</p> : (
        <div className="space-y-3">
          {pending.map((r) => (
            <SwapCard key={r.id} request={r} myId={myId} needsMyResponse={needsMyResponse(r)} onCancel={onCancel} onRespond={onRespond} />
          ))}
        </div>
      )}
      {closed.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowHistory((v) => !v)} className="flex items-center gap-1.5 text-sm font-semibold text-fg" aria-expanded={showHistory}>
            History ({closed.length})
            <ChevronDown className={cx('h-4 w-4 transition-transform', showHistory && 'rotate-180')} />
          </button>
          {showHistory && (
            <div className="mt-3 space-y-3">
              {closed.map((r) => <SwapCard key={r.id} request={r} myId={myId} needsMyResponse={false} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
