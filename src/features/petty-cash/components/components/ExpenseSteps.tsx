'use client';

import React from 'react';
import { FileWarning, PenLine } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { FieldLabel, FieldMessage, TextField, shellClass } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { AiMarker } from '@/features/expense-bills/components/BillPanel';
import { BillItemsEditor } from '@/features/expense-bills/components/BillItems';
import { FlagList } from '@/features/expense-bills/components/Flags';
import { PaymentFields } from '@/features/expense-bills/components/PaymentFields';
import { ReceiptPicker } from '@/features/expense-bills/components/ReceiptPicker';
import { ReceiptViewer } from '@/features/expense-bills/components/ReceiptViewer';
import { categoryIcon, MAX_LINE_FILES, MAX_PAYMENT_REFERENCE } from '@/features/expense-bills/constants/bill.constants';
import type { ReceiptFile } from '@/features/expense-bills/hooks/useFileLink';
import { amountMatchesBill } from '@/features/expense-bills/types/bill.mapper';
import type { Bill, UploadedFile } from '@/features/expense-bills/types/bill.model';
import { emptyItem, hasBillHeader, isEmptyItem, newManualBill, syncManualTotals, withServerCheck, withoutBillNotes } from '@/features/expense-bills/utils/bill';
import { addDays } from '@/lib/datetime';
import type { Category, ExpenseInput, ExpensePreview, ExpenseScan, Wallet } from '../../types/petty-cash.model';
import { dateText, money, parseDecimal, walletOwner } from '../../utils/format';
import { CategoryIcon } from './Primitives';

const NOT_ON_RECEIPT = 'Not found on the bill. Fill it in.';

export type Errors = Record<string, string>;

/** The step a server field error belongs to. */
export function stepOfField(field: string): 1 | 2 | 3 {
  if (field === 'wallet_id' || field === 'spent_by') return 1;
  if (field.startsWith('payment_')) return 3;
  return 2;
}

/** Whether a paper bill is expected for this wallet and amount, from the wallet's rules (the preview's answer wins when it has one). */
export function paperNeed(wallet: Wallet | null, amount: number, preview: ExpensePreview | null): 'none' | 'optional' | 'required' {
  if (preview?.physical) return preview.physical.required ? 'required' : preview.physical.status === 'optional' ? 'optional' : 'none';
  const r = wallet?.rules;
  if (!r) return 'none';
  if (r.physicalCopy === 'always') return 'required';
  if (r.physicalCopy === 'above') return r.physicalCopyAbove !== null && amount > r.physicalCopyAbove ? 'required' : 'none';
  return r.physicalCopy === 'optional' ? 'optional' : 'none';
}

/** Plain words about the paper bill, or null when none is needed. */
export function PaperBillNotice({ need, className }: { need: 'none' | 'optional' | 'required'; className?: string }) {
  if (need === 'none') return null;
  return (
    <p className={cx('rounded-lg border px-3 py-2 text-xs text-fg', need === 'required' ? 'border-dashed border-fg/60 bg-bg-subtle' : 'border-line', className)}>
      {need === 'required' ? (
        <>
          <span className="font-semibold">A paper bill is needed.</span> Hand the original in to HR or Accounts after you submit this.
        </>
      ) : (
        <>
          <span className="font-semibold">Paper bill optional.</span> You can hand the original in to HR or Accounts, but it is not required.
        </>
      )}
    </p>
  );
}

/** Receipt rule from the wallet's settings: whether a copy of the bill is needed at this amount, and the hint under the picker. */
export function receiptRule(wallet: Wallet | null, amount: number): { required: boolean; hint: string } {
  const above = wallet?.rules?.receiptRequiredAbove ?? null;
  if (above === null) return { required: false, hint: 'PDF, JPG or PNG, up to 5 MB each' };
  const needed = amount > above;
  return { required: needed, hint: needed ? `A copy of the bill is needed above ${money(above)}` : `Needed above ${money(above)}` };
}

export function categoryOptions(categories: Category[]): ComboboxOption[] {
  return categories.map((c) => {
    const Icon = categoryIcon(c.icon);
    return { value: c.id, label: c.name, icon: <Icon className="h-4 w-4" aria-hidden /> };
  });
}

