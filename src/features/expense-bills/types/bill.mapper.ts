import type { BillDto, FlagDto, LineAttachmentDto } from './bill.dto';
import type { Bill, Flag, LineAttachment, PaymentMode } from './bill.model';
import { hasSplit, isEmptyItem, rowTax } from '../utils/bill';

export function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const PAYMENT_MODE_VALUES: PaymentMode[] = ['cash', 'upi', 'card', 'net_banking', 'cheque', 'other'];
/** A known payment mode, or null. */
export function toPaymentMode(v: unknown): PaymentMode | null {
  return PAYMENT_MODE_VALUES.find((m) => m === v) ?? null;
}

export function toFiles(list: LineAttachmentDto[] | undefined | null): LineAttachment[] {
  return (Array.isArray(list) ? list : []).map((a, i) => ({ index: typeof a.index === 'number' ? a.index : i, name: a.name || 'document', size: numOrNull(a.size), type: a.type ?? null, key: a.key ?? null }));
}

export const sentFiles = (files: LineAttachment[]) => files.filter((a) => a.key).map((a) => ({ key: a.key as string, name: a.name, size: a.size, type: a.type }));

export function toFlag(dto: FlagDto): Flag {
  return { code: dto.code, severity: dto.severity || 'warning', message: dto.message || '', over: numOrNull(dto.over) };
}
export const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

export const textOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : String(v).trim() || null);
export const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** A bill from the API (scan or claim detail). Null when the line has none. */
export function toBillModel(dto: BillDto | null | undefined): Bill | null {
  if (!isObj(dto)) return null;
  const s = isObj(dto.seller) ? dto.seller : ({} as BillDto['seller']);
  const b = isObj(dto.buyer) ? dto.buyer : ({} as BillDto['buyer']);
  const t = isObj(dto.totals) ? dto.totals : ({} as BillDto['totals']);
  const check = isObj(s.gstin_check) ? s.gstin_check : null;
  const gstinValid = typeof s.gstin_valid === 'boolean' ? s.gstin_valid : check ? Boolean(check.valid) : null;
  const modes = ['item', 'bill', 'both', 'inclusive', 'none'] as const;
  return {
    invoiceNumber: textOrNull(dto.invoice_number),
    invoiceDate: dto.invoice_date ? String(dto.invoice_date).slice(0, 10) : null,
    placeOfSupply: textOrNull(dto.place_of_supply),
    paymentMode: textOrNull(dto.payment_mode),
    currency: textOrNull(dto.currency),
    seller: {
      name: textOrNull(s.name),
      address: textOrNull(s.address),
      state: textOrNull(s.state),
      stateCode: textOrNull(s.state_code),
      pincode: textOrNull(s.pincode),
      gstin: textOrNull(s.gstin),
      gstinValid: s.gstin ? gstinValid : null,
      gstinProblem: check && !check.valid ? textOrNull(check.problem) : null,
      pan: textOrNull(s.pan),
      phone: textOrNull(s.phone),
      email: textOrNull(s.email),
    },
    buyer: { name: textOrNull(b.name), address: textOrNull(b.address), state: textOrNull(b.state), gstin: textOrNull(b.gstin) },
    taxMode: modes.find((m) => m === dto.tax_mode) ?? 'none',
    items: (Array.isArray(dto.items) ? dto.items : []).filter(isObj).map((i) => ({
      name: textOrNull(i.name) || 'Item',
      hsn: textOrNull(i.hsn),
      qty: numOrNull(i.qty),
      unit: textOrNull(i.unit),
      rate: numOrNull(i.rate),
      discount: numOrNull(i.discount),
      taxableValue: numOrNull(i.taxable_value),
      taxRate: numOrNull(i.tax_rate),
      cgst: numOrNull(i.cgst),
      sgst: numOrNull(i.sgst),
      igst: numOrNull(i.igst),
      cess: numOrNull(i.cess),
      amount: numOrNull(i.amount),
      taxAmount: null,
    })),
    charges: (Array.isArray(dto.charges) ? dto.charges : []).filter(isObj).map((c) => ({ label: textOrNull(c.label) || 'Charge', amount: numOrNull(c.amount) })),
    totals: {
      taxable: numOrNull(t.taxable),
      discount: numOrNull(t.discount),
      cgst: numOrNull(t.cgst),
      sgst: numOrNull(t.sgst),
      igst: numOrNull(t.igst),
      cess: numOrNull(t.cess),
      otherTax: numOrNull(t.other_tax),
      tax: numOrNull(t.tax),
      charges: numOrNull(t.charges),
      roundOff: numOrNull(t.round_off),
      grand: numOrNull(t.grand),
    },
    reconciled: Boolean(dto.reconciled),
    difference: numOrNull(dto.difference),
    notes: (Array.isArray(dto.notes) ? dto.notes : []).filter(isObj).map((n) => ({ code: String(n.code || ''), message: String(n.message || '') })).filter((n) => n.message),
    source: dto.source === 'ai' ? 'ai' : 'manual',
    model: textOrNull(dto.model),
  };
}

