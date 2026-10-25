import type {
  ExpenseStatus,
  ExpenseTab,
  FundMode,
  FundRequestStatus,
  FundTab,
  InwardNumbering,
  InwardStatus,
  InwardTab,
  PaperTab,
  LedgerType,
  PhysicalCopyStatus,
  PhysicalRule,
  SpendMode,
  WalletStatus,
} from '../types/petty-cash.model';

export const PETTY_CASH_FEATURE = 'PETTY_CASH_FEATURE';
/** AI receipt scan: the same org feature as Expenses. The servers report it as `receipt_scan`. */
export const PC_AI_FEATURE = 'REIMBURSEMENT_AI';

export const PC = {
  VIEW: 'PC_VIEW',
  SPEND: 'PC_SPEND',
  FUND: 'PC_FUND',
  APPROVE: 'PC_APPROVE',
  INWARD: 'PC_INWARD',
  ADMIN: 'PC_ADMIN',
} as const;

/** Who may open each HR screen (the server still decides what each call returns). */
export const OVERVIEW_ACCESS = [PC.VIEW, PC.ADMIN];
export const WALLETS_ACCESS = [PC.VIEW, PC.ADMIN, PC.FUND];
export const EXPENSES_ACCESS = [PC.VIEW, PC.ADMIN, PC.APPROVE, PC.FUND, PC.INWARD];
export const FUND_REQUESTS_ACCESS = [PC.VIEW, PC.ADMIN, PC.FUND];
export const INWARD_ACCESS = [PC.INWARD, PC.VIEW, PC.ADMIN];
export const SETTINGS_ACCESS = [PC.VIEW, PC.ADMIN];
/** `petty-cash-expenses`: anyone who can read the expense list. */
export const EXPORT_ACCESS = [PC.VIEW, PC.ADMIN, PC.FUND, PC.INWARD, PC.APPROVE];
/** `petty-cash-statement`. */
export const STATEMENT_ACCESS = [PC.VIEW, PC.ADMIN, PC.FUND];

/** What each action needs on the server (`FUND`, `INWARD` routes also let PC_ADMIN through). */
export const FUND_ACTIONS = [PC.FUND, PC.ADMIN];
export const INWARD_ACTIONS = [PC.INWARD, PC.ADMIN];

export const WALLET_STATUS_LABEL: Record<WalletStatus, string> = { active: 'Active', frozen: 'Frozen', closed: 'Closed' };
export const WALLET_STATUS_HELP: Record<WalletStatus, string> = {
  active: 'Can be used for expenses.',
  frozen: 'No new expenses. Top-ups are still allowed.',
  closed: 'Closed. Reopen it to use it again.',
};

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  pending: 'Waiting for approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};
export const EXPENSE_STATUS_HELP: Record<ExpenseStatus, string> = {
  pending: 'Held in the wallet until it is decided in Approvals.',
  approved: 'Approved and taken from the wallet.',
  rejected: 'Rejected in Approvals. The held amount is back in the wallet.',
  cancelled: 'Withdrawn or cancelled. Nothing is taken from the wallet.',
};

export const EXPENSE_TABS: ReadonlyArray<{ value: ExpenseTab; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];
export const EXPENSE_TAB_VALUES = EXPENSE_TABS.map((t) => t.value);

export const MY_EXPENSE_TABS: ReadonlyArray<{ value: ExpenseTab; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export const FUND_TABS: ReadonlyArray<{ value: FundTab; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'to_pay', label: 'To pay' },
  { value: 'paid', label: 'Paid' },
  { value: 'closed', label: 'Closed' },
];

export const INWARD_TABS: ReadonlyArray<{ value: InwardTab; label: string }> = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'partial', label: 'Partly received' },
  { value: 'received', label: 'Received' },
];

export const PAPER_TABS: ReadonlyArray<{ value: PaperTab; label: string }> = [
  { value: 'pending', label: 'To receive' },
  { value: 'received', label: 'Received' },
];

export const FUND_STATUS_LABEL: Record<FundRequestStatus, string> = {
  pending: 'Waiting for approval',
  approved: 'To pay',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Withdrawn',
};

export const FUND_MODE_LABEL: Record<FundMode, string> = { amount: 'Amount', replenish: 'Back up to float' };

export const LEDGER_TYPE_LABEL: Record<LedgerType, string> = {
  opening: 'Opening balance',
  top_up: 'Top-up',
  expense: 'Expense',
  return: 'Returned',
  adjustment: 'Adjustment',
  count_diff: 'Cash count difference',
};

/** Paper-bill status, in the staff's wording and the spender's. */
export const PHYSICAL_COPY_LABEL: Record<PhysicalCopyStatus, string> = {
  not_required: 'Not needed',
  optional: 'Optional',
  pending: 'To receive',
  received: 'Received',
};
export const MY_PHYSICAL_COPY_LABEL: Record<PhysicalCopyStatus, string> = {
  not_required: 'No paper bill needed',
  optional: 'Paper bill optional',
  pending: 'Hand in the paper bill',
  received: 'Paper bill handed in',
};

export const PHYSICAL_FILTERS: ReadonlyArray<{ value: '' | 'pending' | 'received' | 'receivable' | 'none'; label: string }> = [
  { value: '', label: 'Any paper bill' },
  { value: 'pending', label: 'To receive' },
  { value: 'received', label: 'Received' },
  { value: 'receivable', label: 'Can be received' },
  { value: 'none', label: 'No paper bill' },
];

