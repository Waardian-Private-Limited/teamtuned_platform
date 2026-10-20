'use client';

import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toProofQueueEmployee, toTaxProofDocument } from '../types/payroll-setup.mapper';
import type { ProofQueueEmployee, TaxProofDocument, TaxProofStatus } from '../types/payroll-setup.model';
import { messageOf, serverFieldOf } from '../utils/asyncAction';
import { openFileLink } from '../utils/openFile';

/**
 * Form 12BB proofs waiting for payroll: the employee list (pending first), and the files of
 * the one employee opened inline.
 */
export function useProofReview(financialYear: string) {
  const [employees, setEmployees] = useState<ProofQueueEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<TaxProofDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  // Document being changed, so only its buttons wait.
  const [busy, setBusy] = useState<number | null>(null);
  // A message under one document: its reason input ('remarks') or the row itself.
  const [docError, setDocError] = useState<{ id: number; field: 'remarks' | ''; message: string } | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const dto = await api.listProofQueue(financialYear);
      setEmployees((dto.employees || []).map(toProofQueueEmployee));
      setError('');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [financialYear]);

  useEffect(() => {
    setIsLoading(true);
    setOpenId(null);
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    setDocuments([]);
    setDocError(null);
    if (!openId) return;
    let cancelled = false;
    setDocsLoading(true);
    api
      .listEmployeeProofs(openId, financialYear)
      .then((dto) => !cancelled && setDocuments((dto.documents || []).map(toTaxProofDocument)))
      .catch((err) => !cancelled && setDocError({ id: 0, field: '', message: messageOf(err) }))
      .finally(() => !cancelled && setDocsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [openId, financialYear]);

  const toggle = useCallback((employeeId: number) => setOpenId((prev) => (prev === employeeId ? null : employeeId)), []);

  const review = useCallback(async (doc: TaxProofDocument, status: TaxProofStatus, remarks = '') => {
    if (status === 'rejected' && !remarks.trim()) {
      setDocError({ id: doc.id, field: 'remarks', message: 'Say why, so the employee can fix it' });
      return false;
    }
    setBusy(doc.id);
    setDocError(null);
    try {
      await api.reviewProof(doc.id, status, remarks.trim());
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status, remarks: status === 'rejected' ? remarks.trim() : d.remarks } : d)));
      loadQueue();
      return true;
    } catch (err) {
      setDocError({ id: doc.id, field: serverFieldOf(err, ['remarks'] as const) ?? '', message: messageOf(err) });
      return false;
    } finally {
      setBusy(null);
    }
  }, [loadQueue]);

  const open = useCallback(async (doc: TaxProofDocument) => {
    const message = await openFileLink(() => api.getProofUrl(doc.id));
    if (message) setDocError({ id: doc.id, field: '', message });
  }, []);

  return {
    employees, isLoading, error,
    openId, toggle, documents, docsLoading,
    review, open, busy, docError, clearDocError: () => setDocError(null),
  };
}
