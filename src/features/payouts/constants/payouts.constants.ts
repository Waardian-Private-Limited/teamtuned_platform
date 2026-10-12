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
];

export const STATUS_LABEL = { unpaid: 'To pay', paid: 'Paid', failed: 'Failed' } as const;

export const PAYOUTS_ILLUSTRATION = { src: '/vectors/credit.svg', width: 960, height: 660, alt: 'Payouts illustration' };

export const SEARCH_DEBOUNCE_MS = 350;
