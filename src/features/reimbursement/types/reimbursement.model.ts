import type {
  CategoryKindDto,
  ChannelDto,
  ExtractedBillDto,
  ClaimStatusDto,
  FundRequestStatusDto,
  LedgerTypeDto,
  PayoutModeDto,
  PhysicalCopyStatusDto,
  WalletStatusDto,
} from './reimbursement.dto';
import type { Bill, Flag, LineAttachment, PaymentMode } from '@/features/expense-bills/types/bill.model';

export type {
  Bill,
  BillBuyer,
  BillCharge,
  BillItem,
  BillNote,
  BillSeller,
  BillTaxMode,
  BillTotals,
  Flag,
  FlagSeverity,
  LineAttachment,
  PaymentMode,
  UploadedFile,
} from '@/features/expense-bills/types/bill.model';

export type Channel = ChannelDto;
export type ClaimStatus = ClaimStatusDto;
export type PayoutMode = PayoutModeDto;
export type CategoryKind = CategoryKindDto;
export type WalletStatus = WalletStatusDto;
export type FundRequestStatus = FundRequestStatusDto;
export type LedgerType = LedgerTypeDto;
export type PhysicalCopyStatus = PhysicalCopyStatusDto;
/** HR claims list filter on the paper bill. */
export type PhysicalFilter = 'pending' | 'collected';

/** The paper bill, separate from approval and payment. */
export interface PhysicalCopy {
  status: PhysicalCopyStatus;
  /** Payment (Pay button, Payouts, payroll) waits until it is collected. */
  holdsPayment: boolean;
  collectedAt: string | null;
  collectedBy: string | null;
  note: string | null;
}

export type ClaimListTab = 'pending' | 'to_pay' | 'approved' | 'paid' | 'rejected' | 'cancelled' | 'all';
export type MyClaimTab = 'all' | 'draft' | 'pending' | 'to_pay' | 'paid' | 'rejected';
export type ClaimSortKey = 'submitted_at' | 'amount' | 'name' | 'decided_at' | 'paid_at';

export interface ClaimSort {
  key: ClaimSortKey;
  dir: 'asc' | 'desc';
}

export interface EmployeeRef {
  id: number;
  code: string | null;
  name: string;
  department: string | null;
}

export interface CategoryRef {
  id: number;
  name: string;
  code: string;
  kind: CategoryKind;
  icon: string | null;
}

export interface ClaimLine {
  id: number;
  seq: number;
  category: CategoryRef;
  expenseDate: string;
  description: string | null;
  merchant: string | null;
  quantity: number | null;
  rate: number | null;
  amount: number;
  approvedAmount: number | null;
  attachments: LineAttachment[];
  flags: Flag[];
  invoiceNo: string | null;
  sellerGstin: string | null;
  /** The line was filled from a receipt by AI (the employee may have changed it since). */
  aiScanned: boolean;
  /** Raw read of the receipt, sent back unchanged on save. Not shown: the UI shows `bill`. */
  extracted: ExtractedBillDto | null;
  bill: Bill | null;
  paymentMode: PaymentMode | null;
  paymentReference: string | null;
  paymentProofs: LineAttachment[];
}

export interface Claim {
  id: number;
  number: string;
  title: string;
  purpose: string | null;
  channel: Channel;
  status: ClaimStatus;
  payoutMode: PayoutMode | null;
  claimedAmount: number;
  approvedAmount: number | null;
  /** What is (or will be) paid / spent: approved when decided, else claimed. */
  amount: number;
  employee: EmployeeRef;
  company: { id: number; name: string | null } | null;
  flags: Flag[];
  flagCount: number;
  lineCount: number;
  categories: string[];
  createdAt: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  paidOn: string | null;
  paidReference: string | null;
  hasProof: boolean;
  inPayroll: boolean;
  source: string | null;
  lines: ClaimLine[];
  physicalCopy: PhysicalCopy;
}

export interface ClaimEvent {
  id: number;
  action: string;
  by: string | null;
  at: string | null;
  data: Record<string, unknown>;
}

export interface ApprovalStep {
  index: number;
  name: string;
  state: 'approved' | 'rejected' | 'current' | 'skipped' | 'waiting';
  approvers: Array<{ name: string; status: string; actedAt: string | null; note: string | null }>;
}

export interface ApprovalSummary {
  requestId: number;
  status: string;
  steps: ApprovalStep[];
}

export interface Wallet {
  id: number;
  employee: EmployeeRef;
  status: WalletStatus;
  statusNote: string | null;
  balance: number;
  held: number;
  available: number;
  openedAt: string | null;
  closedAt: string | null;
  /** Whether wallet expenses may take the balance below zero. */
  negativeAllowed: boolean;
  /** How far below zero (when allowed); null = no limit. */
  negativeLimit: number | null;
  /** What can be spent now; null = no limit. */
  spendable: number | null;
  /** How much the balance is below zero; 0 when not. */
  belowZero: number;
}

export interface ClaimCan {
  edit: boolean;
  cancel: boolean;
  pay: boolean;
  changePayout: boolean;
  approve: boolean;
  /** Mark the paper bill collected (REIMB_PHYSICAL_COLLECT). */
  collect: boolean;
}

export interface ClaimDetail extends Claim {
  history: ClaimEvent[];
  approval: ApprovalSummary | null;
  wallet: Wallet | null;
  can: ClaimCan;
}

