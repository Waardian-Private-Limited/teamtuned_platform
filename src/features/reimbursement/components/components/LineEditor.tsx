'use client';

import React from 'react';
import { FileWarning } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { FieldLabel, FieldMessage, TextField, shellClass } from '@/components/ui/FormControls';
import type { UploadScope } from '../../api/reimbursement.api';
import { MAX_LINE_FILES, categoryIcon } from '../../constants/reimbursement.constants';
import { amountMatchesBill } from '../../types/reimbursement.mapper';
import type { Bill, Category, ClaimPreviewLine, LineInput } from '../../types/reimbursement.model';
import { emptyItem, hasBillHeader, isEmptyItem, newManualBill, syncManualTotals, withServerCheck, withoutBillNotes } from '../../utils/bill';
import { lineKey } from '../../utils/errors';
import { dateText, money, parseDecimal } from '../../utils/format';
import { AiMarker } from './BillPanel';
import { BillItemsEditor } from './BillItems';
import { FlagList } from './StatusBadges';
import { ReceiptPicker } from './ReceiptPicker';
import { ReceiptViewer, type ReceiptFile } from './ReceiptViewer';

const NOT_ON_RECEIPT = 'Not found on the bill. Fill it in.';

/** Category dropdown options: icon + name, distance categories marked "per km". */
export function categoryOptions(categories: Category[]): ComboboxOption[] {
  return categories.map((c) => {
    const Icon = categoryIcon(c.icon);
    return {
      value: c.id,
      label: c.name,
      description: c.description || undefined,
      icon: <Icon className="h-4 w-4" aria-hidden />,
      meta: c.kind === 'distance' ? (c.rule?.ratePerKm ? `${money(c.rule.ratePerKm)} per km` : 'per km') : undefined,
    };
  });
}

/** Whether a receipt is needed for this category and amount, and the hint under the picker. */
export function receiptRule(cat: Category | undefined, amount: number): { required: boolean; hint: string } {
  const r = cat?.rule;
  if (!r || r.receipt === 'never') return { required: false, hint: 'PDF, JPG or PNG, up to 5 MB each' };
  if (r.receipt === 'always') return { required: true, hint: 'A copy of the bill is needed for this category' };
  const needed = amount > r.receiptAbove;
  return { required: needed, hint: needed ? `A copy of the bill is needed above ${money(r.receiptAbove)}` : `Needed above ${money(r.receiptAbove)}` };
}

/** The line's amount: km × rate for distance categories, else the typed amount. */
export function lineAmount(line: LineInput, cat: Category | undefined, preview: ClaimPreviewLine | null): number {
  if (cat?.kind === 'distance') {
    const rate = preview?.rate ?? cat.rule?.ratePerKm ?? null;
    return preview?.amount ?? (rate ? Math.round((Number(line.quantity) || 0) * rate * 100) / 100 : 0);
  }
  return Number(line.amount) || 0;
}

interface LineDetailsProps {
  index: number;
  line: LineInput;
  categories: Category[];
  errors: Record<string, string>;
  today: string;
  /** Live result for this line from the preview (amount for distance lines, flags, the checked bill). */
  preview: ClaimPreviewLine | null;
  /** The debounced preview is running for this line. */
  previewing: boolean;
  uploadScope: UploadScope;
  employeeId?: number | null;
  onChange: (patch: Partial<LineInput>) => void;
  onClearError: (key: string) => void;
  onBusyChange: (busy: boolean) => void;
  /** Report fields shown above the bill (title, purpose). */
  children?: React.ReactNode;
  /** The bill copies and payment proofs as previewable files. */
  receipts?: { bills: ReceiptFile[]; proofs: ReceiptFile[] };
  /** A file was just uploaded from the browser. */
  onLocalFile?: (key: string, file: File) => void;
}

