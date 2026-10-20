'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { toTaxProofDocument } from '@/features/payroll-setup/types/payroll-setup.mapper';
import type { TaxProofDocument, TaxProofSection } from '@/features/payroll-setup/types/payroll-setup.model';
import { openFileLink } from '@/features/payroll-setup/utils/openFile';
import * as api from '../api/myTax.api';
import { MAX_PROOF_BYTES } from '../utils/format';

function uploadMessage(err: unknown): string {
  if ((err as { code?: string })?.code === 'VAULT_STORAGE_NOT_CONFIGURED') return "File storage isn't set up yet. Ask payroll.";
  return messageOf(err);
}

/**
 * The employee's Form 12BB proof files, grouped by what they prove. Errors are kept per
 * section so a failed upload shows under the amount it belongs to.
 */
export function useMyProofs(financialYear: string | null) {
  const [documents, setDocuments] = useState<TaxProofDocument[]>([]);
  // Section being uploaded to, or `doc:<id>` being removed/opened.
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<TaxProofSection, string>>>({});

  useEffect(() => {
    if (!financialYear) return;
    let cancelled = false;
    api
      .listMyProofs(financialYear)
      .then((dto) => !cancelled && setDocuments((dto.documents || []).map(toTaxProofDocument)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [financialYear]);

  const setError = (section: TaxProofSection, message: string) => setErrors((prev) => ({ ...prev, [section]: message }));

  const upload = useCallback(async (section: TaxProofSection, file: File) => {
    setErrors((prev) => ({ ...prev, [section]: undefined }));
    if (file.size > MAX_PROOF_BYTES) {
      setError(section, 'File is larger than 5 MB');
      return;
    }
    setBusy(section);
    try {
      const dto = await api.uploadMyProof(section, file, financialYear || undefined);
      setDocuments((prev) => [...prev, toTaxProofDocument(dto)]);
    } catch (err) {
      setError(section, uploadMessage(err));
    } finally {
      setBusy(null);
    }
  }, [financialYear]);

  const remove = useCallback(async (doc: TaxProofDocument) => {
    setBusy(`doc:${doc.id}`);
    try {
      await api.deleteMyProof(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      setError(doc.section, messageOf(err));
    } finally {
      setBusy(null);
    }
  }, []);

  const open = useCallback(async (doc: TaxProofDocument) => {
    const message = await openFileLink(() => api.getMyProofUrl(doc.id));
    if (message) setError(doc.section, message);
  }, []);

  const of = useCallback((section: TaxProofSection) => documents.filter((d) => d.section === section), [documents]);

  return { of, upload, remove, open, busy, errors };
}

export type MyProofs = ReturnType<typeof useMyProofs>;
