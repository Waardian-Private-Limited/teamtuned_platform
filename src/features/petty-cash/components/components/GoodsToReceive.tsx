'use client';

import React from 'react';
import { PackageCheck } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import * as api from '../../api/petty-cash.api';
import { INWARD_ACTIONS, ILLUSTRATIONS } from '../../constants/petty-cash.constants';
import { usePettyCashAccess } from '../../hooks/usePettyCashAccess';
import { toExpense } from '../../types/petty-cash.mapper';
import type { Expense } from '../../types/petty-cash.model';
import { money } from '../../utils/format';
import { Block, FormError, secondaryBtn } from './Primitives';
import { InwardPill } from './StatusBadges';
import { ReceiveGoodsDialog } from './ReceiveGoodsDialog';

/** "Goods to receive": a button with the waiting count that opens a drawer list; each row opens the receive popup. Only for PC_INWARD / PC_ADMIN. */
export function GoodsToReceive({ className }: { className?: string }) {
  const { enabled, canAny } = usePettyCashAccess();
  const allowed = enabled && canAny(INWARD_ACTIONS);
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<Expense[]>([]);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [picked, setPicked] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setError('');
    try {
      const dto = await api.listInward({ inward: 'waiting', page: 1, pageSize: 50 });
      setRows((dto.items || []).map(toExpense));
      const c = (dto.counts ?? {}) as Record<string, unknown>;
      setCount(Number(c.waiting) || Number(dto.total) || 0);
    } catch (e) {
      setError(messageOf(e) || 'Could not load goods to receive');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  if (!allowed) return null;

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); load(); }} className={cx(secondaryBtn, 'relative', className)}>
        <PackageCheck className="h-3.5 w-3.5" aria-hidden />
        Goods to receive
        {count > 0 && (
          <span className="ml-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--tt-danger)] px-1.5 text-[11px] font-bold tabular-nums leading-5 text-white" aria-label={`${count} waiting`}>
            {count}
          </span>
        )}
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Goods to receive">
        {loading ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Block key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <FormError message={error} />
        ) : rows.length === 0 ? (
          <EmptyState compact illustration={ILLUSTRATIONS.inwardWaiting} title="No goods waiting" description="Expenses whose goods have not arrived yet appear here." />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {rows.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setPicked(r.id)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tt-primary)]">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-fg">{r.number}{r.merchant ? ` · ${r.merchant}` : ''}</span>
                    <span className="block truncate text-xs text-fg-muted">{[r.spender?.name, money(r.amount)].filter(Boolean).join(' · ')}</span>
                  </span>
                  <InwardPill inward={r.inward} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
      <ReceiveGoodsDialog open={picked !== null} expenseId={picked} onClose={() => setPicked(null)} onReceived={load} />
    </>
  );
}
