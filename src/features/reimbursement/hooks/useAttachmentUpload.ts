'use client';

import { useCallback, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/reimbursement.api';
import type { UploadedFile } from '../types/reimbursement.model';
import { ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from '../constants/reimbursement.constants';

export function useAttachmentUpload(scope: api.UploadScope = 'me', employeeId?: number | null) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      setError('');
      if (!ATTACHMENT_TYPES.includes(file.type)) {
        setError('Attach a PDF, JPG or PNG file');
        return null;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError('The file is larger than 5 MB');
        return null;
      }
      setIsUploading(true);
      try {
        return await api.uploadAttachment(file, scope, employeeId);
      } catch (err) {
        setError(messageOf(err));
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [scope, employeeId]
  );

  return { upload, isUploading, error, clearError: useCallback(() => setError(''), []) };
}
