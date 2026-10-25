'use client';

import React from 'react';
import { FileClock, PackageCheck } from 'lucide-react';
import { TextField } from '@/components/ui/FormControls';
import { AiMarker } from '@/features/expense-bills/components/BillPanel';
import { ReceiptViewer, type ReceiptFact } from '@/features/expense-bills/components/ReceiptViewer';
import { withoutBillNotes } from '@/features/expense-bills/utils/bill';
import { messageOf, statusOf } from '@/lib/api/errors';
import * as api from '../api/petty-cash.api';
import { toExpenseDetail } from '../types/petty-cash.mapper';
import type { ExpenseDetail, InwardLine } from '../types/petty-cash.model';
import { dateText, money, parseDecimal } from '../utils/format';
import { pickGoods, type GoodsNumbers } from '../utils/goods';
import { expenseFiles } from '../utils/pettyFiles';
import { AutoNumbersCheck, GoodsQtyTable } from './components/GoodsQtyTable';

export interface PhysicalGate {
  status: string;
  required: boolean;
  blocks_decision: boolean;
  step?: { name: string | null; current: boolean } | null;
}

export interface InwardGate {
  required: boolean;
  status: string;
  blocks_decision: boolean;
  step?: { name: string | null; current: boolean } | null;
  numbers: string[];
  numbering?: 'auto' | 'typed';
  lines?: Array<Omit<InwardLine, 'numbers'> & { numbers?: Array<{ inward_no: string; qty: number }> }>;
}

/** What the step-1 approver sends as approve `extra` besides the amount. */
export type PettyApproveExtra = {
  approved_amount?: number;
  receive_goods?: true | { all?: true; auto?: true; items?: Array<{ line: number; qty: number; inward_no?: string; auto?: boolean }> };
  paper_received?: true;
};

interface Props {
  expenseId: number;
  /** `decision_form.amount`: what was asked for. */
  amount: number;
  physical?: PhysicalGate;
  inward?: InwardGate;
  /** The approve call answered 409 `physical_copy_pending`. */
  blockedPaper?: boolean;
  /** The approve call answered 409 `inward_pending`. */
  blockedGoods?: boolean;
  /** `{ approved_amount }` when lowered, plus `receive_goods` / `paper_received` when cleared here; null when approved as asked; `valid` false disables Approve. */
  onChange?: (value: PettyApproveExtra | null, valid: boolean) => void;
  /** The bill beside its receipt only, no amount to edit (the drawer's page). */
  readOnly?: boolean;
  /** The approve call refused the amount (400 `errors.approved_amount`). */
  serverError?: string;
  /** The amount was edited (clears `serverError`). */
  onEdit?: () => void;
  /** The approve call refused the quantities (400 `errors.items`). */
  itemsError?: string;
  /** The quantities were edited (clears `itemsError`). */
  onItemsEdit?: () => void;
}

function amountError(raw: string, asked: number): string {
  if (raw.trim() === '') return 'Enter the amount to approve';
  const v = Number(raw);
  if (!Number.isFinite(v) || v <= 0) return 'Enter an amount above zero';
  if (v > asked) return `Cannot be more than the ${money(asked)} asked for`;
  return '';
}

/**
 * Shown when approving a petty cash expense: the bill beside its receipt, the amount (the approver may
 * lower it) and, when the paper bill must come first, a block to receive it before Approve is enabled.
 */
