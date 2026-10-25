import type { ExtractedBillDto } from '@/features/expense-bills/types/bill.dto';
import type { Bill, Flag, LineAttachment, PaymentMode } from '@/features/expense-bills/types/bill.model';
import type {
  ExpenseStatusDto,
  FundModeDto,
  FundRequestStatusDto,
  LedgerTypeDto,
  InwardStatusDto,
  PhysicalCopyStatusDto,
  PhysicalRuleDto,
  SpendModeDto,
  WalletStatusDto,
} from './petty-cash.dto';

export type WalletStatus = WalletStatusDto;
export type ExpenseStatus = ExpenseStatusDto;
export type PhysicalCopyStatus = PhysicalCopyStatusDto;
export type FundRequestStatus = FundRequestStatusDto;
export type FundMode = FundModeDto;
export type LedgerType = LedgerTypeDto;
export type SpendMode = SpendModeDto;
export type PhysicalRule = PhysicalRuleDto;

export type ExpenseTab = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';
export type FundTab = 'pending' | 'to_pay' | 'paid' | 'closed';
export type InwardTab = 'waiting' | 'partial' | 'received';
export type PaperTab = 'pending' | 'received';
export type InwardStatus = InwardStatusDto;
export type ExpenseSortKey = 'date' | 'amount' | 'submitted_at' | 'inward';

export interface NamedRef {
  id: number;
  name: string;
}

export interface EmployeeRef {
  id: number;
  code: string | null;
  name: string;
}

export interface Custodian {
  employeeId: number;
  code: string | null;
  name: string;
  userId: number | null;
  isPrimary: boolean;
}

export interface WalletRules {
  physicalCopy: PhysicalRule;
  physicalCopyAbove: number | null;
  receiptRequiredAbove: number | null;
  maxBackdateDays: number;
}

export interface WalletCan {
  fund: boolean;
  manage: boolean;
  reopen: boolean;
  count: boolean;
  askFunds: boolean;
}

export interface Wallet {
  id: number;
  code: string | null;
  name: string;
  status: WalletStatus;
  statusNote: string | null;
  site: NamedRef | null;
  company: NamedRef | null;
  balance: number;
  held: number;
  available: number;
  /** What can be spent now; null = no limit. */
  spendable: number | null;
  negativeAllowed: boolean;
  /** How far below zero (when allowed); null = no limit. */
  negativeLimit: number | null;
  floatAmount: number;
  /** The org keeps a float for this wallet (float amount above zero). */
  hasFloat: boolean;
  toReplenish: number;
  low: boolean;
  maxPerExpense: number | null;
  lowBalanceAlert: number | null;
  custodians: Custodian[];
  openedAt: string | null;
  can: WalletCan;
  rules: WalletRules | null;
}

export interface InwardLine {
  line: number;
  name: string;
  unit: string | null;
  ordered: number;
  received: number;
  pending: number;
  numbers: Array<{ inwardNo: string; qty: number }>;
}

export type InwardNumbering = 'auto' | 'typed';

export interface InwardReceipt {
  id: number;
  receivedAt: string | null;
  receivedBy: string | null;
  note: string | null;
  items: Array<{ line: number; name: string; unit: string | null; qty: number; inwardNo: string | null }>;
}

export interface Inward {
  required: boolean;
  status: InwardStatus;
  numbering: InwardNumbering;
  numbers: string[];
  lines: InwardLine[];
  receipts: InwardReceipt[];
}

export interface PhysicalCopy {
  status: PhysicalCopyStatus;
  required: boolean;
  receivedAt: string | null;
  receivedBy: string | null;
  note: string | null;
}

export interface CategoryRef {
  id: number;
  name: string;
  code: string;
  icon: string | null;
}

export interface Expense {
  id: number;
  number: string;
  status: ExpenseStatus;
  amount: number;
  approvedAmount: number | null;
  /** What is (or will be) taken from the wallet: approved when decided, else the amount. */
  netAmount: number;
  expenseDate: string;
  merchant: string | null;
  description: string | null;
  purpose: string | null;
  invoiceNo: string | null;
  sellerGstin: string | null;
  category: CategoryRef;
  wallet: { id: number; name: string; code: string | null };
  site: NamedRef | null;
  company: NamedRef | null;
  spender: EmployeeRef;
  paymentMode: PaymentMode | null;
  paymentReference: string | null;
  receipts: LineAttachment[];
  paymentProofs: LineAttachment[];
  aiScanned: boolean;
  flags: Flag[];
  physicalCopy: PhysicalCopy;
  inward: Inward;
  submittedAt: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  source: string | null;
}

