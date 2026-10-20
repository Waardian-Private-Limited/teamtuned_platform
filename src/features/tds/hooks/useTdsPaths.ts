'use client';

import { usePathname } from 'next/navigation';

/** The Income Tax (TDS) pages live under both portals; links stay in the one in use. */
export function useTdsPaths() {
  const area = (usePathname() || '').startsWith('/employee') ? '/employee' : '/org-admin';
  const base = `${area}/tds`;
  return {
    overview: base,
    settings: `${base}/settings`,
    declarations: `${base}/declarations`,
    proofs: `${base}/proofs`,
    returns: `${base}/returns`,
    form16: `${base}/form16`,
    deductionRules: `${area}/payroll-setup?tab=debits`,
  };
}
