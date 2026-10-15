'use client';

import { useFeatures } from '@/lib/hooks/useFeatures';
import { EXPENSE_WALLET_FEATURE, REIMBURSEMENT_FEATURE } from '../constants/reimbursement.constants';

export function useExpenseFeatures() {
  const { hasFeature } = useFeatures();
  const claims = hasFeature(REIMBURSEMENT_FEATURE);
  const wallet = hasFeature(EXPENSE_WALLET_FEATURE);
  return { claims, wallet, any: claims || wallet };
}
