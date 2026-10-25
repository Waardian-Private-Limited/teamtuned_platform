'use client';

import React from 'react';
import { FileCheck2, FileClock, PackageCheck, Undo2 } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { useMutation } from '@/features/reimbursement/hooks/useClaimActions';
import * as api from '../../api/petty-cash.api';
import type { ExpenseDetail, InwardReceipt } from '../../types/petty-cash.model';
import { dateTimeText } from '../../utils/format';
import { pickGoods, qtyText, type GoodsNumbers } from '../../utils/goods';
import { leftoverError } from '../../utils/formError';
import { InwardDialog } from './ExpenseDialogs';
import { AutoNumbersCheck, GoodsQtyTable } from './GoodsQtyTable';
import { FormError } from './Primitives';
import { InwardNo, InwardPill, PhysicalCopyPill } from './StatusBadges';

interface BlockProps {
  detail: ExpenseDetail;
  /** `me` uses the spender's wording and never offers actions. */
  scope: 'me' | 'hr';
  onChanged: () => void;
}

const SECTION = 'overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--tt-shadow-sm)]';

function Receipt({ receipt, onUndo }: { receipt: InwardReceipt; onUndo?: () => void }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-fg-muted sm:text-xs">{[receipt.receivedBy ? `by ${receipt.receivedBy}` : null, receipt.receivedAt ? dateTimeText(receipt.receivedAt) : null].filter(Boolean).join(' · ') || '—'}</p>
        </div>
        {onUndo && (
          <Btn icon={<Undo2 className="h-3.5 w-3.5" />} onClick={onUndo}>
            Undo
          </Btn>
        )}
      </div>
      {receipt.items.length > 0 && (
        <ul className="text-xs text-fg sm:text-sm">
          {receipt.items.map((i) => (
            <li key={i.line} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-0.5">
              <span className="min-w-0 break-words">
                {i.name} <span className="tabular-nums font-semibold">· {qtyText(i.qty)}{i.unit ? ` ${i.unit}` : ''}</span>
              </span>
              {i.inwardNo ? <InwardNo value={i.inwardNo} /> : <span className="text-xs text-fg-muted">No number</span>}
            </li>
          ))}
        </ul>
      )}
      {receipt.note && <p className="rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-fg">{receipt.note}</p>}
    </li>
  );
}

/** The goods bought on the bill: ordered, received and pending per item, partial receipts, each with its own inward number. */
export function GoodsInwardBlock({ detail, scope, onChanged }: BlockProps) {
  const inward = detail.inward;
  const hr = scope === 'hr';
  const [values, setValues] = React.useState<Record<number, string>>({});
  const [numbers, setNumbers] = React.useState<GoodsNumbers>({});
  const [autoAll, setAutoAll] = React.useState(true);
  const [undoing, setUndoing] = React.useState<InwardReceipt | null>(null);
  const [localError, setLocalError] = React.useState('');
  const done = React.useCallback(() => {
    setValues({});
    setNumbers({});
    setUndoing(null);
    onChanged();
  }, [onChanged]);
  const m = useMutation(done);
  const { clearError } = m;
  const canReceive = hr && detail.can.receiveGoods && inward.lines.some((l) => l.pending > 0);
  const pick = React.useMemo(() => pickGoods(inward.lines, values, numbers, inward.numbering), [inward.lines, values, numbers, inward.numbering]);
  const hasErrors = Object.keys(pick.errors).length > 0;

  const receiveSome = () => {
    if (hasErrors || !pick.items.length) {
      setLocalError(hasErrors ? 'Fix the quantities marked in red' : 'Enter how much of an item arrived');
      return;
    }
    setLocalError('');
    m.run(() => api.receiveGoods(detail.id, { items: pick.items }), 'Goods received');
  };
  const receiveAll = () => {
    setLocalError('');
    m.run(() => api.receiveGoods(detail.id, { all: true, ...(inward.numbering === 'typed' && autoAll ? { auto: true } : {}) }), 'All goods received');
  };
  const itemsError = localError || m.error?.fields.items || '';

  return (
    <section className={SECTION} aria-label="Goods inward">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-sm font-bold text-fg">Goods inward</h2>
        <InwardPill inward={inward} />
      </header>
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        {inward.lines.length > 0 ? (
          <GoodsQtyTable
            lines={inward.lines}
            values={values}
            readOnly={!canReceive}
            disabled={m.busy}
            errors={pick.errors}
            error={itemsError || undefined}
            numbering={inward.numbering}
            numbers={numbers}
            onNumberChange={(line, v) => {
              setNumbers((s) => ({ ...s, [line]: v }));
              clearError();
            }}
            onChange={(line, v) => {
              setValues((s) => ({ ...s, [line]: v }));
              setLocalError('');
              clearError();
            }}
          />
        ) : (
          <p className="text-xs text-fg-muted sm:text-sm">{hr ? 'The items on this bill are received at the site. They show here once the bill lists them.' : 'The goods on this bill are received at the site.'}</p>
        )}
        {canReceive && inward.numbering === 'typed' && <AutoNumbersCheck checked={autoAll} onChange={setAutoAll} disabled={m.busy} />}
        {canReceive && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Btn variant="primary" icon={<PackageCheck className="h-3.5 w-3.5" />} busy={m.busy} onClick={receiveAll} className="w-full sm:w-auto">
              Receive all
            </Btn>
            <Btn busy={m.busy} onClick={receiveSome} className="w-full sm:w-auto">
              Receive entered quantities
            </Btn>
          </div>
        )}
        <FormError message={leftoverError(m.error, ['items'])} />
      </div>
      {inward.receipts.length > 0 && (
        <div className="border-t border-line">
          <h3 className="px-4 pt-3 text-xs font-semibold text-fg-muted sm:px-5">Receipts</h3>
          <ul className="divide-y divide-line">
            {inward.receipts.map((r) => (
              <Receipt
                key={r.id}
                receipt={r}
                onUndo={
                  hr && detail.can.undoGoods
                    ? () => {
                        clearError();
                        setUndoing(r);
                      }
                    : undefined
                }
              />
            ))}
          </ul>
        </div>
      )}
      {hr && (
        <InwardDialog
          open={undoing !== null}
          mode="undo_goods"
          busy={m.busy}
          error={m.error}
          onClose={() => setUndoing(null)}
          onSubmit={(note) => undoing && m.run(() => api.undoGoodsReceipt(detail.id, undoing.id, { note: note || undefined }), 'Receipt undone')}
        />
      )}
    </section>
  );
}

