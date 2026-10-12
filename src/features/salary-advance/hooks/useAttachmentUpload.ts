'use client';

import { useCallback, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/salaryAdvance.api';
import type { UploadedFile } from '../types/salaryAdvance.model';
import { ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from '../constants/salaryAdvance.constants';

export function useAttachmentUpload(scope: api.UploadScope = 'me') {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = useCallback(async (file: File): Promise<UploadedFile | null> => {
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
      return await api.uploadAttachment(file, scope);
    } catch (err) {
      setError(messageOf(err));
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [scope]);

  return { upload, isUploading, error, clearError: useCallback(() => setError(''), []) };
}
