/** Wire shapes of /api/v1/petty-cash (see teamtuned_backend/docs/PETTY_CASH_API.md). */
import type { BillDto, ExtractedBillDto, FlagDto, LineAttachmentDto, PagedDto, PaymentModeDto, UploadedFileDto, ExportFormatDto } from '@/features/expense-bills/types/bill.dto';

export type WalletStatusDto = 'active' | 'frozen' | 'closed';
export type ExpenseStatusDto = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PhysicalCopyStatusDto = 'not_required' | 'optional' | 'pending' | 'received';
export type FundRequestStatusDto = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'paid';
export type FundModeDto = 'amount' | 'replenish';
export type LedgerTypeDto = 'opening' | 'top_up' | 'expense' | 'return' | 'adjustment' | 'count_diff';
export type SpendModeDto = 'custodians' | 'site_members' | 'both';
export type PhysicalRuleDto = 'never' | 'optional' | 'always' | 'above';

export interface NamedRefDto {
  id: number;
  name: string;
}

export interface EmployeeRefDto {
  id: number;
  code: string | null;
  name: string | null;
}

export interface CustodianDto {
  employee_id: number;
  code: string | null;
  name: string | null;
  user_id: number | null;
  is_primary: boolean;
}

export interface WalletRulesDto {
  physical_copy: PhysicalRuleDto;
  physical_copy_above: number | null;
  receipt_required_above: number | null;
  max_backdate_days: number;
}

export interface WalletDto {
  id: number;
  code: string | null;
  name: string;
  status: WalletStatusDto;
  status_note: string | null;
  site: NamedRefDto | null;
  company: NamedRefDto | null;
  balance: number;
  held: number;
  available: number;
  spendable: number | null;
  negative_allowed?: boolean;
  negative_limit?: number | null;
  float_amount: number;
  has_float?: boolean;
  to_replenish: number;
  low: boolean;
  max_per_expense: number | null;
  low_balance_alert: number | null;
  allow_negative?: boolean;
  custodians: CustodianDto[];
  opened_at: string | null;
  can?: Partial<Record<'fund' | 'manage' | 'reopen' | 'count' | 'ask_funds', boolean>>;
  /** `/me/overview` only. */
  rules?: WalletRulesDto;
}

export interface PhysicalCopyDto {
  status: PhysicalCopyStatusDto;
  required: boolean;
  received_at: string | null;
  received_by: string | { id?: number; name?: string | null } | null;
  note: string | null;
}

export type InwardStatusDto = 'not_required' | 'pending' | 'partial' | 'received';

export interface InwardLineDto {
  line: number;
  name: string;
  unit: string | null;
  ordered: number;
  received: number;
  pending: number;
  /** The numbers given to what was received of this item, with the quantity each covers. */
  numbers?: Array<{ inward_no: string; qty: number }>;
}

export type InwardNumberingDto = 'auto' | 'typed';

export interface InwardReceiptDto {
  id: number;
  received_at: string | null;
  received_by: string | { id?: number; name?: string | null } | null;
  note: string | null;
  items: Array<{ line: number; name: string; unit: string | null; qty: number; inward_no: string | null }>;
}

/** Goods received at the site, per item. Lists carry `required`, `status` and `numbers`; the detail has the rest. */
export interface InwardDto {
  required: boolean;
  status: InwardStatusDto;
  numbering?: InwardNumberingDto;
  /** Every item number of the expense. */
  numbers: string[];
  lines?: InwardLineDto[];
  receipts?: InwardReceiptDto[];
}

export interface CategoryRefDto {
  id: number;
  name: string;
  code: string;
  icon: string | null;
}

export interface ExpenseDto {
  id: number;
  number: string;
  status: ExpenseStatusDto;
  amount: number;
  approved_amount: number | null;
  expense_date: string;
  merchant: string | null;
  description: string | null;
  purpose: string | null;
  invoice_no: string | null;
  seller_gstin: string | null;
  category: CategoryRefDto;
  wallet: { id: number; name: string; code: string | null };
  site: NamedRefDto | null;
  company: NamedRefDto | null;
  spender: EmployeeRefDto;
  payment_mode: PaymentModeDto | null;
  payment_reference: string | null;
  receipts: LineAttachmentDto[];
  payment_proofs: LineAttachmentDto[];
  ai_scanned: boolean;
  extracted: ExtractedBillDto | null;
  flags: FlagDto[];
  physical_copy: PhysicalCopyDto;
  inward: InwardDto;
  submitted_at: string | null;
  decided_at: string | null;
  decision_note: string | null;
  source: string | null;
}

