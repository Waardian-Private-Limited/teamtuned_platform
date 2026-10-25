'use client';

import { useCallback, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from '../constants/bill.constants';
import type { UploadedFile } from '../types/bill.model';

/** Checks one file, then stores it with `store` (the feature's attachment endpoint). */
export function useAttachmentUpload(store: (file: File) => Promise<UploadedFile>) {
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
        return await store(file);
      } catch (err) {
        setError(messageOf(err));
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [store]
  );

  return { upload, isUploading, error, clearError: useCallback(() => setError(''), []) };
}
