import {
  Briefcase,
  Car,
  Fuel,
  GraduationCap,
  Hotel,
  Package,
  ParkingCircle,
  Phone,
  Plane,
  Stethoscope,
  Utensils,
  Wifi,
  Receipt,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  Channel,
  ClaimListTab,
  ClaimStatus,
  FundRequestStatus,
  LedgerType,
  MyClaimTab,
  PaymentMode,
  PayoutMode,
  PhysicalCopyStatus,
  WalletStatus,
} from '../types/reimbursement.model';

export const REIMBURSEMENT_FEATURE = 'REIMBURSEMENT_FEATURE';
export const EXPENSE_WALLET_FEATURE = 'EXPENSE_WALLET_FEATURE';
export const EXPENSE_FEATURES = [REIMBURSEMENT_FEATURE, EXPENSE_WALLET_FEATURE];
/** AI receipt scan. Clients read it from `/me/overview` `policy.receipt_scan` or `/overview` `features.ai`. */
export const REIMBURSEMENT_AI_FEATURE = 'REIMBURSEMENT_AI';

export const REIMB_PERMISSIONS = {
  VIEW: 'REIMB_VIEW',
  APPROVE: 'REIMB_APPROVE',
  DISBURSE: 'REIMB_DISBURSE',
  EXPORT: 'REIMB_EXPORT',
  ADMIN: 'REIMB_ADMIN',
  SUBMIT: 'REIMB_SUBMIT',
  PHYSICAL_COLLECT: 'REIMB_PHYSICAL_COLLECT',
  WALLET_VIEW: 'EMP_WALLET_VIEW',
  WALLET_CREATE: 'EMP_WALLET_CREATE',
  WALLET_TOPUP: 'EMP_WALLET_TOPUP',
  WALLET_LOCK: 'EMP_WALLET_LOCK',
} as const;

export const CLAIMS_ACCESS = [REIMB_PERMISSIONS.VIEW, REIMB_PERMISSIONS.APPROVE, REIMB_PERMISSIONS.DISBURSE, REIMB_PERMISSIONS.PHYSICAL_COLLECT];
/** `expense-claims` export (and a claim's PDF). */
export const CLAIMS_EXPORT_ACCESS = [REIMB_PERMISSIONS.EXPORT, REIMB_PERMISSIONS.VIEW, REIMB_PERMISSIONS.DISBURSE, REIMB_PERMISSIONS.PHYSICAL_COLLECT];
/** `expense-wallet-statement` export. */
export const WALLET_EXPORT_ACCESS = [REIMB_PERMISSIONS.WALLET_VIEW, REIMB_PERMISSIONS.WALLET_TOPUP, REIMB_PERMISSIONS.EXPORT];
export const WALLETS_ACCESS = [REIMB_PERMISSIONS.WALLET_VIEW, REIMB_PERMISSIONS.WALLET_CREATE, REIMB_PERMISSIONS.WALLET_TOPUP, REIMB_PERMISSIONS.WALLET_LOCK];
export const OVERVIEW_ACCESS = [REIMB_PERMISSIONS.VIEW, REIMB_PERMISSIONS.WALLET_VIEW];

export const CLAIM_TABS: ReadonlyArray<{ value: ClaimListTab; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'to_pay', label: 'To pay' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];
export const CLAIM_TAB_VALUES = CLAIM_TABS.map((t) => t.value);

export const MY_CLAIM_TABS: ReadonlyArray<{ value: MyClaimTab; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'pending', label: 'Pending' },
  { value: 'to_pay', label: 'To be paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
];

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  draft: 'Draft',
  pending: 'Waiting for approval',
  approved: 'Approved',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const CLAIM_STATUS_HELP: Record<ClaimStatus, string> = {
  draft: 'Saved but not sent. Only the employee can see it.',
  pending: 'Waiting in Approvals. Nothing is paid or spent yet.',
  approved: 'Approved. A claim waits to be paid back; a wallet expense is already spent from the wallet.',
  paid: 'Paid back to the employee.',
  rejected: 'Rejected in Approvals. Nothing is paid.',
  cancelled: 'Withdrawn or cancelled before it was paid.',
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  claim: 'Claim',
  wallet: 'Wallet',
};

export const CHANNEL_HELP: Record<Channel, string> = {
  claim: 'You paid with your own money. You are paid back after approval.',
  wallet: 'Spent from your expense wallet. Approval takes it from the balance.',
};

export const PAYOUT_MODE_LABEL: Record<PayoutMode, string> = {
  manual: 'By Accounts',
  payroll: 'With payroll',
};

/** How the employee paid a bill (`lines[i].payment_mode`). */
export const PAYMENT_MODES: ReadonlyArray<{ value: PaymentMode; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'net_banking', label: 'Net banking' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];
export const PAYMENT_MODE_LABEL = Object.fromEntries(PAYMENT_MODES.map((m) => [m.value, m.label])) as Record<PaymentMode, string>;

