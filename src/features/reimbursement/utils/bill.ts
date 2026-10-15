import type { Bill, BillItem, BillTaxMode, BillTotals, Flag } from '../types/reimbursement.model';

/**
 * Bill helpers for the web. Only plain row arithmetic is done here, as feedback while typing
 * (taxable = qty × price − discount, tax from GST %, row amount, row sums until the server answers). Totals, the tax reading, whether
 * the bill adds up, notes and GSTIN validity always come from the server (preview or claim detail).
 */

export const r2 = (n: number) => Math.round(n * 100) / 100;
const pos = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? 0 : Math.abs(v));

export const TAX_KEYS = ['cgst', 'sgst', 'igst', 'cess'] as const;
export type TaxKey = (typeof TAX_KEYS)[number];

/** Plain words for the server's `tax_mode`. */
export const TAX_MODE_TEXT: Record<BillTaxMode, string> = {
  item: 'Tax shown per item; the totals repeat it, counted once',
  bill: 'Tax added on the bill total',
  both: 'Tax shown per item, with more tax added on the bill total',
  inclusive: 'Prices include tax; the tax lines only show the break-up',
  none: 'No tax on this bill',
};

/** Plain words for the server's GSTIN `problem`. */
export const GSTIN_PROBLEM: Record<string, string> = {
  format: 'not in GSTIN format',
  state: 'unknown state code',
  checksum: 'check digit does not match',
};

/** Bill-check codes: shown as notes in the bill panel, so they are left out of the line's flag list. */
export const BILL_NOTE_CODES = new Set(['bill_mismatch', 'gstin_invalid', 'tax_type', 'items_deduplicated', 'no_items', 'value_corrected', 'row_mismatch', 'tax_mismatch']);
/** Notes shown as warnings (the rest are information). */
export const BILL_WARNING_NOTES = new Set(['bill_mismatch', 'gstin_invalid', 'row_mismatch', 'tax_mismatch']);

export const withoutBillNotes = (flags: Flag[]) => flags.filter((f) => !BILL_NOTE_CODES.has(f.code));

// ── Item rows ───────────────────────────────────────────────────────────────

/**
 * The cells typed in an item row. `tax` is the row's tax in rupees. The client never chooses
 * CGST + SGST vs IGST: a typed row carries a GST % (and the row tax when typed) and the server
 * splits it (IGST across states, else two halves). The split shown in totals is the server's.
 */
export type RowField = 'qty' | 'rate' | 'discount' | 'taxRate' | 'tax';

/** The row still carries the CGST/SGST/IGST split it was read with (a scanned row nobody edited). */
export const hasSplit = (i: BillItem) => [i.cgst, i.sgst, i.igst, i.cess].some((v) => pos(v) > 0);

/** Taxable value of a row: qty (1 when empty) × price − discount. */
const taxableOf = (i: BillItem) => (i.rate === null ? null : r2((i.qty ?? 1) * i.rate - pos(i.discount)));

/** The row's base for its GST %: the taxable value, else qty × price − discount. */
const baseOf = (i: BillItem) => i.taxableValue ?? taxableOf(i);

/**
 * The row's tax in rupees: its printed split, else the typed row tax, else taxable × GST %
 * (the part inside the price on a bill whose prices include tax).
 */
export function rowTax(i: BillItem, inclusive = false): number {
  if (hasSplit(i)) return r2(pos(i.cgst) + pos(i.sgst) + pos(i.igst) + pos(i.cess));
  if (i.taxAmount !== null) return r2(pos(i.taxAmount));
  const base = baseOf(i);
  if (i.taxRate === null || base === null) return 0;
  return r2(inclusive ? (base * i.taxRate) / (100 + i.taxRate) : (base * i.taxRate) / 100);
}

/**
 * Sets one cell of an item row and fills what follows from it, as typing feedback only:
 * taxable = qty × price − discount, tax = taxable × GST %, amount = taxable + tax (on a bill whose
 * prices include tax the amount is the taxable value). An edited row drops its printed split.
 */