export function PettyExpenseReviewSection({ expenseId, amount, physical, inward, blockedPaper = false, blockedGoods = false, onChange, readOnly, serverError, onEdit, itemsError, onItemsEdit }: Props) {
  const [expense, setExpense] = React.useState<ExpenseDetail | null>(null);
  const [error, setError] = React.useState('');
  const [forbidden, setForbidden] = React.useState(false);
  const [value, setValue] = React.useState(String(amount));
  const [goodsMode, setGoodsMode] = React.useState<'all' | 'some' | null>(null);
  const [quantities, setQuantities] = React.useState<Record<number, string>>({});
  const [numbers, setNumbers] = React.useState<GoodsNumbers>({});
  const [autoAll, setAutoAll] = React.useState(true);
  const [paperTick, setPaperTick] = React.useState(false);

  React.useEffect(() => setValue(String(amount)), [amount]);

  React.useEffect(() => {
    let cancelled = false;
    setExpense(null);
    setError('');
    setForbidden(false);
    setGoodsMode(null);
    setQuantities({});
    setNumbers({});
    setAutoAll(true);
    setPaperTick(false);
    api
      .getExpense(expenseId)
      .then((dto) => !cancelled && setExpense(toExpenseDetail(dto)))
      .catch((err) => {
        if (cancelled) return;
        if (statusOf(err) === 403) setForbidden(true);
        else setError(messageOf(err));
      });
    return () => {
      cancelled = true;
    };
  }, [expenseId]);

  const goodsGate = !readOnly && inward?.status !== 'received' && Boolean(inward?.blocks_decision || blockedGoods);
  const paperGate = !readOnly && Boolean(physical?.blocks_decision || blockedPaper);
  const lines = React.useMemo<InwardLine[]>(
    () => (inward?.lines?.length ? inward.lines.map((l) => ({ ...l, numbers: (l.numbers || []).map((n) => ({ inwardNo: n.inward_no, qty: n.qty })) })) : expense?.inward.lines ?? []),
    [inward, expense]
  );
  const numbering = inward?.numbering ?? expense?.inward.numbering ?? 'auto';
  const pick = React.useMemo(() => pickGoods(lines, quantities, numbers, numbering), [lines, quantities, numbers, numbering]);
  const goodsOk = !goodsGate || goodsMode === 'all' || (goodsMode === 'some' && pick.items.length > 0 && Object.keys(pick.errors).length === 0);
  const paperOk = !paperGate || paperTick;
  const err = amountError(value, amount);

  React.useEffect(() => {
    if (!onChange) return;
    if (err || !goodsOk || !paperOk) {
      onChange(null, false);
      return;
    }
    const v = Math.round(Number(value) * 100) / 100;
    const extra: PettyApproveExtra = {
      ...(v === amount ? {} : { approved_amount: v }),
      ...(goodsGate ? { receive_goods: goodsMode === 'all' ? (numbering === 'typed' && autoAll ? { all: true as const, auto: true as const } : (true as const)) : { items: pick.items } } : {}),
      ...(paperGate ? { paper_received: true as const } : {}),
    };
    onChange(Object.keys(extra).length ? extra : null, true);
  }, [err, goodsOk, paperOk, goodsGate, paperGate, goodsMode, pick, numbering, autoAll, value, amount, onChange]);

  const editQty = (line: number, v: string) => {
    setQuantities((q) => ({ ...q, [line]: v }));
    onItemsEdit?.();
  };

  const bills = React.useMemo(() => (expense ? expenseFiles('hr', expense.id, 'receipt', expense.receipts) : []), [expense]);
  const proofs = React.useMemo(() => (expense ? expenseFiles('hr', expense.id, 'payment', expense.paymentProofs) : []), [expense]);
  const flags = React.useMemo(() => (expense ? withoutBillNotes(expense.flags) : []), [expense]);

  const facts: ReceiptFact[] = expense
    ? [
        { label: 'Asked', value: money(expense.amount) },
        { label: readOnly ? 'Approved' : 'Approving', value: readOnly ? (expense.approvedAmount !== null ? money(expense.approvedAmount) : '—') : !err ? money(Number(value)) : '—' },
        { label: 'Date', value: dateText(expense.expenseDate) },
        { label: 'Bill no.', value: expense.invoiceNo || '—' },
        { label: 'Wallet', value: expense.wallet.name },
        { label: 'Spent by', value: expense.spender.name },
      ]
    : [];

  return (
    <div className="space-y-3">
      {!readOnly && inward?.step && !inward.step.current && inward.status === 'pending' && (
        <p className="text-xs text-fg-muted sm:text-sm">The goods are received at the step “{inward.step.name}”, not here.</p>
      )}
      {!readOnly && physical?.step && !physical.step.current && physical.status === 'pending' && (
        <p className="text-xs text-fg-muted sm:text-sm">The paper bill is ticked at the step “{physical.step.name}”, not here.</p>
      )}
      {goodsGate && (
        <fieldset className="space-y-3 rounded-lg border border-dashed border-fg/60 p-3" aria-label="Goods to receive first">
          <legend className="sr-only">Goods to receive first</legend>
          <div className="flex items-start gap-2.5">
            <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-fg" aria-hidden />
            <div className="min-w-0 text-xs sm:text-sm">
              <p className="font-semibold text-fg">
                Receive the goods first <span className="text-[var(--tt-danger)]">*</span>
              </p>
              <p className="mt-0.5 text-fg-muted">The goods on this bill must be received before the first approval. Receiving them here gives every item its inward number. Rejecting is always possible.</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-sm text-fg" role="radiogroup" aria-label="How much arrived">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name={`goods-${expenseId}`} className="h-4 w-4 accent-[var(--tt-primary)]" checked={goodsMode === 'all'} onChange={() => { setGoodsMode('all'); onItemsEdit?.(); }} />
              Everything pending has arrived
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name={`goods-${expenseId}`} className="h-4 w-4 accent-[var(--tt-primary)]" checked={goodsMode === 'some'} onChange={() => { setGoodsMode('some'); onItemsEdit?.(); }} />
              Only some of it arrived
            </label>
          </div>
          {goodsMode === 'some' &&
            (lines.length ? (
              <GoodsQtyTable lines={lines} values={quantities} onChange={editQty} numbering={numbering} numbers={numbers} onNumberChange={(line, v) => { setNumbers((n) => ({ ...n, [line]: v })); onItemsEdit?.(); }} errors={pick.errors} error={itemsError || (!pick.items.length && Object.keys(quantities).length ? 'Enter how much of an item arrived' : undefined)} />
            ) : (
              <div aria-hidden className="h-24 w-full animate-pulse rounded-lg bg-bg-subtle" />
            ))}
          {goodsMode === 'all' && numbering === 'typed' && <AutoNumbersCheck checked={autoAll} onChange={setAutoAll} />}
          {goodsMode !== 'some' && itemsError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{itemsError}</p>}
        </fieldset>
      )}
      {paperGate && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-dashed border-fg/60 p-3 text-xs sm:text-sm" aria-label="Paper bill received">
          <input type="checkbox" checked={paperTick} onChange={(e) => setPaperTick(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--tt-primary)]" />
          <span className="flex min-w-0 items-start gap-2">
            <FileClock className="mt-0.5 h-4 w-4 shrink-0 text-fg" aria-hidden />
            <span>
              <span className="block font-semibold text-fg">
                The original paper bill is in hand <span className="text-[var(--tt-danger)]">*</span>
              </span>
              <span className="mt-0.5 block text-fg-muted">The paper bill must be received before the first approval. It has no number. Rejecting is always possible.</span>
            </span>
          </span>
        </label>
      )}

      {!readOnly && (
        <TextField
          label="Amount to approve"
          required
          inputMode="decimal"
          prefix="₹"
          value={value}
          onChange={(v) => {
            setValue(parseDecimal(v));
            onEdit?.();
          }}
          error={err || serverError || undefined}
          hint={`Asked for ${money(amount)}. It is taken from the wallet when approved.`}
        />
      )}

      {forbidden ? (
        readOnly ? null : <p className="text-xs text-fg-muted sm:text-sm">You can approve the amount as asked.</p>
      ) : error ? (
        <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>
      ) : !expense ? (
        <div aria-hidden className="h-40 w-full animate-pulse rounded-lg bg-bg-subtle" />
      ) : (
        <div className="rounded-lg border border-line p-3">
          <p className="text-sm font-semibold text-fg">
            {expense.category.name}
            {expense.merchant && <span className="font-normal text-fg-muted"> · {expense.merchant}</span>}
          </p>
          {expense.description && <p className="mt-0.5 text-xs text-fg-muted">{expense.description}</p>}
          {expense.aiScanned && <AiMarker label="Filled by AI from the receipt" className="mt-1.5" />}
          {(expense.bill || bills.length > 0 || proofs.length > 0) && (
            <div className="mt-2">
              <ReceiptViewer
                layout="compare"
                bills={bills}
                proofs={proofs}
                title={[expense.category.name, expense.merchant].filter(Boolean).join(' · ')}
                subtitle={[dateText(expense.expenseDate), expense.invoiceNo ? `Bill ${expense.invoiceNo}` : null].filter(Boolean).join(' · ')}
                bill={expense.bill}
                fromAi={expense.aiScanned}
                flags={flags}
                facts={facts}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
