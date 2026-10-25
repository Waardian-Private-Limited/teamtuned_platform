'use client';

import { useCallback } from 'react';
import { useBillScan } from '@/features/expense-bills/hooks/useBillScan';
import * as api from '../api/reimbursement.api';

export { scanFileProblem, scanPagesProblem } from '@/features/expense-bills/hooks/useBillScan';

/** Reads one bill (all its pages in one call) through `/receipts/scan`; `hr` files it for `employeeId`. */
export function useReceiptScan(scope: 'me' | 'hr', employeeId: number | null) {
  const read = useCallback((files: File[], signal: AbortSignal) => api.scanReceipt(files, scope, employeeId, signal), [scope, employeeId]);
  return useBillScan(read);
}