export const PHYSICAL_COPY_LABEL: Record<PhysicalCopyStatus, string> = {
  not_required: 'Not needed',
  optional: 'Optional',
  pending: 'To collect',
  collected: 'Collected',
};

/** The employee's wording. */
export const MY_PHYSICAL_COPY_LABEL: Record<PhysicalCopyStatus, string> = {
  not_required: 'No paper bill needed',
  optional: 'Paper bill optional',
  pending: 'Hand in the paper bill',
  collected: 'Paper bill handed in',
};

export const PHYSICAL_FILTERS: ReadonlyArray<{ value: '' | 'pending' | 'collected'; label: string }> = [
  { value: '', label: 'Any paper bill' },
  { value: 'pending', label: 'Bill to collect' },
  { value: 'collected', label: 'Bill collected' },
];

/** Download Centre limits (`/exports/*`). */
export const EXPORT_PDF_CLAIM_LIMIT = 500;
/** Excel with bill photos embedded. */
export const EXPORT_XLSX_PHOTO_CLAIM_LIMIT = 500;
/** Excel without photos (streamed). */
export const EXPORT_XLSX_CLAIM_LIMIT = 20000;
export const EXPORT_PDF_WALLET_LIMIT = 200;
/** `emails` on an export job. */
export const EXPORT_MAX_EMAILS = 5;

/** Paper bill choices in the export dialog. */
export const EXPORT_PHYSICAL_OPTIONS: ReadonlyArray<{ value: 'pending' | 'collected' | 'optional'; label: string }> = [
  { value: 'pending', label: 'To collect' },
  { value: 'collected', label: 'Collected' },
  { value: 'optional', label: 'Optional' },
];

export const WALLET_STATUS_LABEL: Record<WalletStatus, string> = {
  active: 'Active',
  frozen: 'Frozen',
  closed: 'Closed',
};

export const WALLET_STATUS_HELP: Record<WalletStatus, string> = {
  active: 'Can be used for wallet expenses.',
  frozen: 'No new wallet expenses. Top-ups are still allowed.',
  closed: 'Closed. Reopen it to use it again.',
};

export const FUND_STATUS_LABEL: Record<FundRequestStatus, string> = {
  pending: 'Waiting for approval',
  approved: 'To pay',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Withdrawn',
};

export const LEDGER_TYPE_LABEL: Record<LedgerType, string> = {
  opening: 'Opening balance',
  top_up: 'Top-up',
  expense: 'Expense',
  return: 'Taken back',
  adjustment: 'Adjustment',
};

export const EVENT_LABEL: Record<string, string> = {
  drafted: 'Saved as draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  withdrawn: 'Withdrawn',
  paid: 'Paid',
  amounts_changed: 'Amounts changed by the approver',
  payout_changed: 'Payout changed',
  imported: 'Imported from the old system',
  physical_copy_collected: 'Paper bill collected',
  physical_copy_pending: 'Paper bill marked as not collected',
};

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  travel: Plane,
  fuel: Fuel,
  food: Utensils,
  stay: Hotel,
  phone: Phone,
  internet: Wifi,
  medical: Stethoscope,
  office: Package,
  client: Briefcase,
  training: GraduationCap,
  parking: ParkingCircle,
  other: Receipt,
  car: Car,
};

export const CATEGORY_ICON_LABEL: Record<string, string> = {
  travel: 'Travel',
  fuel: 'Fuel',
  food: 'Food',
  stay: 'Stay',
  phone: 'Phone',
  internet: 'Internet',
  medical: 'Medical',
  office: 'Office',
  client: 'Client',
  training: 'Training',
  parking: 'Parking',
  other: 'Other',
};

export function categoryIcon(icon: string | null | undefined): LucideIcon {
  return (icon && CATEGORY_ICONS[icon]) || Receipt;
}

export const SEARCH_DEBOUNCE_MS = 400;
export const PREVIEW_DEBOUNCE_MS = 450;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_LINES = 50;
export const MAX_LINE_FILES = 5;
/** Photos of one bill's pages read in one scan (a PDF is scanned on its own). */
export const MAX_SCAN_PAGES = 5;
export const MAX_PAYMENT_PROOFS = 5;
export const MAX_PAYMENT_REFERENCE = 100;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
export const ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export const ILLUSTRATIONS = {
  credit: { src: '/vectors/credit.svg', width: 960, height: 660, alt: 'Expenses illustration' },
  debits: { src: '/vectors/debits.svg', width: 960, height: 439, alt: 'Wallet illustration' },
  review: { src: '/vectors/review.svg', width: 576, height: 800, alt: 'Review illustration' },
  approvals: { src: '/vectors/approvals.svg', width: 602, height: 651, alt: 'Approvals illustration' },
  policy: { src: '/vectors/policy.svg', width: 704, height: 800, alt: 'Categories illustration' },
  flow: { src: '/vectors/flow.svg', width: 960, height: 755, alt: 'Flow illustration' },
} as const;