// ── Step 1: who and which wallet ────────────────────────────────────────────

/** Why a wallet cannot be picked, or null. */
export function walletBlock(w: Wallet): string | null {
  if (w.status === 'frozen') return 'Frozen: no new expenses';
  if (w.status === 'closed') return 'Closed';
  return null;
}

/** The wallet the expense is spent from. One wallet is shown as a line; several as radio cards. */
export function WalletPicker({ wallets, value, onChange, error }: { wallets: Wallet[]; value: number | null; onChange: (id: number) => void; error?: string }) {
  return (
    <div>
      <FieldLabel label="Spend from" required />
      <div role="radiogroup" aria-label="Spend from" className={cx('grid gap-2', wallets.length > 1 && 'sm:grid-cols-2')}>
        {wallets.map((w) => {
          const on = value === w.id;
          const block = walletBlock(w);
          return (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={Boolean(block)}
              onClick={() => onChange(w.id)}
              className={cx(
                'rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                error && !on ? 'border-[var(--tt-danger)]' : on ? 'border-fg bg-bg-subtle ring-1 ring-fg' : 'border-line bg-surface hover:bg-bg-subtle'
              )}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-semibold text-fg">{w.name}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-fg">{w.spendable === null ? money(w.available) : money(Math.max(0, w.spendable))}</span>
              </span>
              <span className="mt-0.5 flex items-baseline justify-between gap-3 text-[11px] text-fg-muted">
                <span className="truncate">{block ?? walletOwner(w)}</span>
                <span className="shrink-0">can spend</span>
              </span>
            </button>
          );
        })}
      </div>
      <FieldMessage error={error} />
    </div>
  );
}

// ── Step 2: details ─────────────────────────────────────────────────────────

interface DetailsStepProps {
  input: ExpenseInput;
  wallet: Wallet | null;
  categories: Category[];
  errors: Errors;
  today: string;
  preview: ExpensePreview | null;
  previewing: boolean;
  scan: ExpenseScan | null;
  store: (file: File) => Promise<UploadedFile>;
  onChange: (patch: Partial<ExpenseInput>) => void;
  onClearError: (field: string) => void;
  onBusyChange: (busy: boolean) => void;
  /** The bill copies and payment proofs as previewable files. */
  receipts: { bills: ReceiptFile[]; proofs: ReceiptFile[] };
  onLocalFile?: (key: string, file: File) => void;
}

