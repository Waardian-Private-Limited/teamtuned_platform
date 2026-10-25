'use client';

import React from 'react';
import { ReceiptPicker as BillReceiptPicker } from '@/features/expense-bills/components/ReceiptPicker';
import type { UploadedFile } from '@/features/expense-bills/types/bill.model';
import * as api from '../../api/reimbursement.api';

type PickerProps = Omit<React.ComponentProps<typeof BillReceiptPicker>, 'store'>;

/** The shared receipt picker storing files through the reimbursement attachment endpoints. */
export function ReceiptPicker({ scope = 'me', employeeId, ...rest }: PickerProps & { scope?: api.UploadScope; employeeId?: number | null }) {
  const store = React.useCallback((file: File): Promise<UploadedFile> => api.uploadAttachment(file, scope, employeeId), [scope, employeeId]);
  return <BillReceiptPicker {...rest} store={store} />;
}