export function editRow(item: BillItem, field: RowField, value: number | null, opts: { inclusive?: boolean } = {}): BillItem {
  const inclusive = Boolean(opts.inclusive);
  let next: BillItem = { ...item };
  // Keep the row's tax when it only had a printed split: it becomes a GST % the server splits again.
  if (hasSplit(item)) {
    const base = baseOf(item);
    const tax = rowTax(item);
    if (next.taxRate === null && base) next.taxRate = r2((tax / (inclusive ? base - tax : base)) * 100);
    next = { ...next, cgst: null, sgst: null, igst: null, cess: null, taxAmount: next.taxRate === null ? tax : null };
  }
  if (field === 'tax') {
    const base = baseOf(next);
    next.taxAmount = value;
    if (value !== null && base) {
      const rate = r2((value / (inclusive ? base - value : base)) * 100);
      if (Number.isFinite(rate)) next.taxRate = rate;
    }
  } else {
    next = { ...next, [field]: value };
    if (field === 'taxRate') next.taxAmount = null;
    if (field === 'qty' || field === 'rate' || field === 'discount') {
      const taxable = taxableOf(next);
      if (taxable !== null || next.rate === null) next.taxableValue = taxable;
      // A typed row tax follows a new base only through its GST %.
      if (next.taxRate !== null) next.taxAmount = null;
    }
  }
  const base = baseOf(next);
  if (base !== null) next.amount = inclusive ? base : r2(base + rowTax(next, inclusive));
  return next;
}

/** CGST / SGST / IGST the bill already uses (for carrying an edited row's tax into a printed totals block). */
function billUsesIgst(bill: Bill): boolean {
  const sum = (k: TaxKey) => bill.items.reduce((s, i) => s + pos(i[k]), 0) + pos(bill.totals[k]);
  return sum('igst') > 0 && sum('cgst') + sum('sgst') === 0;
}

/** A row's tax per key: its split, or an estimate in the bill's own style (the server splits it on the check). */
function rowTaxBy(i: BillItem, igst: boolean, inclusive: boolean): Record<TaxKey, number> {
  if (hasSplit(i)) return { cgst: pos(i.cgst), sgst: pos(i.sgst), igst: pos(i.igst), cess: pos(i.cess) };
  const t = rowTax(i, inclusive);
  if (igst) return { cgst: 0, sgst: 0, igst: t, cess: 0 };
  const half = r2(t / 2);
  return { cgst: half, sgst: r2(t - half), igst: 0, cess: 0 };
}

/**
 * The bill's totals from its rows, as typing feedback while the server check runs (and the totals
 * sent for a bill entered by hand). Tax printed only on the bill total (`bill` mode) is added once.
 * `tax` is the whole GST; the CGST/SGST/IGST lines shown come from the server's check.
 */
export function rowTotals(bill: Bill): BillTotals {
  const inclusive = bill.taxMode === 'inclusive';
  const items = bill.items.filter((i) => !isEmptyItem(i));
  const sum = (f: (i: BillItem) => number) => r2(items.reduce((s, i) => s + f(i), 0));
  const t = bill.totals;
  const onBill = bill.taxMode === 'bill';
  const igst = billUsesIgst(bill);
  const tax = (k: TaxKey) => r2(sum((i) => rowTaxBy(i, igst, inclusive)[k]) + (onBill ? pos(t[k]) : 0));
  const otherTax = onBill ? pos(t.otherTax) : 0;
  const itemsTax = sum((i) => rowTax(i, inclusive));
  const itemsAmount = sum((i) => (i.amount !== null ? i.amount : pos(baseOf(i)) + (inclusive ? 0 : rowTax(i))));
  const charges = r2(bill.charges.reduce((s, c) => s + (c.amount ?? 0), 0));
  const discount = pos(t.discount);
  const roundOff = t.roundOff ?? 0;
  const billTax = onBill ? r2(pos(t.cgst) + pos(t.sgst) + pos(t.igst) + pos(t.cess) + otherTax) : 0;
  return {
    taxable: sum((i) => {
      const base = baseOf(i);
      if (base !== null) return inclusive ? base - rowTax(i, true) : base;
      return i.amount !== null ? i.amount - rowTax(i) : 0;
    }),
    discount,
    cgst: tax('cgst'),
    sgst: tax('sgst'),
    igst: tax('igst'),
    cess: tax('cess'),
    otherTax,
    tax: r2(itemsTax + billTax),
    charges,
    roundOff,
    grand: r2(itemsAmount + billTax + charges - discount + roundOff),
  };
}

