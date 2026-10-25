'use client';

import { useCallback } from 'react';
import type { UploadedFile } from '@/features/expense-bills/types/bill.model';
import * as api from '../api/petty-cash.api';

/**
 * A stable function that stores one file through `/me/attachments` or `/attachments`. HR entering an
 * expense for an employee passes `employeeId` so the file goes into that employee's folder.
 */
export function useAttachmentStore(scope: api.UploadScope, employeeId?: number | null): (file: File) => Promise<UploadedFile> {
  return useCallback((file: File) => api.uploadAttachment(file, scope, employeeId), [scope, employeeId]);
}
