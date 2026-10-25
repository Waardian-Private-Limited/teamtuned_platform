import { storedFiles } from '@/features/expense-bills/components/ReceiptViewer';
import type { ReceiptFile, ReceiptSource } from '@/features/expense-bills/hooks/useFileLink';
import type { LineAttachment } from '@/features/expense-bills/types/bill.model';
import * as api from '../api/reimbursement.api';

type Where = { scope: 'me' | 'hr'; claimId: number; lineId: number; payment?: boolean };

const prefixOf = (w: Where) => `claim:${w.scope}:${w.claimId}:${w.lineId}:${w.payment ? 'proof' : 'bill'}`;
const linkOf = (w: Where) => (index: number) => api.claimFileUrl(w.scope, w.claimId, { lineId: w.lineId, index, payment: w.payment });

/** Stored files of a claim line (`payment`: its payment proofs), shown through the presigned file links. */
export function claimLineFiles(files: Array<Pick<LineAttachment, 'index' | 'name' | 'size' | 'type'>>, where: Where): ReceiptFile[] {
  return storedFiles(files, prefixOf(where), linkOf(where));
}

/** One stored file of a claim line as a viewer source. */
export function claimLineSource(where: Where, index: number): ReceiptSource {
  return { kind: 'remote', key: `${prefixOf(where)}:${index}`, load: () => linkOf(where)(index) };
}
