import type { BillTaxModeDto, FlagSeverityDto, PaymentModeDto, UploadedFileDto } from './bill.dto';

export type FlagSeverity = FlagSeverityDto;
export type UploadedFile = UploadedFileDto;
export type PaymentMode = PaymentModeDto;

export interface Flag {
  code: string;
  severity: FlagSeverity;
  message: string;
  over: number | null;
}

export interface LineAttachment {
  index: number;
  name: string;
  size: number | null;
  type: string | null;
  key: string | null;
}

export type BillTaxMode = BillTaxModeDto;

export interface BillSeller {
  name: string | null;
  address: string | null;
  state: string | null;
  stateCode: string | null;
  pincode: string | null;
  gstin: string | null;
  /** Null when there is no GSTIN or it was not checked. */
  gstinValid: boolean | null;
  /** Why the GSTIN is not valid: `format`, `state` or `checksum` (when known). */
  gstinProblem: string | null;
  pan: string | null;
  phone: string | null;
  email: string | null;
}

export interface BillBuyer {
  name: string | null;
  address: string | null;
  state: string | null;
  gstin: string | null;
}

export interface BillItem {
  name: string;
  hsn: string | null;
  qty: number | null;
  unit: string | null;
  rate: number | null;
  discount: number | null;
  taxableValue: number | null;
  taxRate: number | null;
  cgst: number | null;
  sgst: number | null;
  igst: number | null;
  cess: number | null;
  amount: number | null;
  /**
   * The row's total tax as the user typed it (sent as `tax_amount`). Null when it follows from the GST %.
   * A row the user edited carries no CGST/SGST/IGST split: the server makes it.
   */
  taxAmount: number | null;
}

export interface BillCharge {
  label: string;
  amount: number | null;
}

export interface BillTotals {
  taxable: number | null;
  discount: number | null;
  cgst: number | null;
  sgst: number | null;
  igst: number | null;
  cess: number | null;
  otherTax: number | null;
  tax: number | null;
  charges: number | null;
  roundOff: number | null;
  grand: number | null;
}

export interface BillNote {
  code: string;
  message: string;
}

/** A bill as data: parties, items, charges and totals. The server is the authority on every total. */
export interface Bill {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  placeOfSupply: string | null;
  paymentMode: string | null;
  currency: string | null;
  seller: BillSeller;
  buyer: BillBuyer;
  taxMode: BillTaxMode;
  items: BillItem[];
  charges: BillCharge[];
  totals: BillTotals;
  reconciled: boolean;
  /** Printed grand total minus what the bill adds up to (null when there is no printed total). */
  difference: number | null;
  notes: BillNote[];
  source: 'ai' | 'manual';
  model: string | null;
}