/** The paper bill: a separate tick, no number. */
export function PaperBillBlock({ detail, scope, onChanged }: BlockProps) {
  const copy = detail.physicalCopy;
  const hr = scope === 'hr';
  const [back, setBack] = React.useState(false);
  const done = React.useCallback(() => {
    setBack(false);
    onChanged();
  }, [onChanged]);
  const m = useMutation(done);
  const received = copy.status === 'received';
  const Icon = received ? FileCheck2 : FileClock;
  const canTick = hr && detail.can.paper;
  return (
    <section className={SECTION} aria-label="Paper bill">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-sm font-bold text-fg">Paper bill</h2>
        <PhysicalCopyPill copy={copy} audience={scope} />
      </header>
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-xs sm:text-sm">
            {received ? (
              <>
                <p className="font-semibold text-fg">{hr ? 'Received' : 'Handed in'}</p>
                <p className="mt-0.5 text-fg-muted">{[copy.receivedBy ? `by ${copy.receivedBy}` : null, copy.receivedAt ? dateTimeText(copy.receivedAt) : null].filter(Boolean).join(' · ') || '—'}</p>
              </>
            ) : copy.status === 'pending' ? (
              <>
                <p className="font-semibold text-fg">{hr ? 'Not received yet' : 'Hand in the paper bill'}</p>
                <p className="mt-0.5 text-fg-muted">{hr ? 'The rules ask for the original bill of this expense. Tick it when it is in hand.' : 'Give the original bill to the person who keeps the bills.'}</p>
              </>
            ) : (
              <p className="text-fg-muted">{copy.status === 'optional' ? 'The paper bill is optional for this expense.' : 'The rules do not ask for the original bill of this expense.'}</p>
            )}
          </div>
          {canTick && (
            <Switch
              checked={received}
              disabled={m.busy}
              label="Paper bill received"
              onChange={(v) => (v ? m.run(() => api.setPaperCopy(detail.id, { received: true }), 'Paper bill received') : setBack(true))}
            />
          )}
        </div>
        {copy.note && <p className="rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-fg">{copy.note}</p>}
        {!back && <FormError message={m.error ? [m.error.form, ...Object.values(m.error.fields)].filter(Boolean).join(' ') : ''} />}
      </div>
      {hr && (
        <InwardDialog
          open={back}
          mode="paper_back"
          busy={m.busy}
          error={m.error}
          onClose={() => setBack(false)}
          onSubmit={(note) => m.run(() => api.setPaperCopy(detail.id, { received: false, note: note || undefined }), 'Paper bill set back to not received')}
        />
      )}
    </section>
  );
}
