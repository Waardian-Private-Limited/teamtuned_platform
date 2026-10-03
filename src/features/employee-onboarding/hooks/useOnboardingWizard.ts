'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, messageOf } from '@/lib/api/errors';
import * as api from '../api/employee-onboarding.api';
import type {
  OnboardingDocumentDto,
  OnboardingStateResponseDto,
  SubmitFieldError,
  VaultDocumentDto,
} from '../types/employee-onboarding.dto';

const AUTOSAVE_DELAY_MS = 800;

type SaveOutcome = { ok: boolean; fieldErrors: Record<string, string> };

// A document that needs its number reuses what the employee already typed
// in the matching form field.
const NUMBER_FIELD_FOR_PATTERN: Record<string, string> = {
  aadhaar: 'aadhaar_number',
  pan: 'pan_number',
  uan: 'pf_uan',
  esic: 'esic_ip_number',
  account: 'bank_account_no',
};

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// A pincode fills its sibling city/state fields; IFSC fills bank/branch.
const PINCODE_TARGETS: Record<string, { city: string; state: string }> = {
  current_address_pincode: { city: 'current_address_city', state: 'current_address_state' },
  permanent_address_pincode: { city: 'permanent_address_city', state: 'permanent_address_state' },
};
const ADDRESS_PARTS = ['line1', 'pincode', 'city', 'state'] as const;
const addressKey = (kind: 'current' | 'permanent', part: string) => `${kind}_address_${part}`;