/** Step 2 of a bill: category, date, merchant, amount, description, the invoice (seller and items) and the bill copies. */
export function LineDetails({ index, line, categories, errors, today, preview, previewing, uploadScope, employeeId, onChange, onClearError, onBusyChange, children, receipts, onLocalFile }: LineDetailsProps) {
  const options = React.useMemo(() => categoryOptions(categories), [categories]);
  const cat = categories.find((c) => c.id === line.categoryId);
  const distance = cat?.kind === 'distance';
  const err = (f: string) => errors[lineKey(index, f)];
  const rate = preview?.rate ?? cat?.rule?.ratePerKm ?? null;
  const km = Number(line.quantity) || 0;
  const amount = lineAmount(line, cat, preview);
  const receipt = receiptRule(cat, amount);

  const set = (patch: Partial<LineInput>, field: string) => {
    onChange(patch);
    onClearError(lineKey(index, field));
  };

  // Once corrected, only the preview's check is shown (the scan's or draft's check is out of date).
  const [billTouched, setBillTouched] = React.useState(false);
  // "Edit amount" was just pressed: the amount field takes focus.
  const [editAmount, setEditAmount] = React.useState(false);
  const bill = line.bill;
  // A line without a bill still shows an (empty) invoice: the first item or seller detail starts one.
  const shownBill = React.useMemo<Bill>(
    () => bill ?? { ...newManualBill({ invoiceNumber: line.invoiceNo.trim() || null, invoiceDate: line.expenseDate || null, sellerName: line.merchant.trim() || null }), items: [] },
    [bill, line.invoiceNo, line.expenseDate, line.merchant]
  );
  const hasItems = Boolean(bill && bill.items.length > 0);
  const grand = bill?.totals.grand ?? null;
  /** The amount is the bill's grand total while the line has items and the user has not typed another. */
  const followsItems = !distance && hasItems && line.amountFromBill;

  /** A corrected bill keeps the line's bill no., GSTIN and merchant in step, and the amount while it follows the bill total. */
  const setBill = (raw: Bill) => {
    let input = raw;
    const creating = !bill;
    const typedAmount = Number(line.amount) || 0;
    // The amount already typed becomes the first item's price, so the line keeps its total.
    if (creating && typedAmount > 0 && input.items.length === 1 && isEmptyItem(input.items[0])) {
      input = { ...input, items: [{ ...emptyItem(), rate: typedAmount, taxableValue: typedAmount, amount: typedAmount }] };
    }
    const next = syncManualTotals(input);
    const patch: Partial<LineInput> = { invoiceNo: next.invoiceNumber ?? '', sellerGstin: next.seller.gstin };
    if ((next.seller.name ?? '') !== (shownBill.seller.name ?? '')) patch.merchant = (next.seller.name ?? '').slice(0, 120);
    // A hand-entered bill with no item, charge or seller detail is dropped: the line goes back to a plain amount.
    const typedHeader = hasBillHeader({ ...next, invoiceNumber: null, invoiceDate: null, seller: { ...next.seller, name: null } });
    setBillTouched(true);
    onClearError(lineKey(index, 'bill'));
    onClearError(lineKey(index, 'invoice_no'));
    if (next.source === 'manual' && !next.items.length && !next.charges.length && !typedHeader) {
      onChange({ ...patch, bill: null, amountFromBill: false });
      return;
    }
    patch.bill = next;
    const follows = creating ? next.items.length > 0 : line.amountFromBill;
    if (creating) patch.amountFromBill = follows;
    if (!distance && follows && next.items.length) {
      const total = next.totals.grand;
      patch.amount = total !== null && total > 0 ? String(total) : '';
      onClearError(lineKey(index, 'amount'));
    }
    onChange(patch);
  };
  const applyBillTotal = () => {
    setEditAmount(false);
    set({ amount: grand !== null && grand > 0 ? String(grand) : '', amountFromBill: true }, 'amount');
  };
  const setMerchant = (v: string) => {
    const syncSeller = bill && (bill.seller.name ?? '') === line.merchant;
    set({ merchant: v, ...(syncSeller ? { bill: { ...bill, seller: { ...bill.seller, name: v.trim() || null } } } : {}) }, 'merchant');
  };

  const catError = err('category_id');
  const scan = line.scan;
  // A field the reader could not fill stays highlighted until the employee fills it; so does a scanned line without a category.
  const missing = (f: 'category_id' | 'expense_date' | 'amount') => {
    if (f === 'category_id') return Boolean(scan) && !line.categoryId;
    if (!scan?.missing.includes(f)) return false;
    if (f === 'expense_date') return !line.expenseDate;
    return distance ? !line.quantity : !line.amount;
  };
  // Bill-check notes are shown with the invoice, not repeated here.
  const lineFlags = preview ? withoutBillNotes(preview.flags) : [];

  return (
    <div className="tt-fade-in space-y-4">
      {(line.aiScanned || scan?.status === 'unread') && (
        <div className="space-y-1.5">
          {line.aiScanned && <AiMarker />}
          {scan?.status === 'unread' && scan.message && (
            <p className="flex items-start gap-1.5 text-xs text-fg">
              <FileWarning className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{scan.message} The bill is attached; fill the rest by hand.</span>
            </p>
          )}
        </div>
      )}

      {children}

      <div>
        <FieldLabel label="Category" required />
        <Combobox
          ariaLabel="Category"
          options={options}
          value={line.categoryId}
          onChange={(v) => set({ categoryId: typeof v === 'number' ? v : v === null ? null : Number(v) }, 'category_id')}
          placeholder="Choose a category"
          searchPlaceholder="Search categories…"
          emptyLabel="No category matches"
          clearable={false}
          invalid={Boolean(catError)}
          attention={missing('category_id')}
        />
        <FieldMessage error={catError} hint={missing('category_id') ? 'Choose the category for this bill.' : cat?.description || undefined} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="Date"
          required
          type="date"
          max={today}
          value={line.expenseDate}
          onChange={(v) => set({ expenseDate: v }, 'expense_date')}
          error={err('expense_date')}
          attention={missing('expense_date')}
          hint={missing('expense_date') ? NOT_ON_RECEIPT : undefined}
        />
        {distance ? (
          <TextField
            label="Distance"
            required
            inputMode="decimal"
            suffix={<span className="shrink-0 text-xs font-semibold text-fg-muted">km</span>}
            value={line.quantity}
            onChange={(v) => set({ quantity: parseDecimal(v) }, 'quantity')}
            placeholder="0"
            error={err('quantity') || err('amount')}
            attention={missing('amount')}
            hint={missing('amount') ? NOT_ON_RECEIPT : rate ? `${money(rate)} per km × ${km || 0} km = ${money(amount)}` : 'The rate per km is set in your policy'}
          />
        ) : followsItems ? (
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
            <div className={cx(shellClass(Boolean(err('amount'))), 'bg-bg-subtle')}>
              <span className="shrink-0 text-xs font-semibold text-fg-muted">₹</span>
              <output aria-label="Amount" className="min-w-0 flex-1 truncate text-sm font-semibold tabular-nums text-fg">
                {grand !== null && grand > 0 ? grand.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </output>
            </div>
            <FieldMessage error={err('amount')} hint="The grand total of the bill below" />
          </div>
        ) : (
          <TextField
            label="Amount"
            required
            inputMode="decimal"
            prefix="₹"
            value={line.amount}
            autoFocus={editAmount}
            onChange={(v) => set({ amount: parseDecimal(v), amountFromBill: false }, 'amount')}
            placeholder="0"
            error={err('amount')}
            attention={missing('amount')}
            aside={
              hasItems && grand !== null && grand > 0 && !amountMatchesBill(line.amount, bill) ? (
                <button type="button" onClick={applyBillTotal} className="text-[11px] font-semibold text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline">
                  Use bill total
                </button>
              ) : undefined
            }
            hint={
              missing('amount')
                ? NOT_ON_RECEIPT
                : hasItems && grand !== null && grand > 0
                  ? amountMatchesBill(line.amount, bill)
                    ? 'The bill total'
                    : `Not the bill total (${money(grand)}). The approver sees the difference.`
                  : undefined
            }
          />
        )}
        <div className="sm:col-span-2">
          <TextField label="Merchant" value={line.merchant} onChange={setMerchant} placeholder="Shop, vendor or service" maxLength={120} error={err('merchant')} />
        </div>
        <div className="sm:col-span-2">
          <TextField label="Description" value={line.description} onChange={(v) => set({ description: v }, 'description')} placeholder={distance ? 'From – to' : 'What it was for'} maxLength={300} error={err('description')} />
        </div>
      </div>

      {!distance && (
        <ReceiptViewer
          bills={receipts?.bills ?? []}
          proofs={receipts?.proofs ?? []}
          title={[cat?.name, line.merchant.trim()].filter(Boolean).join(' · ') || 'Bill'}
          subtitle={[line.expenseDate ? dateText(line.expenseDate) : null, line.invoiceNo.trim() ? `Bill ${line.invoiceNo.trim()}` : null, amount ? money(amount) : null].filter(Boolean).join(' · ')}
          bill={bill ? (preview?.bill ? withServerCheck(bill, preview.bill) : bill) : null}
          checked={Boolean(preview?.bill)}
          pending={Boolean(bill) && previewing}
          fromAi={line.aiScanned}
          flags={lineFlags}
          facts={[
            { label: 'Amount', value: amount ? money(amount) : '—' },
            { label: 'Date', value: line.expenseDate ? dateText(line.expenseDate) : '—' },
            { label: 'Merchant', value: line.merchant.trim() || '—' },
            { label: 'Bill no.', value: line.invoiceNo.trim() || '—' },
          ]}
        >
          <BillItemsEditor
            bill={shownBill}
            fromAi={line.aiScanned}
            onChange={setBill}
            invoiceError={err('invoice_no') || err('bill')}
            check={{ bill: bill ? preview?.bill ?? (billTouched ? null : bill) : null, pending: Boolean(bill) && previewing }}
          />
        </ReceiptViewer>
      )}

      <ReceiptPicker
        label="Bill copies"
        value={line.attachments}
        onChange={(attachments) => set({ attachments }, 'attachments')}
        max={MAX_LINE_FILES}
        required={receipt.required}
        error={err('attachments')}
        hint={receipt.hint}
        scope={uploadScope}
        employeeId={employeeId}
        onBusyChange={onBusyChange}
        onUploaded={onLocalFile}
        addLabel="Attach the bill"
        compact
      />

      {lineFlags.length > 0 && (
        <div className="rounded-lg bg-bg-subtle px-3 py-2">
          <FlagList flags={lineFlags} compact />
        </div>
      )}
    </div>
  );
}
