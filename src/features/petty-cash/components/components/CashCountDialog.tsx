'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { useMutation } from '@/features/reimbursement/hooks/useClaimActions';
import * as api from '../../api/petty-cash.api';
import { DENOMINATIONS } from '../../constants/petty-cash.constants';
import { leftoverError } from '../../utils/formError';
import { money } from '../../utils/format';
import { FormError } from './Primitives';

interface CashCountDialogProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  walletId: number;
  /** What the books say is in the wallet; the difference is shown live. */
  bookBalance: number;
  /** `me`: the custodian counting their own wallet; `hr`: staff with PC_FUND. */
  scope: 'me' | 'hr';
}

const cleanCount = (raw: string) => raw.replace(/\D/g, '').slice(0, 6);

/** Counts the cash note by note: the total and the difference from the books update as you type. */
export function CashCountDialog({ open, onClose, onDone, walletId, bookBalance, scope }: CashCountDialogProps) {
  const [counts, setCounts] = React.useState<Record<number, string>>({});
  const [note, setNote] = React.useState('');
  const done = React.useCallback(() => {
    onDone();
    onClose();
  }, [onDone, onClose]);
  const m = useMutation(done);
  const { clearError } = m;

  React.useEffect(() => {
    if (!open) return;
    setCounts({});
    setNote('');
    clearError();
  }, [open, clearError]);

  const qty = (d: number) => Number(counts[d]) || 0;
  const total = DENOMINATIONS.reduce((s, d) => s + d * qty(d), 0);
  const diff = Math.round((total - bookBalance) * 100) / 100;
  const step = (d: number, by: number) => setCounts((c) => ({ ...c, [d]: String(Math.max(0, qty(d) + by)) }));

  const submit = () => {
    const denominations = Object.fromEntries(DENOMINATIONS.filter((d) => qty(d) > 0).map((d) => [String(d), qty(d)]));
    const body = { counted_amount: total, denominations, note: note.trim() || undefined };
    m.run(async () => {
      try {
        await (scope === 'me' ? api.recordMyCashCount(walletId, body) : api.recordCashCount(walletId, body));
      } catch (err) {
        let raw = '';
        try {
          raw = JSON.stringify((err as { data?: unknown })?.data ?? '');
        } catch {
          raw = '';
        }
        if (raw.includes('cash_count_disabled')) throw new Error('Cash counts are switched off for this company. Ask HR to switch them on in Petty cash, Settings.');
        throw err;
      }
    }, 'Cash count recorded');
  };

  const stepBtn = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-fg transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-lg"
      title="Count the cash"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={m.busy} onClick={submit}>
            Record count
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">Enter how many notes and coins of each kind are in the wallet.</p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DENOMINATIONS.map((d) => (
            <li key={d} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5">
              <span className="w-12 shrink-0 text-sm font-semibold tabular-nums text-fg">₹{d}</span>
              <button type="button" aria-label={`One less ₹${d}`} className={stepBtn} onClick={() => step(d, -1)} disabled={qty(d) === 0}>
                <Minus className="h-3.5 w-3.5" aria-hidden />
              </button>
              <input
                inputMode="numeric"
                aria-label={`Number of ₹${d}`}
                value={counts[d] ?? ''}
                placeholder="0"
                onChange={(e) => setCounts((c) => ({ ...c, [d]: cleanCount(e.target.value) }))}
                className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-center text-sm tabular-nums text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]"
              />
              <button type="button" aria-label={`One more ₹${d}`} className={stepBtn} onClick={() => step(d, 1)}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </button>
              <span className="hidden w-16 shrink-0 text-right text-xs tabular-nums text-fg-muted sm:block">{qty(d) ? money(d * qty(d)) : ''}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 rounded-xl border border-line bg-bg-subtle/60 p-3 text-sm" aria-live="polite">
          <div className="flex justify-between gap-3">
            <span className="text-fg-muted">Counted</span>
            <span className="font-bold tabular-nums text-fg">{money(total)}</span>
          </div>
          <div className="flex justify-between gap-3 text-fg-muted">
            <span>In the books</span>
            <span className="tabular-nums">{money(bookBalance)}</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-line pt-1 font-semibold">
            <span className="text-fg">Difference</span>
            <span className={cx('tabular-nums', diff === 0 ? 'text-fg' : diff < 0 ? 'text-[var(--tt-danger)]' : 'text-fg')}>{diff > 0 ? `+${money(diff)}` : money(diff)}</span>
          </div>
        </div>
        <Textarea label="Note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder="e.g. Counted with the site manager" error={m.error?.fields.note} />
        <FormError message={leftoverError(m.error, ['note'])} />
      </div>
    </Dialog>
  );
}