export interface ExpenseEvent {
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

export interface ExpenseDetail extends Expense {
  bill: Bill | null;
  history: ExpenseEvent[];
  approval: ApprovalSummary | null;
  can: { receiveGoods: boolean; undoGoods: boolean; paper: boolean; cancel: boolean; approve: boolean };
}

export interface LedgerEntry {
  id: number;
  type: LedgerType;
  amount: number;
  balanceAfter: number;
  date: string;
  paymentMode: PaymentMode | null;
  reference: string | null;
  note: string | null;
  files: LineAttachment[];
  ref: { type: string; id: number } | null;
  expense: { number: string; merchant: string | null; description: string | null; inwardNo: string | null } | null;
  by: string | null;
  at: string | null;
}

export interface FundRequest {
  id: number;
  status: FundRequestStatus;
  mode: FundMode;
  amount: number;
  approvedAmount: number | null;
  reason: string | null;
  wallet: { id: number; name: string; code: string | null; balance: number; floatAmount: number; hasFloat: boolean; status: WalletStatus };
  requestedBy: EmployeeRef;
  createdAt: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  paidAt: string | null;
  paidMode: PaymentMode | null;
  paidReference: string | null;
  paidFiles: LineAttachment[];
}

export interface FundRequestDetail extends FundRequest {
  history: ExpenseEvent[];
  approval: ApprovalSummary | null;
  canPay: boolean;
}

export interface CashCount {
  id: number;
  bookBalance: number;
  countedAmount: number;
  difference: number;
  denominations: Record<string, number> | null;
  note: string | null;
  countedBy: string | null;
  adjusted: boolean;
  at: string | null;
}

export interface Settings {
  subOrganizationId: number | null;
  spendMode: SpendMode;
  approvalRequired: boolean;
  physicalCopy: PhysicalRule;
  physicalCopyAbove: number | null;
  inwardEnabled: boolean;
  inwardNumbering: InwardNumbering;
  inwardPrefix: string;
  receiptRequiredAbove: number | null;
  maxBackdateDays: number;
  defaultMaxPerExpense: number | null;
  cashCountEnabled: boolean;
}

export interface SettingsBundle {
  default: Settings;
  overrides: Settings[];
  effective: Settings;
}

export interface Category {
  id: number;
  code: string;
  name: string;
  icon: string | null;
}

export interface WalletTotals {
  wallets: number;
  active: number;
  frozen: number;
  cashInHand: number;
  held: number;
  low: number;
}

export interface WalletDetail {
  wallet: Wallet;
  ledger: LedgerEntry[];
  ledgerTotal: number;
  openFundRequests: FundRequest[];
  cashCounts: CashCount[];
}

export interface MyWalletDetail {
  wallet: Wallet;
  /** Null for a spender who is not a custodian. */
  ledger: LedgerEntry[] | null;
  ledgerTotal: number;
  cashCounts: CashCount[];
  openFundRequests: FundRequest[];
}

export interface ExpenseCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  paperPending: number;
  paperReceived: number;
  /** Goods register (`/inward`): waiting includes partly received. */
  inwardWaiting: number;
  inwardPartial: number;
  inwardReceived: number;
}

export interface Overview {
  wallets: { total: number; active: number; frozen: number; cashInHand: number; held: number; low: number };
  queues: { toApprove: { count: number; amount: number }; paperBills: number; goodsInward: number; fundRequests: number };
  thisMonth: { spent: number; approved: number; pending: number };
  trend: Array<{ month: string; amount: number }>;
  topCategories: Array<{ id: number; name: string; icon: string | null; amount: number; count: number }>;
  lowWallets: Wallet[];
  recent: Expense[];
}

export interface MyOverview {
  today: string;
  wallets: Wallet[];
  categories: Category[];
  receiptScan: boolean;
  month: { pending: number; pendingAmount: number; approved: number; approvedAmount: number; paperPending: number };
  recent: Expense[];
  openFundRequests: FundRequest[];
}

export interface PaperResult {
  updated: number;
  skipped: Array<{ id: number; reason: string }>;
}

export interface InwardResult {
  updated: number;
  items: Array<{ id: number; inwardNos: string[]; status: InwardStatus }>;
  skipped: Array<{ id: number; reason: string }>;
}

/** What the live preview says about the expense being written. */
export interface ExpensePreview {
  errors: Record<string, string>;
  flags: Flag[];
  physical: { status: PhysicalCopyStatus; required: boolean } | null;
  bill: Bill | null;
  wallet: { balance: number; held: number; available: number; spendable: number | null } | null;
}

export interface ExpenseFilters {
  tab: ExpenseTab;
  walletId: number | null;
  siteId: number | null;
  /** HR lists: one company (sub-organization). */
  subOrgId: number | null;
  categoryId: number | null;
  spentBy: number | null;
  paymentMode: PaymentMode | null;
  physical: 'pending' | 'received' | 'receivable' | 'none' | null;
  /** Goods register view. */
  inward: 'waiting' | 'pending' | 'partial' | 'received' | 'none' | null;
  from: string;
  to: string;
  minAmount: string;
  maxAmount: string;
  flagged: boolean;
  search: string;
}

/** The expense being written (one bill, one expense). Amounts are kept as typed text. */
export interface ExpenseInput {
  walletId: number | null;
  categoryId: number | null;
  expenseDate: string;
  amount: string;
  merchant: string;
  description: string;
  purpose: string;
  invoiceNo: string;
  sellerGstin: string | null;
  receipts: LineAttachment[];
  paymentMode: PaymentMode | null;
  paymentReference: string;
  paymentProofs: LineAttachment[];
  aiScanned: boolean;
  extracted: ExtractedBillDto | null;
  bill: Bill | null;
  /** UI only: the amount follows the bill's grand total until the user types another amount. */
  amountFromBill: boolean;
  /** HR on behalf. */
  spentBy: number | null;
}

export interface ExpenseScan {
  status: 'scanning' | 'read' | 'unread';
  message: string | null;
  missing: string[];
}
