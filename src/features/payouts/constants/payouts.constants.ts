import type { PayoutTab } from '../types/payouts.model';

export const PAYOUT_PERMISSIONS = { VIEW: 'PAYOUTS_VIEW', PAY: 'PAYOUTS_PAY' } as const;
export const PAYOUTS_ACCESS = [PAYOUT_PERMISSIONS.VIEW, PAYOUT_PERMISSIONS.PAY];

export const PAYOUT_TABS: { value: PayoutTab; label: string }[] = [
  { value: 'to_pay', label: 'To pay' },
  { value: 'failed', label: 'Failed' },
  { value: 'paid', label: 'Paid' },
  { value: 'all', label: 'All' },
];

export const SOURCE_OPTIONS = [
  { value: 1, label: 'Salaries', source: 'salary' as const },
  { value: 2, label: 'Advances', source: 'advance' as const },
  { value: 3, label: 'Expense claims', source: 'reimbursement' as const },
  { value: 4, label: 'Wallet funds', source: 'wallet_fund' as const },
  { value: 5, label: 'Referral rewards', source: 'referral' as const },
];

export const SOURCE_LABEL = { salary: 'Salary', advance: 'Advance', reimbursement: 'Expense claim', wallet_fund: 'Wallet funds', referral: 'Referral reward' } as const;

/** Sources that need a payment reference when marked paid (everything but salaries). */
export const REFERENCE_REQUIRED = ['advance', 'reimbursement', 'wallet_fund', 'referral'] as const;

export const STATUS_LABEL = { unpaid: 'To pay', paid: 'Paid', failed: 'Failed' } as const;

export const PAYOUTS_ILLUSTRATION = { src: '/vectors/credit.svg', width: 960, height: 660, alt: 'Payouts illustration' };

export const SEARCH_DEBOUNCE_MS = 350;