export interface LedgerEntry {
  id: number;
  type: LedgerType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  /** Part of a credit that paid back a negative balance. */
  coversNegative: number;
  /** Part of a debit that went below zero. */
  goesNegative: number;
  date: string;
  ref: { type: 'claim' | 'fund_request' | 'legacy'; id: number; title: string | null } | null;
  reference: string | null;
  note: string | null;
  hasProof: boolean;
  by: string | null;
  at: string | null;
}

export interface FundRequest {
  id: number;
  employee: EmployeeRef;
  walletId: number;
  amount: number;
  approvedAmount: number | null;
  reason: string | null;
  status: FundRequestStatus;
  decidedAt: string | null;
  decisionNote: string | null;
  paidOn: string | null;
  paidReference: string | null;
  createdAt: string | null;
  /** Quotation or supporting files the employee attached. */
  attachments: FundRequestFile[];
}

export interface FundRequestFile {
  index: number;
  name: string;
  size: number | null;
  type: string | null;
}

export interface CategoryRule {
  perClaim: number;
  perMonth: number;
  perYear: number;
  whenExceeded: 'flag' | 'block';
  ratePerKm: number;
  receipt: 'always' | 'above' | 'never';
  receiptAbove: number;
}

export type CategoryUse = 'claims' | 'petty_cash';

export interface Category {
  id: number;
  code: string;
  name: string;
  description: string | null;
  kind: CategoryKind;
  icon: string | null;
  glCode: string | null;
  status: 'active' | 'inactive';
  sortOrder: number;
  subOrganizationId: number | null;
  /** Claims, petty cash, or both. */
  appliesTo: CategoryUse[];
  /** Petty cash goods category: the items are received at the site. */
  needsInward: boolean;
  rule: CategoryRule | null;
  used: { month: number; year: number } | null;
}

export interface CountAmount {
  count: number;
  amount: number;
}

export interface MyWallet extends Wallet {
  recent: LedgerEntry[];
  openFundRequests: FundRequest[];
}

export interface MyOverview {
  features: { claims: boolean; wallet: boolean };
  enabled: boolean;
  today: string;
  policy: { submitWithinDays: number; payoutMode: PayoutMode; needsApproval: boolean; fundRequests: boolean; receiptScan: boolean };
  channels: Channel[];
  categories: Category[];
  wallet: MyWallet | null;
  counts: Record<'draft' | 'pending' | 'to_be_paid' | 'paid' | 'wallet_spent' | 'rejected', CountAmount>;
}

export interface Overview {
  month: string;
  features: { claims: boolean; wallet: boolean; ai: boolean };
  kpis: Record<'pending' | 'to_pay' | 'in_payroll' | 'paid_this_month' | 'wallet_pending', CountAmount>;
  /** Paper bills still to collect; null when the server does not report it. */
  billsToCollect: CountAmount | null;
  trend: Array<{ month: string; claim: number; wallet: number }>;
  topCategories: Array<{ id: number; name: string; icon: string | null; amount: number; claims: number }>;
  wallets: {
    count: number;
    active: number;
    frozen: number;
    fundsOut: number;
    owedToEmployees: number;
    negative: number;
    fundRequestsPending: number;
    fundRequestsToPay: CountAmount;
  } | null;
}

export interface WalletTotals {
  wallets: number;
  active: number;
  frozen: number;
  fundsOut: number;
  owedToEmployees: number;
  negative: number;
}

export interface WalletDetail {
  wallet: Wallet;
  ledger: LedgerEntry[];
  ledgerTotal: number;
  openFundRequests: FundRequest[];
  can: { fund: boolean; freeze: boolean; close: boolean; reopen: boolean };
}

export interface ClaimPreviewLine {
  amount: number;
  rate: number | null;
  flags: Flag[];
  bill: Bill | null;
}

export interface ClaimPreview {
  total: number;
  errors: Record<string, string>;
  flags: Flag[];
  /** `bill`: the server-checked bill of each line (null when the line has none). */
  lines: ClaimPreviewLine[];
  wallet: { balance: number; held: number; available: number } | null;
}

/** One editable line of the expense form. Amounts are kept as typed text. */
export interface LineInput {
  uid: string;
  categoryId: number | null;
  expenseDate: string;
  amount: string;
  quantity: string;
  merchant: string;
  description: string;
  attachments: LineAttachment[];
  invoiceNo: string;
  sellerGstin: string | null;
  aiScanned: boolean;
  extracted: ExtractedBillDto | null;
  /** The bill (from the scan, the draft, or entered by hand); sent back on preview/create/update. */
  bill: Bill | null;
  /** UI only: the line amount follows the bill's grand total until the user types another amount. */
  amountFromBill: boolean;
  paymentMode: PaymentMode | null;
  paymentReference: string;
  paymentProofs: LineAttachment[];
  /** UI only: the receipt scan feeding this line. Never sent. */
  scan: LineScan | null;
}

export interface LineScan {
  status: 'scanning' | 'read' | 'unread';
  fileName: string;
  /** Why the receipt could not be read (status `unread`). */
  message: string | null;
  /** Form fields the reader could not fill (`category_id`, `expense_date`, `amount`). */
  missing: string[];
  /** Number of pages (files) read together as this bill. */
  pages?: number;
}

export interface ClaimFormInput {
  channel: Channel;
  title: string;
  purpose: string;
  lines: LineInput[];
}

/** `title`, `purpose`, `channel`, `lines`, and per line `lines[i].<field>` — the backend's error keys. */
export type ClaimFormErrors = Record<string, string>;