/** The same filter in the spender's wording (`/me/expenses` reads `physical` like the HR list). */
export const MY_PHYSICAL_FILTERS: ReadonlyArray<{ value: '' | 'pending' | 'received' | 'receivable' | 'none'; label: string }> = [
  { value: '', label: 'Any paper bill' },
  { value: 'pending', label: 'To hand in' },
  { value: 'received', label: 'Handed in' },
  { value: 'none', label: 'No paper bill needed' },
];

export const SPEND_MODES: ReadonlyArray<{ value: SpendMode; label: string; description: string }> = [
  { value: 'custodians', label: 'Custodians only', description: 'Only the people named on a wallet can spend from it.' },
  { value: 'site_members', label: 'Site members', description: 'Anyone assigned to the wallet’s site can spend from it.' },
  { value: 'both', label: 'Both', description: 'Custodians and the site’s members.' },
];

export const INWARD_NUMBERING: ReadonlyArray<{ value: InwardNumbering; label: string; description: string }> = [
  { value: 'auto', label: 'Automatic', description: 'The system numbers every item.' },
  { value: 'typed', label: 'Typed', description: 'The employee types a number per item, or asks for an automatic one, or leaves it blank.' },
];

export const PHYSICAL_RULES: ReadonlyArray<{ value: PhysicalRule; label: string; description: string }> = [
  { value: 'never', label: 'Never', description: 'No paper bill is asked for.' },
  { value: 'optional', label: 'Optional', description: 'The paper bill can be handed in but is not needed.' },
  { value: 'always', label: 'Always', description: 'Every expense needs its paper bill.' },
  { value: 'above', label: 'Above an amount', description: 'Only expenses above the amount need the paper bill.' },
];

export const EVENT_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  created: 'Entered',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  withdrawn: 'Withdrawn',
  amount_changed: 'Amount lowered by the approver',
  inward_received: 'Goods received',
  inward_undone: 'Goods receipt undone',
  paper_received: 'Paper bill received',
  paper_undone: 'Paper bill marked as not received',
  paid: 'Paid',
  requested: 'Requested',
};

export const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

/** Download Centre limits for `petty-cash-expenses`. */
export const EXPORT_PDF_LIMIT = 500;
export const EXPORT_XLSX_PHOTO_LIMIT = 500;
export const EXPORT_XLSX_LIMIT = 20000;

export const DEFAULT_PAGE_SIZE = 25;
export const BULK_INWARD_MAX = 200;

export const INWARD_STATUS_LABEL: Record<InwardStatus, string> = {
  not_required: 'No goods',
  pending: 'To receive',
  partial: 'Partly received',
  received: 'Received',
};

export const INWARD_FILTERS: ReadonlyArray<{ value: '' | 'waiting' | 'partial' | 'received' | 'none'; label: string }> = [
  { value: '', label: 'Any goods' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'partial', label: 'Partly received' },
  { value: 'received', label: 'Received' },
  { value: 'none', label: 'No goods' },
];

/** One illustration per screen or filter, so an empty state shows what it is about (public/vectors/pc-*.svg). */
export const ILLUSTRATIONS = {
  wallet: { src: '/vectors/pc-wallet.svg', width: 640, height: 420, alt: 'Petty cash wallet with notes and coins' },
  overview: { src: '/vectors/pc-overview.svg', width: 640, height: 420, alt: 'Petty cash dashboard with a spend chart' },
  expenses: { src: '/vectors/pc-expenses.svg', width: 640, height: 420, alt: 'Petty cash bills' },
  pending: { src: '/vectors/pc-pending.svg', width: 640, height: 420, alt: 'A bill waiting for approval' },
  approved: { src: '/vectors/pc-approved.svg', width: 640, height: 420, alt: 'An approved bill' },
  rejected: { src: '/vectors/pc-rejected.svg', width: 640, height: 420, alt: 'A rejected bill' },
  inward: { src: '/vectors/pc-inward.svg', width: 640, height: 420, alt: 'Paper bills stamped into the inward register' },
  inwardWaiting: { src: '/vectors/pc-inward-waiting.svg', width: 640, height: 420, alt: 'A paper bill on its way to the office' },
  funds: { src: '/vectors/pc-funds.svg', width: 640, height: 420, alt: 'Cash being added to a wallet' },
  cashCount: { src: '/vectors/pc-cash-count.svg', width: 640, height: 420, alt: 'Notes counted with a calculator' },
  ledger: { src: '/vectors/pc-ledger.svg', width: 640, height: 420, alt: 'An open cash book' },
  settings: { src: '/vectors/pc-settings.svg', width: 640, height: 420, alt: 'Petty cash rules' },
  search: { src: '/vectors/pc-search.svg', width: 640, height: 420, alt: 'Nothing matches the search' },
  locked: { src: '/vectors/pc-locked.svg', width: 640, height: 420, alt: 'A locked cash box' },
  notFound: { src: '/vectors/pc-not-found.svg', width: 640, height: 420, alt: 'A wallet that could not be found' },
} as const;

/** The empty state of an expense list on [tab]; the paper-bill filter wins when it is on. */
export function tabIllustration(tab: ExpenseTab, physical?: string | null) {
  if (physical === 'pending' || physical === 'receivable') return ILLUSTRATIONS.inwardWaiting;
  if (physical === 'received') return ILLUSTRATIONS.inward;
  if (tab === 'pending') return ILLUSTRATIONS.pending;
  if (tab === 'approved') return ILLUSTRATIONS.approved;
  if (tab === 'rejected' || tab === 'cancelled') return ILLUSTRATIONS.rejected;
  return ILLUSTRATIONS.expenses;
}
