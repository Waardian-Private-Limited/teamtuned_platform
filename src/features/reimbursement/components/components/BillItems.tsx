'use client';

import React from 'react';
import { Loader2, PenLine, Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Bill, BillCharge, BillItem, BillTotals } from '../../types/reimbursement.model';
import { editRow, emptyItem, hasSplit, rowTax, rowTotals, withItems, withServerCheck, type RowField } from '../../utils/bill';
import { dateText } from '../../utils/format';
import { BillCheckStatus, TaxModeText } from './BillPanel';
import { BillHeaderEditor, MiniNumber, MiniText, RemoveButton } from './BillEditor';
import { GstinMarker, TotalLine, billMoney, has, taxRows } from './BillParts';

const numText = (n: number | null, max = 3) => (n === null ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: max }));
const pctText = (n: number | null) => (n === null ? '—' : `${numText(n, 2)}%`);
/** The row tax shown in the Tax ₹ column (blank when the row has no tax at all). */
const taxShown = (i: BillItem, inclusive: boolean) => (i.taxRate !== null || i.taxAmount !== null || hasSplit(i) ? rowTax(i, inclusive) : null);
/** The row amount: as read or computed, else taxable + tax. */
const amountOf = (i: BillItem, inclusive: boolean) => {
  if (i.amount !== null) return i.amount;
  const base = i.taxableValue ?? (i.rate !== null ? (i.qty ?? 1) * i.rate - Math.abs(i.discount ?? 0) : null);
  return base === null ? null : Math.round((base + (inclusive ? 0 : rowTax(i))) * 100) / 100;
};

const TH = 'border-b border-line px-2 py-2 text-[11px] font-semibold text-fg-muted';
const TD = 'border-b border-line px-2 py-1.5 align-middle';

// ── Header ──────────────────────────────────────────────────────────────────

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:justify-end">
      <dt className="text-[11px] text-fg-muted">{label}</dt>
      <dd className="min-w-0 break-words text-xs font-semibold text-fg sm:min-w-[6.5rem] sm:text-right">{value || '—'}</dd>
    </div>
  );
}

