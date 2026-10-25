/** Wire shapes of /api/v1/reimbursement (see teamtuned_backend/docs/REIMBURSEMENT_V2_API.md). */

import type {
  FlagDto,
  LineAttachmentDto,
  PaymentModeDto,
  ExtractedBillDto,
  BillNoteDto,
  BillDto,
  PagedDto,
  ExportFormatDto,
  UploadedFileDto,
} from '@/features/expense-bills/types/bill.dto';

export type {
  FlagSeverityDto,
  FlagDto,
  LineAttachmentDto,
  PaymentModeDto,
  ExtractedBillDto,
  BillTaxModeDto,
  BillSellerDto,
  BillBuyerDto,
  BillItemDto,
  BillTotalsDto,
  BillNoteDto,
  BillDto,
  PagedDto,
  ExportFormatDto,
  UploadedFileDto,
} from '@/features/expense-bills/types/bill.dto';


export type ChannelDto = 'claim' | 'wallet';
export type ClaimStatusDto = 'draft' | 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
export type PayoutModeDto = 'manual' | 'payroll';
export type CategoryKindDto = 'amount' | 'distance';
export type WalletStatusDto = 'active' | 'frozen' | 'closed';
export type FundRequestStatusDto = 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
export type LedgerTypeDto = 'opening' | 'top_up' | 'expense' | 'return' | 'adjustment';

export interface EmployeeRefDto {
  id: number;
  code: string | null;
  name: string | null;
  department: string | null;
}

export interface LineDto {
  id: number;
  seq: number;
  category: { id: number; name: string; code: string; kind: CategoryKindDto; icon: string | null };
  expense_date: string;
  description: string | null;
  merchant: string | null;
  quantity: number | null;
  rate: number | null;
  amount: number;
  approved_amount: number | null;
  attachments: LineAttachmentDto[];
  flags: FlagDto[];
  invoice_no?: string | null;
  seller_gstin?: string | null;
  ai_scanned?: boolean;
  extracted?: ExtractedBillDto | null;
  /** The bill as data (migration 070); null when the line has none. */
  bill?: BillDto | null;
  /** How the employee paid (migration 072). */
  payment_mode?: PaymentModeDto | null;
  /** UPI / transaction id. */
  payment_reference?: string | null;
  /** Proof of payment (screenshot, card slip). Open with `/…/lines/:lineId/payment-proofs/:index`. */
  payment_proofs?: LineAttachmentDto[];
}

/** Paper bill (policy v19, migration 073). Separate from the approval / payment status. */
export type PhysicalCopyStatusDto = 'not_required' | 'optional' | 'pending' | 'collected';

export interface PhysicalCopyDto {
  status: PhysicalCopyStatusDto;
  /** The claim cannot be paid (nor go to Payouts or payroll) until the paper bill is collected. */
  holds_payment: boolean;
  collected_at: string | null;
  /** Who collected it (a name; older shapes may send `{ id, name }`). */
  collected_by: string | { id?: number; name?: string | null } | null;
  note: string | null;
}

/** `POST /claims/physical-copy`. */
export interface PhysicalCopyBulkResultDto {
  updated: number;
  skipped: Array<{ id: number; reason: string }>;
}

export interface ClaimDto {
  id: number;
  number: string;
  title: string;
  purpose: string | null;
  channel: ChannelDto;
  status: ClaimStatusDto;
  payout_mode: PayoutModeDto | null;
  claimed_amount: number;
  approved_amount: number | null;
  employee: EmployeeRefDto;
  company: { id: number; name: string | null } | null;
  flags: FlagDto[];
  flag_count: number;
  line_count?: number;
  categories?: string[];
  created_at: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  decision_note: string | null;
  paid_on: string | null;
  paid_reference: string | null;
  has_proof: boolean;
  in_payroll: boolean;
  source: string | null;
  lines?: LineDto[];
  physical_copy?: PhysicalCopyDto | null;
}

export interface ClaimEventDto {
  id: number;
  action: string;
  by: string | null;
  at: string | null;
  data: Record<string, unknown> | null;
}

export interface ApprovalSummaryDto {
  request_id: number;
  status: string;
  steps: Array<{
    index: number;
    name: string;
    state: 'approved' | 'rejected' | 'current' | 'skipped' | 'waiting';
    approvers: Array<{ name: string | null; status: string; acted_at: string | null; note: string | null }>;
  }>;
}

export interface WalletDto {
  id: number;
  employee: EmployeeRefDto;
  status: WalletStatusDto;
  status_note: string | null;
  balance: number;
  held: number;
  available: number;
  opened_at: string | null;
  closed_at: string | null;
  /** Policy schema v18 (overview, /me/wallet, HR detail): whether expenses may take the balance below zero. */
  negative_allowed?: boolean;
  /** How far below zero; null = no limit. */
  negative_limit?: number | null;
  /** What the employee can spend now; null = no limit. */
  spendable?: number | null;
  /** How much the balance is below zero; 0 when not. */
  below_zero?: number;
}

