/** Wire shapes shared by the bill-carrying features (reimbursement claims and petty cash). */

export type FlagSeverityDto = 'error' | 'warning' | 'info';
/**
 * Codes: per_claim, per_month, per_year, wallet_negative, no_rate, duplicate_invoice, and from the bill
 * check bill_mismatch, gstin_invalid, tax_type, items_deduplicated, amount_differs, value_corrected,
 * row_mismatch, tax_mismatch.
 */
export interface FlagDto {
  code: string;
  severity: FlagSeverityDto;
  message: string;
  over?: number;
}

export interface LineAttachmentDto {
  index: number;
  name: string;
  size: number | null;
  type: string | null;
  key?: string;
}

export type PaymentModeDto = 'cash' | 'upi' | 'card' | 'net_banking' | 'cheque' | 'other';

/** Raw read of the receipt (before the bill check). Kept on the line and sent back unchanged; the UI shows `bill`. */
export interface ExtractedBillDto {
  seller?: { name?: string | null; address?: string | null; gstin?: string | null; contact?: string | null } | null;
  buyer?: { name?: string | null; gstin?: string | null } | null;
  currency?: string | null;
  subtotal?: number | null;
  tax_total?: number | null;
  charges_total?: number | null;
  grand_total?: number | null;
  items?: Array<{ name?: string | null; qty?: number | null; rate?: number | null; tax_percent?: number | null; total?: number | null }> | null;
  taxes?: Array<{ label?: string | null; percent?: number | null; amount?: number | null }> | null;
}

export type BillTaxModeDto = 'item' | 'bill' | 'both' | 'inclusive' | 'none';

export interface BillSellerDto {
  name: string | null;
  address: string | null;
  state: string | null;
  state_code?: string | null;
  pincode?: string | null;
  gstin: string | null;
  /** Claim detail. */
  gstin_valid?: boolean | null;
  /** Scan. */
  gstin_check?: { gstin?: string; valid: boolean; state_code?: string | null; state?: string | null; pan?: string | null; problem?: string | null } | null;
  pan?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface BillBuyerDto {
  name: string | null;
  address: string | null;
  state: string | null;
  gstin: string | null;
}

export interface BillItemDto {
  name: string;
  hsn: string | null;
  qty: number | null;
  unit: string | null;
  rate: number | null;
  discount: number | null;
  taxable_value: number | null;
  tax_rate: number | null;
  cgst: number | null;
  sgst: number | null;
  igst: number | null;
  cess: number | null;
  amount: number | null;
  /** Sent only: the row's total tax when the user typed it (the server splits it into CGST/SGST or IGST). */
  tax_amount?: number | null;
}

export interface BillTotalsDto {
  taxable: number | null;
  discount: number | null;
  cgst: number | null;
  sgst: number | null;
  igst: number | null;
  cess: number | null;
  other_tax: number | null;
  tax: number | null;
  charges: number | null;
  round_off: number | null;
  grand: number | null;
}

export interface BillNoteDto {
  code: string;
  message: string;
}

/** Full bill data (`expense_bills` + items). The server recomputes every total; client totals are never trusted. */
export interface BillDto {
  invoice_number: string | null;
  invoice_date: string | null;
  place_of_supply: string | null;
  payment_mode: string | null;
  currency: string | null;
  seller: BillSellerDto;
  buyer: BillBuyerDto;
  tax_mode: BillTaxModeDto;
  items: BillItemDto[];
  charges: Array<{ label: string; amount: number | null }>;
  totals: BillTotalsDto;
  reconciled: boolean;
  difference: number | null;
  notes: BillNoteDto[];
  source: 'ai' | 'manual';
  model: string | null;
}

export interface PagedDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ExportFormatDto = 'pdf' | 'xlsx';
export interface UploadedFileDto {
  key: string;
  name: string;
  size: number;
  type: string;
}

