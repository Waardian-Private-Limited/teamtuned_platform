'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/onboarding-review.api';
import type { ReviewDocumentDto, SubmissionDetailDto } from '../types/onboarding-review.dto';

export type ReviewNotes = Record<string, string>;

export function useSubmissionReview(employeeId: number) {
  const [detail, setDetail] = useState<SubmissionDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<ReviewNotes>({});
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.getSubmission(employeeId);
      setDetail(d);
      setSelectedDocId((current) => current ?? d.documents[0]?.id ?? null);
    } catch (e) {
      showError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const documentLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const d of detail?.config.documents ?? []) labels[d.key] = d.label;
    return labels;
  }, [detail]);

  const labelFor = useCallback(
    (doc: ReviewDocumentDto) => {
      const base = documentLabels[doc.doc_type_key] ?? doc.doc_type_key;
      const twoSided = detail?.config.documents.find((d) => d.key === doc.doc_type_key)?.sides === 2;
      return twoSided ? `${base} · ${doc.side === 'back' ? 'Back' : 'Front'}` : base;
    },
    [documentLabels, detail]
  );

  const previewUrlFor = useCallback(
    async (docId: number) => {
      if (previewUrls[docId]) return previewUrls[docId];
      const { url } = await api.getDocumentUrl(employeeId, docId);
      setPreviewUrls((p) => ({ ...p, [docId]: url }));
      return url;
    },
    [employeeId, previewUrls]
  );

  const refreshPreviewUrl = useCallback(
    async (docId: number) => {
      const { url } = await api.getDocumentUrl(employeeId, docId);
      setPreviewUrls((p) => ({ ...p, [docId]: url }));
      return url;
    },
    [employeeId]
  );

  const verifyDocument = useCallback(
    async (docId: number, status: 'verified' | 'rejected', reason?: string) => {
      try {
        const remarks = status === 'rejected' ? reason?.trim() || null : null;
        await api.verifyDocument(employeeId, docId, status, remarks ?? undefined);
        setDetail((d) =>
          d ? { ...d, documents: d.documents.map((doc) => (doc.id === docId ? { ...doc, status, remarks } : doc)) } : d
        );
        if (detail) {
          const next = detail.documents.find((doc) => doc.id !== docId && doc.status !== 'verified' && doc.status !== 'rejected');
          if (next) setSelectedDocId(next.id);
        }
      } catch (e) {
        showError(messageOf(e));
      }
    },
    [employeeId, detail]
  );

  const setNote = useCallback((key: string, value: string) => {
    setNotes((n) => {
      const next = { ...n };
      if (value.trim()) next[key] = value;
      else delete next[key];
      return next;
    });
  }, []);

  const rejectedDocNotes = useMemo(() => {
    const out: ReviewNotes = {};
    for (const doc of detail?.documents ?? []) {
      if (doc.status !== 'rejected') continue;
      out[`doc:${doc.id}`] = doc.remarks
        ? `${labelFor(doc)}: ${doc.remarks}. Please upload it again.`
        : `${labelFor(doc)} needs to be uploaded again.`;
    }
    return out;
  }, [detail, labelFor]);

  const allNotes = useMemo(() => {

    const out: ReviewNotes = { ...rejectedDocNotes };
    for (const [key, value] of Object.entries(notes)) {
      const text = value.trim();
      if (!text) continue;
      out[key] = text;
    }
    return out;
  }, [detail, rejectedDocNotes, notes]);

  const approve = useCallback(async () => {
    setBusy(true);
    try {
      await api.approve(employeeId);
      showSuccess('Onboarding approved');
      await load();
      return true;
    } catch (e) {
      showError(messageOf(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, [employeeId, load]);

  const requestChanges = useCallback(async () => {
    if (!Object.keys(allNotes).length) return false;
    setBusy(true);
    try {
      await api.requestChanges(employeeId, allNotes);
      showSuccess('Changes requested');
      setNotes({});
      await load();
      return true;
    } catch (e) {
      showError(messageOf(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, [employeeId, allNotes, load]);

  const noteLabel = useCallback(
    (key: string) => {
      if (!key.startsWith('field:')) return null;
      const fieldKey = key.slice('field:'.length);
      for (const step of detail?.config.steps ?? []) {
        const field = step.fields.find((f) => f.key === fieldKey);
        if (field) return field.label;
      }
      return fieldKey;
    },
    [detail]
  );

  const documents = detail?.documents ?? [];
  const counts = {
    total: documents.length,
    verified: documents.filter((d) => d.status === 'verified').length,
    rejected: documents.filter((d) => d.status === 'rejected').length,
  };

  return {
    detail,
    loading,
    busy,
    notes,
    allNotes,
    setNote,
    noteLabel,
    selectedDocId,
    setSelectedDocId,
    labelFor,
    previewUrlFor,
    refreshPreviewUrl,
    verifyDocument,
    approve,
    requestChanges,
    counts,
  };
}