export interface ClaimDetailDto extends ClaimDto {
  history: ClaimEventDto[];
  approval: ApprovalSummaryDto | null;
  wallet: WalletDto | null;
  can: Partial<Record<'edit' | 'cancel' | 'pay' | 'change_payout' | 'approve' | 'collect', boolean>>;
}

export interface LedgerEntryDto {
  id: number;
  type: LedgerTypeDto;
  amount: number;
  balance_before?: number;
  balance_after: number;
  /** Part of a credit that paid back a negative balance. */
  covers_negative?: number;
  /** Part of a debit that went below zero. */
  goes_negative?: number;
  date: string;
  ref: { type: 'claim' | 'fund_request' | 'legacy'; id: number; title: string | null } | null;
  reference: string | null;
  note: string | null;
  has_proof: boolean;
  by: string | null;
  at: string | null;
}

export interface FundRequestDto {
  id: number;
  employee: EmployeeRefDto;
  wallet_id: number;
  amount: number;
  approved_amount: number | null;
  reason: string | null;
  status: FundRequestStatusDto;
  decided_at: string | null;
  decision_note: string | null;
  paid_on: string | null;
  paid_reference: string | null;
  created_at: string | null;
  /** Quotation or supporting files (migration 071). Open with `/me/fund-requests/:id/files/:index` or `/fund-requests/:id/files/:index`. */
  attachments?: Array<{ index: number; name?: string | null; size?: number | null; type?: string | null }>;
}

export interface CategoryRuleDto {
  limits?: { perClaim?: number; perMonth?: number; perYear?: number; whenExceeded?: 'flag' | 'block' } | null;
  rate_per_km: number;
  receipt?: { required?: 'always' | 'above' | 'never'; above?: number } | null;
}

export interface CategoryDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
  kind: CategoryKindDto;
  icon: string | null;
  gl_code: string | null;
  status: 'active' | 'inactive';
  sort_order: number;
  sub_organization_id: number | null;
  /** Where the category can be used; missing on older servers (both). */
  applies_to?: string[];
  /** Petty cash: expenses of this category are goods that get received per item. */
  needs_inward?: boolean;
  rule?: CategoryRuleDto;
  used?: { month: number; year: number };
}

export interface CountAmountDto {
  count: number;
  amount: number;
}

export interface MyWalletDto extends WalletDto {
  recent: LedgerEntryDto[];
  open_fund_requests: FundRequestDto[];
}

export interface MyOverviewDto {
  features: { claims: boolean; wallet: boolean; ai?: boolean };
  enabled: boolean;
  today: string;
  policy: { submit_within_days: number; payout_mode: PayoutModeDto; needs_approval: boolean; fund_requests: boolean; receipt_scan?: boolean };
  channels: ChannelDto[];
  categories: CategoryDto[];
  wallet: MyWalletDto | null;
  counts: Record<'draft' | 'pending' | 'to_be_paid' | 'paid' | 'wallet_spent' | 'rejected', CountAmountDto>;
}

export interface ClaimListResponseDto extends PagedDto<ClaimDto> {
  amount?: number;
  /** Status counts plus `bills_to_collect` and `bills_collected`. */
  counts?: Partial<Record<string, number>>;
}


/** `POST /exports/expense-claims` and `/exports/my-expenses` (no employee, department or site filter). */
export interface ClaimsExportRequestDto {
  format: ExportFormatDto;
  /** Both formats: PDF appends receipts and proofs as pages; Excel embeds photos and adds a Files sheet. */
  include_files?: boolean;
  /** Up to 5 addresses; the finished file is mailed to them. */
  emails?: string[];
  /** Picked claims instead of filters. */
  ids?: number[];
  status?: string;
  channel?: string;
  payout_mode?: string;
  payment_mode?: string;
  category_id?: number;
  department_id?: number;
  site_id?: number;
  employee_id?: number;
  physical?: string;
  /** Submitted on. */
  from?: string;
  to?: string;
  /** Expense (line) date. */
  spent_from?: string;
  spent_to?: string;
  /** Bill (invoice) date. */
  bill_from?: string;
  bill_to?: string;
  search?: string;
  subOrgId?: number;
}

/** `POST /exports/expense-wallet-statement` and `/exports/my-expense-wallet`. */
export interface WalletStatementExportRequestDto {
  format: ExportFormatDto;
  include_files?: boolean;
  include_expenses?: boolean;
  emails?: string[];
  from?: string;
  to?: string;
  wallet_id?: number;
}

