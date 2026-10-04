'use client';

import { Check, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { APPROVAL_LEVEL_LABELS } from '../../../constants/roster.constants';
import type { SwapRequest } from '../../../types/roster.types';

function levelName(request: SwapRequest, index: number): string {
  const level = request.chain_snapshot[index];
  if (!level) return 'Approver';
  if (level.type === 'peer') return request.to_name || APPROVAL_LEVEL_LABELS.peer;
  return APPROVAL_LEVEL_LABELS[level.type] || 'Approver';
}

function formatAt(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(d);
}

export function ApprovalStepper({ request }: { request: SwapRequest }) {
  const { chain_snapshot: chain, history, status, current_level: current } = request;
  if (!chain.length) return null;
  return (
    <div className="space-y-3">
      <ol className="flex flex-wrap items-start gap-x-4 gap-y-2">
        {chain.map((_, i) => {
          const entry = history.find((h) => h.level === i);
          const rejected = entry?.decision === 'rejected';
          const done = entry?.decision === 'approved' || (status === 'approved' && !entry);
          const isCurrent = status === 'pending' && i === current;
          return (
            <li key={i} className="flex items-center gap-2">
              <span
                className={cx(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                  done && 'border-fg bg-fg text-fg-inverted',
                  rejected && 'border-fg bg-surface text-fg',
                  isCurrent && 'border-2 border-fg bg-surface text-fg',
                  !done && !rejected && !isCurrent && 'border-line-strong bg-surface text-fg-subtle'
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : rejected ? <X className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={cx('text-xs', isCurrent ? 'font-bold text-fg' : 'text-fg-muted')}>
                {levelName(request, i)}
                {isCurrent && <span className="ml-1 text-[10px] uppercase tracking-wider">waiting</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {history.length > 0 && (
        <ul className="space-y-1 border-l border-line pl-3">
          {history.map((h, i) => (
            <li key={i} className="text-xs text-fg-muted">
              <span className="font-semibold text-fg">{levelName(request, h.level)}</span>{' '}
              {h.decision === 'approved' ? 'approved' : 'declined'}
              {formatAt(h.at) && ` · ${formatAt(h.at)}`}
              {h.note && <span className="block text-fg">&ldquo;{h.note}&rdquo;</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