/** Invoice header: the seller on the left, bill no. / date / place of supply on the right. */
export function InvoiceHeader({ bill, action }: { bill: Bill; action?: React.ReactNode }) {
  const s = bill.seller;
  const b = bill.buyer;
  const place = [s.state, s.pincode].filter(Boolean).join(' ');
  const buyer = b.name || b.gstin;
  return (
    <div className="grid gap-3 border-b border-line p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6 sm:p-4">
      <div className="min-w-0 space-y-0.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Seller</p>
          {action && <span className="sm:hidden">{action}</span>}
        </div>
        <p className={cx('break-words text-sm font-bold', s.name ? 'text-fg' : 'text-fg-subtle')}>{s.name || 'Seller not given'}</p>
        {s.address && <p className="break-words text-fg-muted">{s.address}</p>}
        {place && <p className="text-fg-muted">{place}</p>}
        {s.phone && <p className="text-fg-muted">Phone {s.phone}</p>}
        {s.email && <p className="break-all text-fg-muted">{s.email}</p>}
        {s.gstin && (
          <p className="text-fg-muted">
            GSTIN <span className="font-semibold text-fg">{s.gstin}</span>
            <GstinMarker valid={s.gstinValid} problem={s.gstinProblem} />
          </p>
        )}
        {s.pan && <p className="text-fg-muted">PAN {s.pan}</p>}
        {buyer && (
          <p className="pt-1.5 text-fg-muted">
            Billed to <span className="font-semibold text-fg">{[b.name, b.gstin ? `GSTIN ${b.gstin}` : null].filter(Boolean).join(' · ')}</span>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        {action && <span className="hidden sm:block">{action}</span>}
        <dl className="space-y-1">
          <Fact label="Bill no." value={bill.invoiceNumber} />
          <Fact label="Bill date" value={bill.invoiceDate ? dateText(bill.invoiceDate) : null} />
          <Fact label="Place of supply" value={bill.placeOfSupply} />
        </dl>
      </div>
    </div>
  );
}

// ── Read-only ───────────────────────────────────────────────────────────────

function ItemsTable({ bill }: { bill: Bill }) {
  const c = bill.currency;
  const m = (n: number | null) => billMoney(n, c);
  const inclusive = bill.taxMode === 'inclusive';
  if (!bill.items.length) return <p className="px-3 py-4 text-center text-xs text-fg-muted sm:px-4">No item rows on this bill.</p>;
  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[40rem] border-collapse text-xs">
          <thead className="bg-bg-subtle">
            <tr>
              <th className={cx(TH, 'w-8 text-left')}>#</th>
              <th className={cx(TH, 'text-left')}>Item</th>
              <th className={cx(TH, 'text-left')}>HSN/SAC</th>
              <th className={cx(TH, 'text-right')}>Qty</th>
              <th className={cx(TH, 'text-right')}>Price</th>
              <th className={cx(TH, 'text-right')}>Disc</th>
              <th className={cx(TH, 'text-right')}>GST %</th>
              <th className={cx(TH, 'text-right')}>Tax ₹</th>
              <th className={cx(TH, 'text-right')}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((it, i) => (
              <tr key={i}>
                <td className={cx(TD, 'tabular-nums text-fg-muted')}>{i + 1}</td>
                <td className={cx(TD, 'break-words font-medium text-fg')}>{it.name || 'Item'}</td>
                <td className={cx(TD, 'text-fg-muted')}>{it.hsn || '—'}</td>
                <td className={cx(TD, 'text-right tabular-nums text-fg')}>{numText(it.qty)}{it.unit ? ` ${it.unit}` : ''}</td>
                <td className={cx(TD, 'text-right tabular-nums text-fg')}>{m(it.rate)}</td>
                <td className={cx(TD, 'text-right tabular-nums text-fg')}>{has(it.discount) ? m(Math.abs(it.discount as number)) : '—'}</td>
                <td className={cx(TD, 'text-right tabular-nums text-fg')}>{pctText(it.taxRate)}</td>
                <td className={cx(TD, 'text-right tabular-nums text-fg')}>{taxShown(it, inclusive) ? m(taxShown(it, inclusive)) : '—'}</td>
                <td className={cx(TD, 'text-right font-semibold tabular-nums text-fg')}>{m(amountOf(it, inclusive))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-line border-b border-line sm:hidden">
        {bill.items.map((it, i) => (
          <li key={i} className="px-3 py-2.5 text-xs">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 break-words font-semibold text-fg">
                <span className="mr-1 font-normal tabular-nums text-fg-muted">{i + 1}.</span>
                {it.name || 'Item'}
              </p>
              <p className="shrink-0 font-semibold tabular-nums text-fg">{m(amountOf(it, inclusive))}</p>
            </div>
            <p className="mt-0.5 tabular-nums text-fg-muted">
              {[
                `${numText(it.qty ?? 1)}${it.unit ? ` ${it.unit}` : ''} × ${m(it.rate)}`,
                has(it.discount) ? `Disc ${m(Math.abs(it.discount as number))}` : null,
                it.taxRate !== null ? `GST ${pctText(it.taxRate)}` : null,
                taxShown(it, inclusive) ? `Tax ${m(taxShown(it, inclusive))}` : null,
                it.hsn ? `HSN ${it.hsn}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Invoice totals: subtotal, discount, taxes (the server's split once checked), charges, round off, grand total. */
function TotalsView({ bill, totals, split }: { bill: Bill; totals: BillTotals; split: boolean }) {
  const c = bill.currency;
  return (
    <dl className="text-xs">
      <TotalLine label="Subtotal" value={billMoney(totals.taxable ?? 0, c)} />
      {has(totals.discount) && <TotalLine label="Discount" value={`−${billMoney(Math.abs(totals.discount as number), c)}`} />}
      {taxRows(totals, c, split).map((r) => (
        <TotalLine key={r.label} label={r.label} value={r.value} />
      ))}
      {bill.charges.length > 0
        ? bill.charges.map((ch, i) => <TotalLine key={`c${i}`} label={ch.label || 'Charges'} value={billMoney(ch.amount ?? 0, c)} />)
        : has(totals.charges) && <TotalLine label="Charges" value={billMoney(totals.charges, c)} />}
      {has(totals.roundOff) && <TotalLine label="Round off" value={`${(totals.roundOff as number) > 0 ? '+' : ''}${billMoney(totals.roundOff, c)}`} />}
      <TotalLine label="Grand total" value={billMoney(totals.grand, c)} strong />
    </dl>
  );
}

/**
 * A bill as an invoice, read-only: header (seller, bill no. and date), items table, totals and the
 * server's check. `checked`: the totals are the server's (claim detail, approvals, a previewed bill).
 */
export function BillItemsView({ bill, fromAi, checked = true, hideCheck }: { bill: Bill; fromAi?: boolean; checked?: boolean; /** The check status is shown elsewhere (the compare view puts it on top). */ hideCheck?: boolean }) {
  const totals = checked ? bill.totals : rowTotals(bill);
  return (
    <section aria-label="Bill" className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <InvoiceHeader bill={bill} />
        <ItemsTable bill={bill} />
        <div className="flex justify-end">
          <div className="w-full sm:max-w-xs sm:border-l sm:border-line">
            <TotalsView bill={bill} totals={totals} split={checked} />
          </div>
        </div>
      </div>
      {checked && (
        <div className="space-y-1.5">
          {bill.taxMode !== 'none' && <TaxModeText bill={bill} />}
          {!hideCheck && <BillCheckStatus bill={bill} />}
        </div>
      )}
      {(fromAi || bill.source === 'ai') && <p className="text-[11px] text-fg-muted">Read from the bill by AI. The bill itself is the record.</p>}
    </section>
  );
}

// ── Editor ──────────────────────────────────────────────────────────────────

interface BillItemsEditorProps {
  /** The bill as typed. */
  bill: Bill;
  /** The server's check: the checked bill from the live preview (null when none yet), and whether one is running. */
  check: { bill: Bill | null; pending: boolean };
  onChange: (next: Bill) => void;
  fromAi?: boolean;
  /** Error on the bill no. (e.g. too long). */
  invoiceError?: string;
}

function SmallButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-muted transition-colors hover:border-fg hover:text-fg"
    >
      {children}
    </button>
  );
}

/** One editable row: on wide screens table cells, on narrow ones a card. */
function rowCells(item: BillItem, n: number, inclusive: boolean, onChange: (next: BillItem) => void, onCell: (field: RowField, value: number | null) => void) {
  return {
    name: <MiniText label={`Item ${n}`} hideLabel value={item.name || null} onChange={(v) => onChange({ ...item, name: v ?? '' })} placeholder="What was bought" maxLength={200} />,
    hsn: <MiniText label={`HSN/SAC, item ${n}`} hideLabel value={item.hsn} onChange={(v) => onChange({ ...item, hsn: v })} maxLength={20} placeholder="Code" />,
    qty: <MiniNumber label={`Qty, item ${n}`} hideLabel value={item.qty} decimals={3} placeholder="1" onChange={(v) => onCell('qty', v)} />,
    rate: <MiniNumber label={`Price, item ${n}`} hideLabel value={item.rate} onChange={(v) => onCell('rate', v)} placeholder="0.00" />,
    discount: <MiniNumber label={`Discount, item ${n}`} hideLabel value={item.discount} onChange={(v) => onCell('discount', v)} placeholder="0" />,
    taxRate: <MiniNumber label={`GST %, item ${n}`} hideLabel value={item.taxRate} onChange={(v) => onCell('taxRate', v)} placeholder="0" />,
    tax: <MiniNumber label={`Tax ₹, item ${n}`} hideLabel value={taxShown(item, inclusive)} onChange={(v) => onCell('tax', v)} placeholder="0" />,
  };
}

function EditRow({ item, index, inclusive, currency, onChange, onCell, onRemove }: {
  item: BillItem;
  index: number;
  inclusive: boolean;
  currency: string | null;
  onChange: (next: BillItem) => void;
  onCell: (field: RowField, value: number | null) => void;
  onRemove: () => void;
}) {
  const n = index + 1;
  const cells = rowCells(item, n, inclusive, onChange, onCell);
  return (
    <tr>
      <td className={cx(TD, 'tabular-nums text-fg-muted')}>{n}</td>
      <td className={TD}>{cells.name}</td>
      <td className={TD}>{cells.hsn}</td>
      <td className={TD}>{cells.qty}</td>
      <td className={TD}>{cells.rate}</td>
      <td className={TD}>{cells.discount}</td>
      <td className={TD}>{cells.taxRate}</td>
      <td className={TD}>{cells.tax}</td>
      <td className={cx(TD, 'text-right font-semibold tabular-nums text-fg')}>{billMoney(amountOf(item, inclusive), currency)}</td>
      <td className={cx(TD, 'px-1')}>
        <RemoveButton label={`Remove item ${n}`} onClick={onRemove} />
      </td>
    </tr>
  );
}

function EditCard({ item, index, inclusive, currency, onChange, onCell, onRemove }: Parameters<typeof EditRow>[0]) {
  const n = index + 1;
  const cells = rowCells(item, n, inclusive, onChange, onCell);
  const label = 'mb-1 block text-[11px] font-semibold text-fg-muted';
  return (
    <li className="space-y-2 px-3 py-3">
      <div className="flex items-center gap-2">
        <span className="w-5 shrink-0 text-[11px] font-semibold tabular-nums text-fg-muted">{n}</span>
        <div className="min-w-0 flex-1">{cells.name}</div>
        <RemoveButton label={`Remove item ${n}`} onClick={onRemove} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['Qty', cells.qty],
            ['Price', cells.rate],
            ['Disc', cells.discount],
            ['GST %', cells.taxRate],
            ['Tax ₹', cells.tax],
            ['HSN/SAC', cells.hsn],
          ] as const
        ).map(([l, cell]) => (
          <div key={l} className="min-w-0">
            <span aria-hidden className={label}>
              {l}
            </span>
            {cell}
          </div>
        ))}
      </div>
      <p className="flex justify-between text-xs">
        <span className="text-fg-muted">Amount</span>
        <span className="font-semibold tabular-nums text-fg">{billMoney(amountOf(item, inclusive), currency)}</span>
      </p>
    </li>
  );
}

/**
 * The bill as an editable invoice: header (seller, bill no., date; "Edit seller" opens the fields
 * in place), an items table (# · item · HSN/SAC · qty · price · disc · GST % · tax ₹ · amount) and a
 * totals block. Rows carry only a GST %; the CGST / SGST / IGST split in the totals is the server's,
 * shown once the live check returns.
 */
export function BillItemsEditor({ bill, check, onChange, fromAi, invoiceError }: BillItemsEditorProps) {
  const [editSeller, setEditSeller] = React.useState(false);
  const [extras, setExtras] = React.useState({ discount: false, roundOff: false });
  const inclusive = bill.taxMode === 'inclusive';
  const ai = bill.source === 'ai';
  const c = bill.currency;

  React.useEffect(() => {
    if (invoiceError) setEditSeller(true);
  }, [invoiceError]);

  const setItems = (items: BillItem[]) => onChange(withItems(bill, items));
  const setItem = (i: number, item: BillItem) => setItems(bill.items.map((it, j) => (j === i ? item : it)));
  const setCell = (i: number, field: RowField, value: number | null) => setItem(i, editRow(bill.items[i], field, value, { inclusive }));
  const removeItem = (i: number) => setItems(bill.items.filter((_, j) => j !== i));
  const setCharge = (i: number, ch: BillCharge) => onChange({ ...bill, charges: bill.charges.map((x, j) => (j === i ? ch : x)) });
  const setTotals = (patch: Partial<BillTotals>) => onChange({ ...bill, totals: { ...bill.totals, ...patch } });

  const server = check.bill && !check.pending ? withServerCheck(bill, check.bill) : null;
  const totals = server ? server.totals : rowTotals(bill);
  const showBillDiscount = extras.discount || has(bill.totals.discount);
  const showRoundOff = extras.roundOff || has(bill.totals.roundOff);
  const rowProps = (it: BillItem, i: number) => ({
    key: i,
    item: it,
    index: i,
    inclusive,
    currency: c,
    onChange: (next: BillItem) => setItem(i, next),
    onCell: (f: RowField, v: number | null) => setCell(i, f, v),
    onRemove: () => removeItem(i),
  });

  const editButton = (
    <button
      type="button"
      onClick={() => setEditSeller((o) => !o)}
      aria-expanded={editSeller}
      className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-muted transition-colors hover:border-fg hover:text-fg"
    >
      <PenLine className="h-3 w-3" aria-hidden />
      {editSeller ? 'Done' : 'Edit seller'}
    </button>
  );

  return (
    <section aria-label="Bill" className="space-y-2">
      <div className={cx('overflow-hidden rounded-lg border bg-surface', invoiceError ? 'border-[var(--tt-danger)]' : 'border-line')}>
        <InvoiceHeader bill={server ?? bill} action={editButton} />
        {editSeller && (
          <div className="tt-fade-in border-b border-line bg-bg-subtle/40 p-3 sm:p-4">
            <BillHeaderEditor bill={bill} gstinValid={server ? server.seller.gstinValid : null} gstinProblem={server ? server.seller.gstinProblem : null} onChange={onChange} invoiceError={invoiceError} />
          </div>
        )}

        {bill.items.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[46rem] table-fixed border-collapse text-xs">
                <colgroup>
                  <col className="w-8" />
                  <col />
                  <col className="w-20" />
                  <col className="w-16" />
                  <col className="w-24" />
                  <col className="w-20" />
                  <col className="w-16" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-9" />
                </colgroup>
                <thead className="bg-bg-subtle">
                  <tr>
                    <th className={cx(TH, 'text-left')}>#</th>
                    <th className={cx(TH, 'text-left')}>Item</th>
                    <th className={cx(TH, 'text-left')}>HSN/SAC</th>
                    <th className={cx(TH, 'text-right')}>Qty</th>
                    <th className={cx(TH, 'text-right')}>Price</th>
                    <th className={cx(TH, 'text-right')}>Disc</th>
                    <th className={cx(TH, 'text-right')}>GST %</th>
                    <th className={cx(TH, 'text-right')}>Tax ₹</th>
                    <th className={cx(TH, 'text-right')}>Amount</th>
                    <th className={TH}>
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((it, i) => {
                    const { key, ...p } = rowProps(it, i);
                    return <EditRow key={key} {...p} />;
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-line border-b border-line sm:hidden">
              {bill.items.map((it, i) => {
                const { key, ...p } = rowProps(it, i);
                return <EditCard key={key} {...p} />;
              })}
            </ul>
          </>
        ) : (
          <p className="border-b border-line px-3 py-4 text-center text-xs text-fg-muted">No items yet. A simple expense like a cab fare needs only the amount.</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap gap-1.5 p-3">
            <SmallButton onClick={() => setItems([...bill.items, emptyItem()])}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add item
            </SmallButton>
            <SmallButton onClick={() => onChange({ ...bill, charges: [...bill.charges, { label: '', amount: null }] })}>
              <Plus className="h-3 w-3" aria-hidden />
              Charge
            </SmallButton>
            {!showBillDiscount && (
              <SmallButton onClick={() => setExtras((e) => ({ ...e, discount: true }))}>
                <Plus className="h-3 w-3" aria-hidden />
                Discount on bill
              </SmallButton>
            )}
            {!showRoundOff && (
              <SmallButton onClick={() => setExtras((e) => ({ ...e, roundOff: true }))}>
                <Plus className="h-3 w-3" aria-hidden />
                Round off
              </SmallButton>
            )}
          </div>

          <dl className={cx('w-full border-t border-line text-xs transition-opacity sm:max-w-sm sm:border-l sm:border-t-0', check.pending && 'opacity-70')} aria-live="polite">
            <TotalLine label="Subtotal" value={billMoney(totals.taxable ?? 0, c)} />
            {showBillDiscount && (
              <TotalLine label="Discount on bill">
                <MiniNumber label="Discount on bill" hideLabel value={bill.totals.discount || null} prefix="−₹" onChange={(v) => setTotals({ discount: v ?? 0 })} className="w-28" />
                <RemoveButton label="Remove discount on bill" onClick={() => { setExtras((e) => ({ ...e, discount: false })); setTotals({ discount: 0 }); }} />
              </TotalLine>
            )}
            {taxRows(totals, c, Boolean(server)).map((r) => (
              <TotalLine key={r.label} label={r.label} value={r.value} />
            ))}
            {bill.charges.map((ch, i) => (
              <div key={`c${i}`} className="flex items-center gap-1.5 px-3 py-1">
                <MiniText label={`Charge ${i + 1}`} hideLabel value={ch.label || null} onChange={(v) => setCharge(i, { ...ch, label: v ?? '' })} placeholder="Delivery, service…" maxLength={80} className="flex-1" />
                <MiniNumber label={`Charge ${i + 1} amount`} hideLabel value={ch.amount} prefix="₹" onChange={(v) => setCharge(i, { ...ch, amount: v })} className="w-28" />
                <RemoveButton label={`Remove charge ${i + 1}`} onClick={() => onChange({ ...bill, charges: bill.charges.filter((_, j) => j !== i) })} />
              </div>
            ))}
            {showRoundOff && (
              <TotalLine label="Round off">
                <MiniNumber label="Round off" hideLabel signed value={bill.totals.roundOff || null} prefix="₹" onChange={(v) => setTotals({ roundOff: v ?? 0 })} className="w-28" />
                <RemoveButton label="Remove round off" onClick={() => { setExtras((e) => ({ ...e, roundOff: false })); setTotals({ roundOff: 0 }); }} />
              </TotalLine>
            )}
            <TotalLine label="Grand total" strong>
              {check.pending && <Loader2 className="h-3 w-3 animate-spin text-fg-muted" aria-label="Checking" />}
              {billMoney(totals.grand, c)}
            </TotalLine>
            {ai && (
              <TotalLine label="Total printed on the bill">
                <MiniNumber label="Total printed on the bill" hideLabel value={bill.totals.grand} prefix="₹" onChange={(v) => setTotals({ grand: v })} className="w-28" />
              </TotalLine>
            )}
          </dl>
        </div>
      </div>

      {invoiceError && !editSeller && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{invoiceError}</p>}
      {(bill.items.length > 0 || bill.charges.length > 0) && (
        <div className="space-y-1.5">
          {server && server.taxMode !== 'none' && <TaxModeText bill={server} />}
          <BillCheckStatus bill={server ?? bill} checked={Boolean(server)} pending={check.pending} />
        </div>
      )}
      {(fromAi || ai) && <p className="text-[11px] text-fg-muted">Read from the bill by AI. Check it against the bill before submitting.</p>}
    </section>
  );
}