/** The bill as sent back on preview/create/update (rows with nothing typed are left out). */
export function toBillDto(bill: Bill): BillDto {
  const s = bill.seller;
  const t = bill.totals;
  return {
    invoice_number: textOrNull(bill.invoiceNumber),
    invoice_date: bill.invoiceDate || null,
    place_of_supply: textOrNull(bill.placeOfSupply),
    payment_mode: textOrNull(bill.paymentMode),
    currency: bill.currency || 'INR',
    seller: {
      name: textOrNull(s.name),
      address: textOrNull(s.address),
      state: textOrNull(s.state),
      state_code: s.stateCode,
      pincode: textOrNull(s.pincode),
      gstin: textOrNull(s.gstin),
      pan: textOrNull(s.pan),
      phone: textOrNull(s.phone),
      email: textOrNull(s.email),
    },
    buyer: { name: textOrNull(bill.buyer.name), address: textOrNull(bill.buyer.address), state: textOrNull(bill.buyer.state), gstin: textOrNull(bill.buyer.gstin) },
    tax_mode: bill.taxMode,
    items: bill.items
      .filter((i) => !isEmptyItem(i))
      .map((i) => {
        // A row the user typed or edited (and every row of a typed bill) sends only its GST % and, when
        // typed, the row tax: the server splits it into CGST + SGST or IGST. A scanned row nobody
        // edited keeps its printed split.
        const split = bill.source === 'manual' || !hasSplit(i);
        const taxAmount = i.taxAmount ?? (hasSplit(i) && i.taxRate === null ? rowTax(i) : null);
        return {
          name: i.name.trim() || 'Item',
          hsn: textOrNull(i.hsn),
          qty: i.qty,
          unit: textOrNull(i.unit),
          rate: i.rate,
          discount: i.discount,
          taxable_value: i.taxableValue,
          tax_rate: i.taxRate,
          cgst: split ? null : i.cgst,
          sgst: split ? null : i.sgst,
          igst: split ? null : i.igst,
          cess: split ? null : i.cess,
          amount: i.amount,
          ...(split && taxAmount !== null ? { tax_amount: taxAmount } : {}),
        };
      }),
    charges: bill.charges.filter((c) => c.label.trim() || c.amount !== null).map((c) => ({ label: c.label.trim() || 'Charge', amount: c.amount })),
    totals: {
      taxable: t.taxable,
      discount: t.discount,
      cgst: t.cgst,
      sgst: t.sgst,
      igst: t.igst,
      cess: t.cess,
      other_tax: t.otherTax,
      tax: t.tax,
      charges: t.charges,
      round_off: t.roundOff,
      grand: t.grand,
    },
    reconciled: bill.reconciled,
    difference: bill.difference,
    notes: bill.notes,
    source: bill.source,
    model: bill.model,
  };
}

/** Whether `amount` (as typed) is the bill's grand total. */
export function amountMatchesBill(amount: string | number, bill: Bill | null): boolean {
  const grand = bill?.totals.grand;
  if (grand === null || grand === undefined || amount === '') return false;
  return Math.abs(Number(amount) - grand) < 0.005;
}
