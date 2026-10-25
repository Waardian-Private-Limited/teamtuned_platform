'use client';

import React from 'react';
import { Check, Copy, PackageCheck } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { splitError } from '@/features/expense-bills/utils/errors';
import { showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/petty-cash.api';
import { toExpenseDetail } from '../../types/petty-cash.mapper';
import type { ReceiveGoodsBodyDto } from '../../types/petty-cash.dto';
import type { ExpenseDetail } from '../../types/petty-cash.model';
import { pickGoods, qtyText, type GoodsNumbers } from '../../utils/goods';
import { leftoverError } from '../../utils/formError';
import { AutoNumbersCheck, GoodsQtyTable } from './GoodsQtyTable';
import { Block, FormError } from './Primitives';
import { InwardNo } from './StatusBadges';

interface IssuedItem {
  key: string;
  name: string;
  unit: string | null;
  qty: number;
  inwardNo: string | null;
}

/** True when a just-saved expense still has goods to receive and the caller may receive them. */
export function needsGoodsReceipt(d: ExpenseDetail | null | undefined): boolean {
  return Boolean(d && d.inward.required && d.can.receiveGoods && d.inward.status !== 'received');
}

interface ReceiveGoodsDialogProps {
  open: boolean;
  /** The expense, when already in hand (right after saving). */
  detail?: ExpenseDetail | null;
  /** Otherwise the expense is loaded by id. */
  expenseId?: number | null;
  onClose: () => void;
  /** Goods were received (the list behind the dialog should refresh). */
  onReceived?: () => void;
}

/** Receives the goods of one expense in a popup and shows the inward number(s) it was given. */
export function ReceiveGoodsDialog({ open, detail: given, expenseId, onClose, onReceived }: ReceiveGoodsDialogProps) {
  const [detail, setDetail] = React.useState<ExpenseDetail | null>(given ?? null);
  const [loadError, setLoadError] = React.useState('');
  const [values, setValues] = React.useState<Record<number, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<{ fields: Record<string, string>; form: string } | null>(null);
  const [localError, setLocalError] = React.useState('');
  const [numbers, setNumbers] = React.useState<GoodsNumbers>({});
  const [autoAll, setAutoAll] = React.useState(true);
  const [issued, setIssued] = React.useState<IssuedItem[] | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setValues({});
    setNumbers({});
    setAutoAll(true);
    setError(null);
    setLocalError('');
    setIssued(null);
    setCopied(false);
    setLoadError('');
    if (given) {
      setDetail(given);
      return;
    }
    if (!expenseId) return;
    let live = true;
    setDetail(null);
    api
      .getExpense(expenseId)
      .then((dto) => live && setDetail(toExpenseDetail(dto)))
      .catch((e) => live && setLoadError(messageOf(e) || 'Could not load this expense'));
    return () => {
      live = false;
    };
  }, [open, given, expenseId]);

  const lines = detail?.inward.lines ?? [];
  const numbering = detail?.inward.numbering ?? 'auto';
  const pick = React.useMemo(() => pickGoods(lines, values, numbers, numbering), [lines, values, numbers, numbering]);
  const hasErrors = Object.keys(pick.errors).length > 0;

  const receive = async (body: ReceiveGoodsBodyDto) => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    setLocalError('');
    try {
      const next = toExpenseDetail(await api.receiveGoods(detail.id, body));
      const before = new Set(detail.inward.receipts.map((r) => r.id));
      const fresh = next.inward.receipts.filter((r) => !before.has(r.id)).flatMap((r) => r.items.map((i) => ({ key: `${r.id}-${i.line}`, name: i.name, unit: i.unit, qty: i.qty, inwardNo: i.inwardNo })));
      setIssued(fresh);
      setDetail(next);
      showSuccess('Goods received');
      onReceived?.();
    } catch (err) {
      setError(splitError(err));
    } finally {
      setBusy(false);
    }
  };

  const receiveSome = () => {
    if (hasErrors || !pick.items.length) {
      setLocalError(hasErrors ? 'Fix the quantities marked in red' : 'Enter how much of an item arrived');
      return;
    }
    receive({ items: pick.items });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText((issued ?? []).map((i) => i.inwardNo).filter(Boolean).join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const itemsError = localError || error?.fields.items || '';
  const title = issued ? 'Goods received' : 'Receive goods';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidthClassName="max-w-2xl"
      footer={
        issued ? (
          <Btn variant="primary" onClick={onClose}>
            Done
          </Btn>
        ) : (
          <>
            <Btn onClick={onClose}>Later</Btn>
            <Btn busy={busy} disabled={!detail || !lines.length} onClick={receiveSome}>
              Receive entered quantities
            </Btn>
            <Btn variant="primary" busy={busy} disabled={!detail || !lines.length} icon={<PackageCheck className="h-3.5 w-3.5" />} onClick={() => receive({ all: true, ...(numbering === 'typed' && autoAll ? { auto: true } : {}) })}>
              Receive all
            </Btn>
          </>
        )
      }
    >
      {issued ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center" role="status">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-subtle text-fg">
            <Check className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm text-fg-muted">{issued.length > 1 ? 'Inward numbers' : 'Inward number'}</p>
          <ul className="flex w-full flex-col divide-y divide-line rounded-lg border border-line text-left">
            {issued.map((i) => (
              <li key={i.key} className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span className="min-w-0 break-words text-xs text-fg sm:text-sm">
                  <span className="font-semibold">{i.name}</span>
                  <span className="text-fg-muted"> · {qtyText(i.qty)}{i.unit ? ` ${i.unit}` : ''}</span>
                </span>
                {i.inwardNo ? <InwardNo value={i.inwardNo} className="self-start px-3 py-1.5 text-lg sm:self-auto sm:text-2xl" /> : <span className="text-sm font-semibold text-fg-muted">No number</span>}
              </li>
            ))}
          </ul>
          {issued.some((i) => i.inwardNo) && (
            <Btn icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </Btn>
          )}
          {detail && detail.inward.status !== 'received' && <p className="text-xs text-fg-muted">Some goods are still pending. Receive the rest later under a new number.</p>}
        </div>
      ) : loadError ? (
        <FormError message={loadError} />
      ) : !detail ? (
        <div className="space-y-3" aria-busy="true">
          <Block className="h-5 w-1/2 rounded-md" />
          <Block className="h-32 rounded-lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-fg-muted sm:text-sm">
            <span className="font-semibold text-fg">{detail.number}</span>
            {detail.merchant ? ` · ${detail.merchant}` : ''}. Enter what arrived, or receive everything pending.
          </p>
          {lines.length > 0 ? (
            <GoodsQtyTable
              lines={lines}
              values={values}
              disabled={busy}
              errors={pick.errors}
              error={itemsError || undefined}
              numbering={numbering}
              numbers={numbers}
              onNumberChange={(line, v) => {
                setNumbers((s) => ({ ...s, [line]: v }));
                setError(null);
              }}
              onChange={(line, v) => {
                setValues((s) => ({ ...s, [line]: v }));
                setLocalError('');
                setError(null);
              }}
            />
          ) : (
            <p className="text-xs text-fg-muted sm:text-sm">The items on this bill are not listed yet.</p>
          )}
          {numbering === 'typed' && lines.length > 0 && <AutoNumbersCheck checked={autoAll} onChange={setAutoAll} disabled={busy} />}
          <FormError message={leftoverError(error, ['items'])} />
        </div>
      )}
    </Dialog>
  );
}