/** Step 2: category, date, amount, merchant, description, purpose, the invoice (seller and items) and the bill copies. */
export function DetailsStep({ input, wallet, categories, errors, today, preview, previewing, scan, store, onChange, onClearError, onBusyChange, receipts, onLocalFile }: DetailsStepProps) {
  const options = React.useMemo(() => categoryOptions(categories), [categories]);
  const cat = categories.find((c) => c.id === input.categoryId);
  const amount = Number(input.amount) || 0;
  const receipt = receiptRule(wallet, amount);
  const set = (patch: Partial<ExpenseInput>, field: string) => {
    onChange(patch);
    onClearError(field);
  };

  // Once corrected, only the preview's check is shown (the scan's check is out of date).
  const [billTouched, setBillTouched] = React.useState(false);
  const [editAmount, setEditAmount] = React.useState(false);
  const bill = input.bill;
  const shownBill = React.useMemo<Bill>(
    () => bill ?? { ...newManualBill({ invoiceNumber: input.invoiceNo.trim() || null, invoiceDate: input.expenseDate || null, sellerName: input.merchant.trim() || null }), items: [] },
    [bill, input.invoiceNo, input.expenseDate, input.merchant]
  );
  const hasItems = Boolean(bill && bill.items.length > 0);
  const grand = bill?.totals.grand ?? null;
  const followsItems = hasItems && input.amountFromBill;

  /** A corrected bill keeps the bill no., GSTIN and merchant in step, and the amount while it follows the bill total. */
  const setBill = (raw: Bill) => {
    let next0 = raw;
    const creating = !bill;
    if (creating && amount > 0 && next0.items.length === 1 && isEmptyItem(next0.items[0])) {
      next0 = { ...next0, items: [{ ...emptyItem(), rate: amount, taxableValue: amount, amount }] };
    }
    const next = syncManualTotals(next0);
    const patch: Partial<ExpenseInput> = { invoiceNo: next.invoiceNumber ?? '', sellerGstin: next.seller.gstin };
    if ((next.seller.name ?? '') !== (shownBill.seller.name ?? '')) patch.merchant = (next.seller.name ?? '').slice(0, 120);
    const typedHeader = hasBillHeader({ ...next, invoiceNumber: null, invoiceDate: null, seller: { ...next.seller, name: null } });
    setBillTouched(true);
    onClearError('bill');
    onClearError('invoice_no');
    // A hand-entered bill with no item, charge or seller detail is dropped: back to a plain amount.
    if (next.source === 'manual' && !next.items.length && !next.charges.length && !typedHeader) {
      onChange({ ...patch, bill: null, amountFromBill: false });
      return;
    }
    patch.bill = next;
    const follows = creating ? next.items.length > 0 : input.amountFromBill;
    if (creating) patch.amountFromBill = follows;
    if (follows && next.items.length) {
      const total = next.totals.grand;
      patch.amount = total !== null && total > 0 ? String(total) : '';
      onClearError('amount');
    }
    onChange(patch);
  };
  const applyBillTotal = () => {
    setEditAmount(false);
    set({ amount: grand !== null && grand > 0 ? String(grand) : '', amountFromBill: true }, 'amount');
  };
  const setMerchant = (v: string) => {
    const syncSeller = bill && (bill.seller.name ?? '') === input.merchant;
    set({ merchant: v, ...(syncSeller ? { bill: { ...bill, seller: { ...bill.seller, name: v.trim() || null } } } : {}) }, 'merchant');
  };

  // A field the reader could not fill stays highlighted until it is filled; so does a scanned expense without a category.
  const missing = (f: 'category_id' | 'expense_date' | 'amount') => {
    if (f === 'category_id') return Boolean(scan) && !input.categoryId;
    if (!scan?.missing.includes(f)) return false;
    return f === 'expense_date' ? !input.expenseDate : !input.amount;
  };
  const flags = preview ? withoutBillNotes(preview.flags) : [];
  const minDate = wallet?.rules ? addDays(today, -wallet.rules.maxBackdateDays) : undefined;

  return (
    <div className="tt-fade-in space-y-4">
      {(input.aiScanned || scan?.status === 'unread') && (
        <div className="space-y-1.5">
          {input.aiScanned && <AiMarker />}
          {scan?.status === 'unread' && scan.message && (
            <p className="flex items-start gap-1.5 text-xs text-fg">
              <FileWarning className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{scan.message} The bill is attached; fill the rest by hand.</span>
            </p>
          )}
        </div>
      )}

      <div>
        <FieldLabel label="Category" required />
        <Combobox
          ariaLabel="Category"
          options={options}
          value={input.categoryId}
          onChange={(v) => set({ categoryId: typeof v === 'number' ? v : v === null ? null : Number(v) }, 'category_id')}
          placeholder="Choose a category"
          searchPlaceholder="Search categories…"
          emptyLabel="No category matches"
          clearable={false}
          invalid={Boolean(errors.category_id)}
          attention={missing('category_id')}
        />
        <FieldMessage error={errors.category_id} hint={missing('category_id') ? 'Choose the category for this bill.' : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="Date"
          required
          type="date"
          min={minDate}
          max={today}
          value={input.expenseDate}
          onChange={(v) => set({ expenseDate: v }, 'expense_date')}
          error={errors.expense_date}
          attention={missing('expense_date')}
          hint={missing('expense_date') ? NOT_ON_RECEIPT : wallet?.rules ? `Up to ${wallet.rules.maxBackdateDays} days back` : undefined}
        />
        {followsItems ? (
          <div>
            <FieldLabel
              label="Amount"
              required
              aside={
                <button type="button" onClick={() => { setEditAmount(true); onChange({ amountFromBill: false }); }} className="text-[11px] font-semibold text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline">
                  Edit amount
                </button>
              }
            />
            <div className={cx(shellClass(Boolean(errors.amount)), 'bg-bg-subtle')}>
              <span className="shrink-0 text-xs font-semibold text-fg-muted">₹</span>
              <output aria-label="Amount" className="min-w-0 flex-1 truncate text-sm font-semibold tabular-nums text-fg">
                {grand !== null && grand > 0 ? grand.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </output>
            </div>
            <FieldMessage error={errors.amount} hint="The grand total of the bill below" />
          </div>
        ) : (
          <TextField
            label="Amount"
            required
            inputMode="decimal"
            prefix="₹"
            value={input.amount}
            autoFocus={editAmount}
            onChange={(v) => set({ amount: parseDecimal(v), amountFromBill: false }, 'amount')}
            placeholder="0"
            error={errors.amount}
            attention={missing('amount')}
            aside={
              hasItems && grand !== null && grand > 0 && !amountMatchesBill(input.amount, bill) ? (
                <button type="button" onClick={applyBillTotal} className="text-[11px] font-semibold text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline">
                  Use bill total
                </button>
              ) : undefined
            }
            hint={
              missing('amount')
                ? NOT_ON_RECEIPT
                : hasItems && grand !== null && grand > 0
                  ? amountMatchesBill(input.amount, bill)
                    ? 'The bill total'
                    : `Not the bill total (${money(grand)}). The approver sees the difference.`
                  : wallet?.maxPerExpense
                    ? `Up to ${money(wallet.maxPerExpense)} per expense`
                    : undefined
            }
          />
        )}
        <div className="sm:col-span-2">
          <TextField label="Merchant" value={input.merchant} onChange={setMerchant} placeholder="Shop, vendor or service" maxLength={120} error={errors.merchant} />
        </div>
        <div className="sm:col-span-2">
          <TextField label="Description" value={input.description} onChange={(v) => set({ description: v }, 'description')} placeholder="What it was for" maxLength={300} error={errors.description} />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Purpose" value={input.purpose} onChange={(e) => set({ purpose: e.target.value }, 'purpose')} rows={2} placeholder="Why this was needed" maxLength={1000} error={errors.purpose} />
        </div>
      </div>

      <ReceiptViewer
        bills={receipts.bills}
        proofs={receipts.proofs}
        title={[cat?.name, input.merchant.trim()].filter(Boolean).join(' · ') || 'Bill'}
        subtitle={[input.expenseDate ? dateText(input.expenseDate) : null, input.invoiceNo.trim() ? `Bill ${input.invoiceNo.trim()}` : null, amount ? money(amount) : null].filter(Boolean).join(' · ')}
        bill={bill ? (preview?.bill ? withServerCheck(bill, preview.bill) : bill) : null}
        checked={Boolean(preview?.bill)}
        pending={Boolean(bill) && previewing}
        fromAi={input.aiScanned}
        flags={flags}
        facts={[
          { label: 'Amount', value: amount ? money(amount) : '—' },
          { label: 'Date', value: input.expenseDate ? dateText(input.expenseDate) : '—' },
          { label: 'Merchant', value: input.merchant.trim() || '—' },
          { label: 'Bill no.', value: input.invoiceNo.trim() || '—' },
        ]}
      >
        <BillItemsEditor
          bill={shownBill}
          fromAi={input.aiScanned}
          onChange={setBill}
          invoiceError={errors.invoice_no || errors.bill}
          check={{ bill: bill ? preview?.bill ?? (billTouched ? null : bill) : null, pending: Boolean(bill) && previewing }}
        />
      </ReceiptViewer>

      <ReceiptPicker
        label="Bill copies"
        value={input.receipts}
        onChange={(receiptsNext) => set({ receipts: receiptsNext }, 'receipts')}
        max={MAX_LINE_FILES}
        required={receipt.required || Boolean(errors.receipts)}
        error={errors.receipts}
        hint={receipt.hint}
        store={store}
        onBusyChange={onBusyChange}
        onUploaded={onLocalFile}
        addLabel="Attach the bill"
        compact
      />

      {flags.length > 0 && (
        <div className="rounded-lg bg-bg-subtle px-3 py-2">
          <FlagList flags={flags} compact />
        </div>
      )}
    </div>
  );
}

// ── Step 3: payment ─────────────────────────────────────────────────────────

interface PaymentStepProps {
  input: ExpenseInput;
  errors: Errors;
  store: (file: File) => Promise<UploadedFile>;
  onChange: (patch: Partial<ExpenseInput>) => void;
  onClearError: (field: string) => void;
  onBusyChange: (busy: boolean) => void;
  onLocalFile?: (key: string, file: File) => void;
}

/** Step 3: how it was paid, the reference and proof of payment. */
export function PaymentStep({ input, errors, store, onChange, onClearError, onBusyChange, onLocalFile }: PaymentStepProps) {
  return (
    <PaymentFields
      value={{ mode: input.paymentMode, reference: input.paymentReference, proofs: input.paymentProofs }}
      errors={{ mode: errors.payment_mode, reference: errors.payment_reference, proofs: errors.payment_proofs }}
      printed={input.bill?.paymentMode}
      onChange={(patch) => {
        const next: Partial<ExpenseInput> = {};
        if ('mode' in patch) next.paymentMode = patch.mode ?? null;
        if ('reference' in patch) next.paymentReference = patch.reference ?? '';
        if ('proofs' in patch) next.paymentProofs = patch.proofs ?? [];
        onChange(next);
        if ('mode' in patch) onClearError('payment_mode');
        if ('reference' in patch) onClearError('payment_reference');
        if ('proofs' in patch) onClearError('payment_proofs');
      }}
      store={store}
      onBusyChange={onBusyChange}
      onLocalFile={onLocalFile}
    />
  );
}

// ── Validation ──────────────────────────────────────────────────────────────

export function validateWalletStep(input: ExpenseInput, needsEmployee: boolean): Errors {
  const e: Errors = {};
  if (needsEmployee) e.spent_by = 'Choose the employee';
  if (!input.walletId) e.wallet_id = 'Choose the wallet';
  return e;
}

/** The details step: obvious mistakes before a round trip (the server stays the authority). */
export function validateDetails(input: ExpenseInput, today: string): Errors {
  const e: Errors = {};
  if (!input.categoryId) e.category_id = 'Choose a category';
  if (!input.expenseDate) e.expense_date = 'Pick the date';
  else if (input.expenseDate > today) e.expense_date = 'The date cannot be in the future';
  if (!input.amount || !(Number(input.amount) > 0)) e.amount = 'Enter the amount';
  if (input.merchant.length > 120) e.merchant = 'Keep it under 120 characters';
  if (input.description.length > 300) e.description = 'Keep it under 300 characters';
  if (input.purpose.length > 1000) e.purpose = 'Keep it under 1000 characters';
  if (input.invoiceNo.trim().length > 100) e.invoice_no = 'Keep the bill no. under 100 characters';
  return e;
}

export function validatePayment(input: ExpenseInput): Errors {
  const e: Errors = {};
  if (input.paymentReference.trim().length > MAX_PAYMENT_REFERENCE) e.payment_reference = `Keep it under ${MAX_PAYMENT_REFERENCE} characters`;
  return e;
}

// ── Step 4: review ──────────────────────────────────────────────────────────

interface ReviewCardProps {
  input: ExpenseInput;
  wallet: Wallet | null;
  category: Category | undefined;
  preview: ExpensePreview | null;
  errors: Errors;
  onEdit: (step: 1 | 2 | 3) => void;
  receipts: { bills: ReceiptFile[]; proofs: ReceiptFile[] };
}

/** The expense as it will be sent: what it is, the invoice as the server checked it, how it was paid, and anything to fix. */
export function ReviewCard({ input, wallet, category, preview, errors, onEdit, receipts }: ReviewCardProps) {
  const failed = Object.entries(errors).filter(([, v]) => v);
  const firstStep = failed.length ? Math.min(...failed.map(([k]) => stepOfField(k))) : 2;
  const amount = Number(input.amount) || 0;
  const bill = input.bill ? (preview?.bill ? withServerCheck(input.bill, preview.bill) : input.bill) : null;
  const flags = preview ? withoutBillNotes(preview.flags) : [];
  const paid = [
    input.paymentMode ? input.paymentMode.replace('_', ' ') : null,
    input.paymentReference.trim() ? `Ref ${input.paymentReference.trim()}` : null,
    input.paymentProofs.length ? `${input.paymentProofs.length} ${input.paymentProofs.length === 1 ? 'proof' : 'proofs'}` : null,
  ].filter(Boolean);
  const files = input.receipts.length;
  return (
    <div className={cx('tt-fade-in rounded-xl border bg-surface p-3 sm:p-4', failed.length ? 'border-[var(--tt-danger)]' : 'border-line')}>
      <div className="flex items-start gap-3">
        <CategoryIcon icon={category?.icon} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="min-w-0 text-sm font-semibold text-fg">
              {category?.name || 'No category'}
              {input.merchant.trim() && <span className="font-normal text-fg-muted"> · {input.merchant.trim()}</span>}
            </p>
            <p className="text-sm font-bold tabular-nums text-fg">{money(amount)}</p>
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">
            {[wallet?.name, input.expenseDate ? dateText(input.expenseDate) : 'No date', files ? `${files} ${files === 1 ? 'file' : 'files'} attached` : 'No bill copy'].filter(Boolean).join(' · ')}
          </p>
          {input.description.trim() && <p className="mt-1 text-xs text-fg">{input.description.trim()}</p>}
          {input.purpose.trim() && <p className="mt-1 text-xs text-fg-muted">{input.purpose.trim()}</p>}
          {input.aiScanned && <AiMarker label="Filled by AI from the bill" className="mt-1.5" />}
        </div>
      </div>

      {(bill || receipts.bills.length > 0 || receipts.proofs.length > 0) && (
        <div className="mt-3">
          <ReceiptViewer
            bills={receipts.bills}
            proofs={receipts.proofs}
            title={[category?.name, input.merchant.trim()].filter(Boolean).join(' · ') || 'Bill'}
            subtitle={[input.expenseDate ? dateText(input.expenseDate) : null, input.invoiceNo.trim() ? `Bill ${input.invoiceNo.trim()}` : null, money(amount)].filter(Boolean).join(' · ')}
            bill={bill}
            checked={Boolean(preview?.bill)}
            flags={flags}
            facts={[
              { label: 'Amount', value: money(amount) },
              { label: 'Date', value: input.expenseDate ? dateText(input.expenseDate) : '—' },
              { label: 'Bill no.', value: input.invoiceNo.trim() || '—' },
              { label: 'Paid by', value: paid.length ? paid.join(' · ') : '—' },
            ]}
          />
        </div>
      )}

      <p className="mt-3 text-xs">
        <span className="text-fg-muted">Paid by </span>
        <span className={paid.length ? 'font-semibold capitalize text-fg' : 'text-fg-muted'}>{paid.length ? paid.join(' · ') : 'Not given'}</span>
      </p>

      {flags.length > 0 && (
        <div className="mt-2 rounded-lg bg-bg-subtle px-3 py-2">
          <FlagList flags={flags} compact />
        </div>
      )}

      {failed.length > 0 && (
        <ul className="mt-2 space-y-0.5" role="alert">
          {failed.map(([k, v]) => (
            <li key={k} className="text-xs font-medium text-[var(--tt-danger)]">
              {v}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
        <button type="button" onClick={() => onEdit(3)} className="inline-flex h-8 items-center rounded-lg border border-line px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle">
          Payment
        </button>
        <button
          type="button"
          onClick={() => onEdit(failed.length ? (firstStep as 1 | 2 | 3) : 2)}
          className={cx('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors', failed.length ? 'bg-fg text-[var(--tt-on-primary)] hover:opacity-90' : 'border border-line text-fg hover:bg-bg-subtle')}
        >
          <PenLine className="h-3.5 w-3.5" aria-hidden />
          {failed.length ? 'Fix' : 'Edit'}
        </button>
      </div>
    </div>
  );
}