function isFilled(type: string, value: unknown): boolean {
  if (type === 'checkbox') return value === true;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function useOnboardingWizard() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingStateResponseDto | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [documentErrors, setDocumentErrors] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<VaultDocumentDto[]>([]);
  const [documentNumbers, setDocumentNumbers] = useState<Record<string, string>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [onDocumentsPage, setOnDocumentsPage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingKeys, setUploadingKeys] = useState<Record<string, boolean>>({});

  const [sameAsCurrent, setSameAsCurrentState] = useState(false);
  const [fetching, setFetching] = useState<Record<string, boolean>>({});
  const lastLookup = useRef<Record<string, string>>({});
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const statusRef = useRef<string | undefined>(undefined);
  statusRef.current = state?.status;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async (showLoader: boolean) => {
    if (showLoader) setLoading(true);
    setLoadError(null);
    try {
      const [stateDto, docsDto] = await Promise.all([api.getMyState(), api.listDocuments()]);
      setState(stateDto);
      const seeded: Record<string, unknown> = {};
      for (const step of stateDto.config.steps) {
        for (const field of step.fields) {
          if (field.value !== undefined && field.value !== null) seeded[field.key] = field.value;
        }
      }
      setValues(seeded);
      setSameAsCurrentState(
        ADDRESS_PARTS.every((p) => seeded[addressKey('current', p)] && seeded[addressKey('current', p)] === seeded[addressKey('permanent', p)])
      );
      setDocuments(docsDto.documents);
      if (stateDto.status === 'changes_requested' && (showLoader || statusRef.current !== 'changes_requested')) {
        const flagged = Object.keys(stateDto.remarks ?? {});
        const firstStep = stateDto.config.steps.findIndex((st) => st.fields.some((f) => flagged.includes(`field:${f.key}`)));
        if (firstStep >= 0) setCurrentStepIndex(firstStep);
        else if (docsDto.documents.some((d) => d.status === 'rejected')) setOnDocumentsPage(true);
      }
      return stateDto.status;
    } catch (e) {
      if (showLoader) setLoadError(messageOf(e));
      else throw e;
      return undefined;
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const load = useCallback(() => fetchAll(true), [fetchAll]);

  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const checkStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    try {
      return await fetchAll(false);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [fetchAll]);

  useEffect(() => {
    load();
  }, [load]);

  const inFlightSaveRef = useRef<Promise<SaveOutcome> | null>(null);

  // Waits for any save already in flight before sending, so a flush right
  // before Next or Submit always carries the latest values.
  const saveDraft = useCallback(async (): Promise<SaveOutcome> => {
    while (inFlightSaveRef.current) await inFlightSaveRef.current;
    if (statusRef.current && statusRef.current !== 'draft' && statusRef.current !== 'changes_requested') {
      return { ok: true, fieldErrors: {} };
    }
    const run = (async (): Promise<SaveOutcome> => {
      setIsSaving(true);
      try {
        const res = await api.patchDraft(valuesRef.current);
        setFieldErrors(res.field_errors);
        setState((s) => (s ? { ...s, progress: res.progress } : s));
        return { ok: true, fieldErrors: res.field_errors };
      } catch {
        return { ok: false, fieldErrors: {} };
      } finally {
        setIsSaving(false);
      }
    })();
    inFlightSaveRef.current = run;
    try {
      return await run;
    } finally {
      inFlightSaveRef.current = null;
    }
  }, []);

  const flushDraft = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    return saveDraft();
  }, [saveDraft]);

  const setPlainValue = useCallback(
    (key: string, value: unknown) => {
      setValues((v) => ({ ...v, [key]: value }));
      setFieldErrors((e) => {
        if (!(key in e)) return e;
        const next = { ...e };
        delete next[key];
        return next;
      });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveDraft();
      }, AUTOSAVE_DELAY_MS);
    },
    [saveDraft]
  );

  const steps = state?.config.steps ?? [];
  const hasField = useCallback((key: string) => steps.some((s) => s.fields.some((f) => f.key === key)), [steps]);

  const setFieldError = (key: string, message: string) => setFieldErrors((e) => ({ ...e, [key]: message }));
  const startFetch = (key: string, token: string) => {
    lastLookup.current[key] = token;
    setFetching((f) => ({ ...f, [key]: true }));
  };
  const endFetch = (key: string) => setFetching((f) => ({ ...f, [key]: false }));

  // Mirrors a current-address edit onto permanent while "same as current" is on.
  const mirror = useCallback(
    (key: string, value: unknown) => {
      if (sameAsCurrent && key.startsWith('current_address_')) {
        setPlainValue(key.replace('current_', 'permanent_'), value);
      }
    },
    [sameAsCurrent, setPlainValue]
  );

  const setValue = useCallback(
    (key: string, value: unknown) => {
      setPlainValue(key, value);
      mirror(key, value);

      const pin = PINCODE_TARGETS[key];
      if (pin && typeof value === 'string' && /^\d{6}$/.test(value)) {
        startFetch(key, value);
        api
          .lookupPincode(value)
          .then((place) => {
            if (lastLookup.current[key] !== value || !place) return;
            for (const [target, v] of [[pin.city, place.city], [pin.state, place.state]] as const) {
              if (!v || !hasField(target)) continue;
              setPlainValue(target, v);
              mirror(target, v);
            }
          })
          .catch(() => {})
          .finally(() => lastLookup.current[key] === value && endFetch(key));
      }

      if (key === 'ifsc_code' && typeof value === 'string') {
        const code = value.replace(/\s+/g, '').toUpperCase();
        if (IFSC_RE.test(code)) {
          startFetch(key, code);
          api
            .lookupIfsc(code)
            .then((dto) => {
              if (lastLookup.current[key] !== code) return;
              if (dto.bank && hasField('bank_name')) setPlainValue('bank_name', dto.bank);
              if (dto.branch && hasField('branch_name')) setPlainValue('branch_name', dto.branch);
            })
            .catch((e) => lastLookup.current[key] === code && setFieldError(key, messageOf(e)))
            .finally(() => lastLookup.current[key] === code && endFetch(key));
        } else {
          lastLookup.current[key] = '';
          endFetch(key);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setPlainValue, mirror, hasField]
  );

  const setSameAsCurrent = useCallback(
    (on: boolean) => {
      setSameAsCurrentState(on);
      if (!on) return;
      for (const part of ADDRESS_PARTS) {
        const v = valuesRef.current[addressKey('current', part)];
        if (v !== undefined) setPlainValue(addressKey('permanent', part), v);
      }
    },
    [setPlainValue]
  );

  const stepIndexForField = useCallback(
    (key: string) => steps.findIndex((s) => s.fields.some((f) => f.key === key)),
    [steps]
  );

  const goToStep = useCallback(
    async (index: number) => {
      await flushDraft();
      setOnDocumentsPage(false);
      setCurrentStepIndex(Math.max(0, Math.min(index, steps.length - 1)));
    },
    [flushDraft, steps.length]
  );

  const nextStep = useCallback(async () => {
    const step = steps[currentStepIndex];
    const missing: Record<string, string> = {};
    for (const f of step?.fields ?? []) {
      if (f.required && f.type !== 'file' && !isFilled(f.type, valuesRef.current[f.key])) {
        missing[f.key] = `${f.label} is required`;
      }
    }
    if (Object.keys(missing).length) {
      setFieldErrors((e) => ({ ...e, ...missing }));
      return;
    }
    await flushDraft();
    if (currentStepIndex >= steps.length - 1) {
      setOnDocumentsPage(true);
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  }, [flushDraft, currentStepIndex, steps]);

  const previousStep = useCallback(async () => {
    await flushDraft();
    if (onDocumentsPage) {
      setOnDocumentsPage(false);
    } else if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [flushDraft, onDocumentsPage, currentStepIndex]);

  const uploadDocument = useCallback(
    async (docKey: string, side: string, file: File, number?: string) => {
      const progressKey = `${docKey}:${side}`;
      setUploadingKeys((k) => ({ ...k, [progressKey]: true }));
      setUploadProgress((p) => ({ ...p, [progressKey]: 0 }));
      setDocumentErrors((e) => {
        const next = { ...e };
        delete next[docKey];
        return next;
      });
      try {
        const doc = await api.uploadDocument({ docType: docKey, side, number, file });
        setDocuments((docs) => [...docs.filter((d) => !(d.doc_type_key === docKey && d.side === side)), doc]);
        return true;
      } catch (e) {
        setDocumentErrors((err) => ({ ...err, [docKey]: messageOf(e) }));
        return false;
      } finally {
        setUploadingKeys((k) => {
          const next = { ...k };
          delete next[progressKey];
          return next;
        });
      }
    },
    []
  );

  const remarks = state?.status === 'changes_requested' ? state.remarks ?? {} : {};
  const reviewRestricted = Object.keys(remarks).some((k) => k.startsWith('field:') || k.startsWith('doc:'));
  const flagNoteFor = (key: string): string | undefined => remarks[`field:${key}`];
  const canEditField = (key: string) => !reviewRestricted || flagNoteFor(key) !== undefined;
  const canUploadDocument = (docKey: string, side: string) =>
    !reviewRestricted || documents.some((d) => d.doc_type_key === docKey && d.side === side && d.status === 'rejected');
  const remarkLabel = (key: string): string | null => {
    if (!key.startsWith('field:')) return null;
    const fieldKey = key.slice('field:'.length);
    for (const s of state?.config.steps ?? []) {
      const f = s.fields.find((x) => x.key === fieldKey);
      if (f) return f.label;
    }
    return null;
  };

  const documentNumberFor = useCallback(
    (doc: OnboardingDocumentDto) => {
      if (doc.key in documentNumbers) return documentNumbers[doc.key];
      const field = NUMBER_FIELD_FOR_PATTERN[doc.numberPattern];
      const value = field ? values[field] : undefined;
      return value === undefined || value === null ? '' : String(value);
    },
    [documentNumbers, values]
  );

  const setDocumentNumber = useCallback((docKey: string, value: string) => {
    setDocumentNumbers((n) => ({ ...n, [docKey]: value }));
    setDocumentErrors((e) => {
      if (!(docKey in e)) return e;
      const next = { ...e };
      delete next[docKey];
      return next;
    });
  }, []);

  const removeDocument = useCallback(async (id: number) => {
    try {
      await api.deleteDocument(id);
      setDocuments((docs) => docs.filter((d) => d.id !== id));
    } catch {
      // leave the document listed; the user can retry the removal
    }
  }, []);

  const submit = useCallback(async () => {
    const missingDocs: Record<string, string> = {};
    for (const d of state?.config.documents ?? []) {
      const rejected = documents.find((x) => x.doc_type_key === d.key && x.status === 'rejected');
      if (rejected) {
        missingDocs[d.key] = `${d.label} was rejected${rejected.remarks ? `: ${rejected.remarks}` : ''}. Upload it again.`;
        continue;
      }
      if (!d.required) continue;
      const has = (side: string) => documents.some((x) => x.doc_type_key === d.key && x.side === side && x.status !== 'rejected');
      if (!has('front')) missingDocs[d.key] = `${d.label} is required`;
      else if (d.sides === 2 && !has('back')) missingDocs[d.key] = `${d.label}: back side is required`;
    }
    if (Object.keys(missingDocs).length) {
      setDocumentErrors(missingDocs);
      return false;
    }
    const saved = await flushDraft();
    if (!saved.ok || Object.keys(saved.fieldErrors).length) {
      setSubmitError(
        saved.ok ? 'Fix the highlighted fields before submitting.' : 'Your changes could not be saved yet. Check your connection and try again.'
      );
      const firstStep = Object.keys(saved.fieldErrors)
        .map(stepIndexForField)
        .filter((i): i is number => i !== null && i !== undefined && i >= 0)
        .sort((a, b) => a - b)[0];
      if (firstStep !== undefined) {
        setOnDocumentsPage(false);
        setCurrentStepIndex(firstStep);
      }
      return false;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await api.submit();
      await load();
      return true;
    } catch (e) {
      setSubmitError(messageOf(e));
      const data = e instanceof ApiError ? (e.data as { fields?: SubmitFieldError[] } | null) : null;
      const fields = data?.fields;
      if (Array.isArray(fields)) {
        const nextFieldErrors: Record<string, string> = {};
        const nextDocumentErrors: Record<string, string> = {};
        for (const entry of fields) {
          if (entry.field.startsWith('documents.')) {
            nextDocumentErrors[entry.field.slice('documents.'.length)] = entry.message;
          } else {
            nextFieldErrors[entry.field] = entry.message;
          }
        }
        setFieldErrors(nextFieldErrors);
        setDocumentErrors(nextDocumentErrors);
        setOnDocumentsPage(false);
        const indices = Object.keys(nextFieldErrors).map(stepIndexForField).filter((i) => i >= 0);
        if (indices.length) setCurrentStepIndex(Math.min(...indices));
        else if (Object.keys(nextDocumentErrors).length) setOnDocumentsPage(true);
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [flushDraft, load, stepIndexForField, state, documents]);

  return {
    loading,
    loadError,
    state,
    values,
    fieldErrors,
    documentErrors,
    documents,
    steps,
    currentStepIndex,
    onDocumentsPage,
    isSaving,
    isSubmitting,
    submitError,
    uploadProgress,
    uploadingKeys,
    setValue,
    sameAsCurrent,
    setSameAsCurrent,
    fetching,
    flushDraft,
    goToStep,
    nextStep,
    previousStep,
    uploadDocument,
    documentNumberFor,
    setDocumentNumber,
    removeDocument,
    submit,
    retryLoad: load,
    reviewRestricted,
    flagNoteFor,
    canEditField,
    canUploadDocument,
    remarkLabel,
    hasRejectedDocuments: documents.some((d) => d.status === 'rejected'),
    openDocuments: async () => {
      await flushDraft();
      setOnDocumentsPage(true);
    },
    checkStatus,
    isCheckingStatus,
  };
}