/** A bill entered by hand carries its own row totals (tax per item), so it always adds up. */
export function syncManualTotals(bill: Bill): Bill {
  if (bill.source !== 'manual') return bill;
  const totals = rowTotals({ ...bill, taxMode: 'item' });
  const filled = bill.items.some((i) => !isEmptyItem(i));
  return { ...bill, taxMode: (totals.tax ?? 0) > 0 ? 'item' : 'none', totals: { ...totals, grand: filled || totals.charges ? totals.grand : null } };
}

/** Anything typed in the seller / buyer / bill facts. */
export function hasBillHeader(bill: Bill): boolean {
  const s = bill.seller;
  const b = bill.buyer;
  return [bill.invoiceNumber, bill.invoiceDate, bill.placeOfSupply, bill.paymentMode, s.name, s.address, s.state, s.pincode, s.gstin, s.pan, s.phone, s.email, b.name, b.address, b.state, b.gstin].some(Boolean);
}

/**
 * New item rows for a bill. When the bill's printed totals block repeats the row tax (`item` /
 * `both`), the change in row tax is carried into it so the totals sent back are not stale; the
 * server re-reads the bill anyway.
 */
export function withItems(bill: Bill, items: BillItem[]): Bill {
  if (bill.source === 'manual' || (bill.taxMode !== 'item' && bill.taxMode !== 'both')) return { ...bill, items };
  const igst = billUsesIgst(bill);
  const totals = { ...bill.totals };
  for (const k of TAX_KEYS) {
    const before = bill.items.reduce((s, i) => s + rowTaxBy(i, igst, false)[k], 0);
    const after = items.reduce((s, i) => s + rowTaxBy(i, igst, false)[k], 0);
    totals[k] = r2(Math.max(0, pos(totals[k]) + after - before));
  }
  return { ...bill, items, totals };
}

export function emptyItem(): BillItem {
  return { name: '', hsn: null, qty: null, unit: null, rate: null, discount: null, taxableValue: null, taxRate: null, cgst: null, sgst: null, igst: null, cess: null, amount: null, taxAmount: null };
}

/** A row with nothing typed in it (left out when the bill is sent). */
export function isEmptyItem(i: BillItem) {
  return !i.name.trim() && !i.hsn && !i.unit && [i.qty, i.rate, i.discount, i.taxableValue, i.taxRate, i.cgst, i.sgst, i.igst, i.cess, i.amount, i.taxAmount].every((v) => v === null);
}

/** A bill entered by hand for a line that has none, seeded from what the line already says. Unchecked until the preview returns. */
export function newManualBill(seed: { invoiceNumber?: string | null; invoiceDate?: string | null; sellerName?: string | null; grand?: number | null }): Bill {
  // The amount already typed becomes the first item's price, so the line keeps its total.
  const first = seed.grand && seed.grand > 0 ? { ...emptyItem(), rate: seed.grand, taxableValue: seed.grand, amount: seed.grand } : emptyItem();
  return {
    invoiceNumber: seed.invoiceNumber || null,
    invoiceDate: seed.invoiceDate || null,
    placeOfSupply: null,
    paymentMode: null,
    currency: 'INR',
    seller: { name: seed.sellerName || null, address: null, state: null, stateCode: null, pincode: null, gstin: null, gstinValid: null, gstinProblem: null, pan: null, phone: null, email: null },
    buyer: { name: null, address: null, state: null, gstin: null },
    taxMode: 'none',
    items: [first],
    charges: [],
    totals: { taxable: seed.grand ?? null, discount: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, otherTax: 0, tax: 0, charges: 0, roundOff: 0, grand: seed.grand ?? null },
    reconciled: false,
    difference: null,
    notes: [],
    source: 'manual',
    model: null,
  };
}

/**
 * What the panel shows: the user's bill (parties, items, charges as typed) with the server's
 * check of it (totals, tax reading, reconciled, difference, notes, GSTIN validity).
 */
export function withServerCheck(input: Bill, checked: Bill): Bill {
  // GSTIN validity only holds for the GSTIN that was checked.
  const key = (g: string | null) => (g || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const sameGstin = key(input.seller.gstin) === key(checked.seller.gstin);
  return {
    ...input,
    taxMode: checked.taxMode,
    totals: checked.totals,
    reconciled: checked.reconciled,
    difference: checked.difference,
    notes: checked.notes,
    seller: sameGstin ? { ...input.seller, gstinValid: checked.seller.gstinValid, gstinProblem: checked.seller.gstinProblem } : { ...input.seller, gstinValid: null, gstinProblem: null },
  };
}
