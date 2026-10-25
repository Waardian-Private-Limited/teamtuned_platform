import { storedFiles } from '@/features/expense-bills/components/ReceiptViewer';
import type { ReceiptFile } from '@/features/expense-bills/hooks/useFileLink';
import type { LineAttachment } from '@/features/expense-bills/types/bill.model';
import * as api from '../api/petty-cash.api';

/** The receipts or payment proofs of an expense as viewer files, opened through presigned links. */
export function expenseFiles(scope: 'me' | 'hr', expenseId: number, kind: 'receipt' | 'payment', files: Array<Pick<LineAttachment, 'index' | 'name' | 'size' | 'type'>>): ReceiptFile[] {
  return storedFiles(files, `petty:${scope}:${expenseId}:${kind}`, (index) => api.expenseFileUrl(scope, expenseId, kind, index));
}