export interface ClaimLineRequestDto {
  category_id: number;
  expense_date: string;
  amount?: number;
  quantity?: number;
  description?: string;
  merchant?: string;
  attachments?: Array<{ key: string; name: string; size: number | null; type: string | null }>;
  invoice_no?: string;
  seller_gstin?: string;
  extracted?: ExtractedBillDto;
  ai_scanned?: boolean;
  bill?: BillDto;
  payment_mode?: PaymentModeDto | null;
  payment_reference?: string;
  payment_proofs?: Array<{ key: string; name: string; size: number | null; type: string | null }>;
}

/**
 * `POST /me/receipts/scan`, `POST /receipts/scan?employee_id=` (multipart `files`: the pages of one bill,
 * or one PDF) — always 200 once the files are stored.
 */
export interface ReceiptScanDto {
  /** Every page stored, in order (also in `line.attachments`). */
  attachments?: UploadedFileDto[];
  /** Older servers: the single stored file. */
  attachment?: UploadedFileDto;
  read: boolean;
  /** Why it could not be read (when `read` is false). */
  message?: string;
  title?: string | null;
  /** One-sentence business reason; fills the report's purpose when it is empty. */
  purpose?: string | null;
  line: {
    category_id?: number | null;
    expense_date?: string | null;
    amount?: number | null;
    quantity?: number | null;
    merchant?: string | null;
    description?: string | null;
    invoice_no?: string | null;
    seller_gstin?: string | null;
    attachments?: UploadedFileDto[];
    /** When the bill prints how it was paid. */
    payment_mode?: PaymentModeDto | null;
    ai_scanned?: boolean;
    extracted?: ExtractedBillDto | null;
    bill?: BillDto | null;
  };
  bill_check?: { reconciled: boolean; difference: number | null; notes: BillNoteDto[] } | null;
  missing?: string[];
}

export interface ClaimRequestDto {
  channel: ChannelDto;
  title: string;
  purpose?: string;
  submit?: boolean;
  lines: ClaimLineRequestDto[];
  employee_id?: number;
  payout_mode?: PayoutModeDto;
}

export interface WalletPositionDto {
  balance: number;
  held: number;
  available: number;
}

export interface ClaimPreviewDto {
  total: number;
  errors: Record<string, string> | null;
  flags: FlagDto[];
  /** `bill`: the server's check of the line's bill (totals, tax mode, reconciled, notes, GSTIN validity). */
  lines: Array<{ amount: number; rate: number | null; flags: FlagDto[]; bill?: BillDto | null }>;
  wallet: WalletPositionDto | null;
}

export interface MyWalletResponseDto extends PagedDto<LedgerEntryDto> {
  wallet: WalletDto | null;
  /** Whether the employee's policy lets them ask for funds. */
  fund_requests?: boolean;
}

export interface OverviewDto {
  month: string;
  features: { claims: boolean; wallet: boolean; ai?: boolean };
  kpis: Record<'pending' | 'to_pay' | 'in_payroll' | 'paid_this_month' | 'wallet_pending', CountAmountDto> & {
    /** Claims whose paper bill is still to be collected. */
    bills_to_collect?: Partial<CountAmountDto>;
  };
  trend: Array<{ month: string; claim: number; wallet: number }>;
  top_categories: Array<{ id: number; name: string; icon: string | null; amount: number; claims: number }>;
  wallets: {
    count: number;
    active: number;
    frozen: number;
    funds_out: number;
    owed_to_employees: number;
    negative: number;
    fund_requests_pending: number;
    fund_requests_to_pay: CountAmountDto;
  } | null;
}

export interface CategoryListResponseDto {
  items: CategoryDto[];
  icons: string[];
  starters: Array<{ code: string; name: string; kind: CategoryKindDto; icon: string | null; description?: string | null }>;
}

export interface CategoryRequestDto {
  name: string;
  code?: string;
  kind: CategoryKindDto;
  icon: string;
  description?: string | null;
  gl_code?: string | null;
  sort_order?: number;
  sub_organization_id?: number | null;
  applies_to?: Array<'claims' | 'petty_cash'>;
}

export interface WalletTotalsDto {
  wallets: number;
  active: number;
  frozen: number;
  funds_out: number;
  owed_to_employees: number;
  negative: number;
}

export interface WalletListResponseDto extends PagedDto<WalletDto> {
  totals: WalletTotalsDto;
}

export interface WalletDetailDto {
  wallet: WalletDto;
  ledger: PagedDto<LedgerEntryDto>;
  open_fund_requests: FundRequestDto[];
  can: Partial<Record<'fund' | 'freeze' | 'close' | 'reopen', boolean>>;
}

export interface OpenWalletsResultDto {
  opened: number;
  reopened: number;
  skipped: Array<{ employee_id: number; reason: string }>;
}

export interface PayRequestDto {
  reference: string;
  paid_on?: string;
  proof?: string;
}