export interface ExpenseEventDto {
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

export interface ExpenseDetailDto extends ExpenseDto {
  bill: BillDto | null;
  history: ExpenseEventDto[];
  approval: ApprovalSummaryDto | null;
  can: Partial<Record<'receive_goods' | 'undo_goods' | 'paper' | 'cancel' | 'approve', boolean>>;
}

export interface LedgerEntryDto {
  id: number;
  type: LedgerTypeDto;
  amount: number;
  balance_after: number;
  date: string;
  payment_mode: PaymentModeDto | null;
  reference: string | null;
  note: string | null;
  files: LineAttachmentDto[];
  ref: { type: string; id: number } | null;
  expense: { number: string; merchant: string | null; description: string | null; inward_no: string | null } | null;
  by: string | null;
  at: string | null;
}

export interface FundRequestDto {
  id: number;
  status: FundRequestStatusDto;
  mode: FundModeDto;
  amount: number;
  approved_amount: number | null;
  reason: string | null;
  wallet: { id: number; name: string; code: string | null; balance: number; float_amount: number; has_float?: boolean; status: WalletStatusDto };
  requested_by: EmployeeRefDto;
  created_at: string | null;
  decided_at: string | null;
  decision_note: string | null;
  paid_at: string | null;
  paid_mode: PaymentModeDto | null;
  paid_reference: string | null;
  paid_files: LineAttachmentDto[];
}

export interface FundRequestDetailDto extends FundRequestDto {
  history: ExpenseEventDto[];
  approval: ApprovalSummaryDto | null;
  can: Partial<Record<'pay', boolean>>;
}

export interface CashCountDto {
  id: number;
  book_balance: number;
  counted_amount: number;
  difference: number;
  denominations: Record<string, number> | null;
  note: string | null;
  counted_by: string | null;
  adjusted: boolean;
  at: string | null;
}

export interface SettingsDto {
  sub_organization_id: number | null;
  spend_mode: SpendModeDto;
  approval_required: boolean;
  physical_copy: PhysicalRuleDto;
  physical_copy_above: number | null;
  inward_enabled: boolean;
  inward_numbering?: InwardNumberingDto;
  inward_prefix: string;
  receipt_required_above: number | null;
  max_backdate_days: number;
  default_max_per_expense: number | null;
  /** Missing on older servers (on). */
  cash_count_enabled?: boolean;
}

export interface SettingsResponseDto {
  default: SettingsDto;
  overrides: SettingsDto[];
  effective: SettingsDto;
}

export interface CategoryDto {
  id: number;
  code: string;
  name: string;
  icon: string | null;
}

// ── Lists ───────────────────────────────────────────────────────────────────

export interface WalletTotalsDto {
  wallets: number;
  active: number;
  frozen: number;
  cash_in_hand: number;
  held: number;
  low: number;
}

export interface WalletListResponseDto extends PagedDto<WalletDto> {
  totals: WalletTotalsDto;
}

export interface WalletDetailDto {
  wallet: WalletDto;
  ledger: PagedDto<LedgerEntryDto>;
  open_fund_requests: FundRequestDto[];
  cash_counts: CashCountDto[];
}

/** `/me/wallets/:id`: custodians also get the ledger, counts and open requests. */
export interface MyWalletDetailDto {
  wallet: WalletDto;
  ledger?: PagedDto<LedgerEntryDto>;
  cash_counts?: CashCountDto[];
  open_fund_requests?: FundRequestDto[];
}

export interface ExpenseCountsDto {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  paper_pending?: number;
  paper_received?: number;
  inward_waiting?: number;
  inward_received?: number;
}

export interface ExpenseListResponseDto extends PagedDto<ExpenseDto> {
  amount?: number;
  counts?: Partial<ExpenseCountsDto>;
}

export interface InwardListResponseDto extends PagedDto<ExpenseDto> {
  counts?: { waiting?: number; partial?: number; received?: number };
}

/** `POST /expenses/inward` (receive all goods of each). */
export interface InwardBulkResultDto {
  updated: number;
  items: Array<{ id: number; inward_nos: string[]; status: InwardStatusDto }>;
  skipped: Array<{ id: number; reason: string }>;
}

/** `POST /expenses/paper-copy`. */
export interface PaperBulkResultDto {
  updated: number;
  skipped: Array<{ id: number; reason: string }>;
}

/** `POST /expenses/:id/inward`: everything pending, or the given quantities per bill line. */
export interface ReceiveGoodsBodyDto {
  all?: boolean;
  /** Typed numbering: asks for generated numbers (with `all`). */
  auto?: boolean;
  items?: Array<{ line: number; qty: number; inward_no?: string; auto?: boolean }>;
  note?: string;
}

export interface OverviewDto {
  wallets: { total: number; active: number; frozen: number; cash_in_hand: number; held: number; low: number };
  queues: { to_approve: { count: number; amount: number }; paper_bills: { count: number }; goods_inward?: { count: number }; fund_requests: { count: number } };
  this_month: { spent: number; approved: number; pending: number };
  trend: Array<{ month: string; amount: number }>;
  top_categories: Array<{ id: number; name: string; icon: string | null; amount: number; count?: number }>;
  low_wallets: WalletDto[];
  recent: ExpenseDto[];
}

export interface MyOverviewDto {
  features?: Record<string, boolean>;
  today: string;
  wallets: WalletDto[];
  categories: CategoryDto[];
  receipt_scan: boolean;
  month: { pending: number; pending_amount: number; approved: number; approved_amount: number; paper_pending: number };
  recent: ExpenseDto[];
  open_fund_requests: FundRequestDto[];
}

export interface MyExpenseListResponseDto extends PagedDto<ExpenseDto> {
  counts?: Partial<ExpenseCountsDto>;
}

// ── Requests ────────────────────────────────────────────────────────────────

export interface FileRefDto {
  key: string;
  name: string;
  size: number | null;
  type: string | null;
}

export interface ExpenseRequestDto {
  wallet_id: number;
  category_id: number;
  expense_date: string;
  amount: number;
  merchant?: string;
  description?: string;
  purpose?: string;
  invoice_no?: string;
  seller_gstin?: string;
  payment_mode: PaymentModeDto | null;
  payment_reference?: string;
  receipts: FileRefDto[];
  payment_proofs: FileRefDto[];
  bill?: BillDto;
  ai_scanned?: boolean;
  extracted?: ExtractedBillDto;
  /** HR on behalf: the spending employee. */
  spent_by?: number;
}

export interface ExpensePreviewDto {
  errors: Record<string, string> | null;
  flags: FlagDto[];
  physical: { status: PhysicalCopyStatusDto; required: boolean } | null;
  bill: BillDto | null;
  wallet: { balance: number; held: number; available: number; spendable?: number | null } | null;
}

/** `POST /me/receipts/scan`, `POST /receipts/scan?employee_id=`. Always 200 once the files are stored. */
export interface ReceiptScanDto {
  attachments: UploadedFileDto[];
  read: boolean;
  message?: string;
  model?: string | null;
  purpose?: string | null;
  expense: {
    category_id?: number | null;
    expense_date?: string | null;
    amount?: number | null;
    merchant?: string | null;
    description?: string | null;
    invoice_no?: string | null;
    seller_gstin?: string | null;
    receipts?: UploadedFileDto[];
    payment_mode?: PaymentModeDto | null;
    ai_scanned?: boolean;
    bill?: BillDto | null;
    extracted?: ExtractedBillDto | null;
  };
  missing?: string[];
  bill_check?: { reconciled: boolean; difference: number | null; notes: Array<{ code: string; message: string }> } | null;
}

export interface WalletRequestDto {
  name: string;
  site_id?: number | null;
  sub_organization_id?: number | null;
  code?: string;
  float_amount?: number;
  low_balance_alert?: number | null;
  max_per_expense?: number | null;
  allow_negative?: boolean;
  negative_limit?: number | null;
  custodian_ids: number[];
  primary_custodian_id?: number | null;
  opening_balance?: number;
}

export type WalletUpdateDto = Partial<Omit<WalletRequestDto, 'site_id' | 'sub_organization_id' | 'code' | 'opening_balance'>>;

export interface TopUpRequestDto {
  amount: number;
  payment_mode: PaymentModeDto;
  reference?: string;
  date?: string;
  note?: string;
  files?: FileRefDto[];
}

export interface PayFundRequestDto {
  payment_mode: PaymentModeDto;
  reference?: string;
  paid_on?: string;
  files?: FileRefDto[];
}

export interface CashCountRequestDto {
  counted_amount: number;
  denominations?: Record<string, number>;
  note?: string;
}

export interface FundRequestRequestDto {
  wallet_id: number;
  mode: FundModeDto;
  amount?: number;
  reason?: string;
}

// ── Exports ─────────────────────────────────────────────────────────────────

/** Filter keys shared by `GET /expenses`, `GET /inward` and the exports. */
export interface ExpenseFilterQueryDto {
  status?: string;
  wallet_id?: number;
  site_id?: number;
  sub_organization_id?: number;
  category_id?: number;
  spent_by?: number;
  payment_mode?: string;
  physical?: string;
  inward?: string;
  from?: string;
  to?: string;
  min_amount?: number;
  max_amount?: number;
  flagged?: number;
  search?: string;
}

export interface ExpensesExportRequestDto extends ExpenseFilterQueryDto {
  format: ExportFormatDto;
  include_files?: boolean;
  emails?: string[];
  ids?: number[];
}

export interface StatementExportRequestDto {
  wallet_id?: number;
  from?: string;
  to?: string;
  format: ExportFormatDto;
  /** The approved expenses of the period after the ledger (default true). */
  include_expenses?: boolean;
  /** Their bill photos (Excel) or pages (PDF), default true. */
  include_files?: boolean;
  emails?: string[];
}
