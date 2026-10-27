'use client';

import { useRef, useState } from 'react';
import * as api from '../../../api/labour.api';
import { FACE_POSES, type FacePose } from '../../../constants/labour.constants';
import { parseLabourError, placeError } from '../../../utils/errors';
import type { Shots } from './FaceCapture';
import type { ComplianceGaps, Labourer } from '../../../types/labour.types';
import { bodyFrom, isMove, stepOfField, type PendingDoc, type StepId, type WizardForm } from './wizard.types';

export interface SubmitResult { id: number; code: string | null; faceStatus: 'enrolled' | 'pending' | 'none'; gaps?: ComplianceGaps | null }

interface Args {
  editId: number | null;
  form: WizardForm;
  shots: Shots;
  docs: PendingDoc[];
  /** The labourer as loaded, when editing (to tell a move and send cleared fields as null). */
  original?: Labourer | null;
}

/**
 * Saves in the order the API needs: labourer first, then face, then documents. Each part is remembered once
 * it succeeds, so pressing Save again after a failure only repeats the part that failed.
 */
export function useWizardSubmit() {
  const created = useRef<{ id: number; code: string | null } | null>(null);
  const faceDone = useRef<SubmitResult['faceStatus'] | null>(null);
  const docsDone = useRef(new Set<string>());
  const gaps = useRef<ComplianceGaps | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [faceIssues, setFaceIssues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [existingId, setExistingId] = useState<number | null>(null);
  const [savedCode, setSavedCode] = useState<string | null>(null);

  const clear = (k: string) => setErrors((e) => (e[k] ? { ...e, [k]: '' } : e));

  /** Pack field messages from `details.errors{key:message}` go under their fields on the Compliance step. */
  function failPack(fieldErrors: Record<string, string>): { jumpTo: StepId } {
    setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [`profile.${k}`, v])));
    return { jumpTo: 'compliance' };
  }

  async function run({ editId, form, shots, docs, original }: Args): Promise<{ result?: SubmitResult; jumpTo?: StepId }> {
    setBusy(true);
    setErrors({});
    setFaceIssues({});
    setFormError('');
    setExistingId(null);
    try {
      const id0 = editId ?? created.current?.id ?? null;
      if (!created.current && !editId) {
        try {
          const r = await api.createLabourer(bodyFrom(form));
          created.current = { id: r.id, code: r.code };
          setSavedCode(r.code);
        } catch (err) {
          const p = placeError(err);
          if (Object.keys(p.error.fieldErrors).length) return failPack(p.error.fieldErrors);
          setErrors(p.fields);
          setFormError(p.form);
          const labourerId = p.error.details?.labourerId;
          if (p.error.status === 409 && typeof labourerId === 'number') setExistingId(labourerId);
          return { jumpTo: p.error.field ? stepOfField(p.error.field) : 'basic' };
        }
      } else if (editId) {
        try {
          gaps.current = (await api.updateLabourer(editId, bodyFrom(form, { editing: true, moving: isMove(form, original) }))).complianceGaps ?? null;
        } catch (err) {
          const p = placeError(err);
          if (Object.keys(p.error.fieldErrors).length) return failPack(p.error.fieldErrors);
          setErrors(p.fields);
          setFormError(p.form);
          return { jumpTo: p.error.field ? stepOfField(p.error.field) : 'basic' };
        }
      }
      const id = (editId ?? created.current?.id ?? id0) as number;

      const complete = FACE_POSES.every((p) => shots[p]);
      if (complete && faceDone.current === null) {
        try {
          const r = await api.enrolFace(id, FACE_POSES.map((pose) => ({ pose, file: shots[pose] as File })));
          faceDone.current = r.status;
        } catch (err) {
          const e = parseLabourError(err);
          if (e.perImage.length) {
            const next: Record<string, string> = {};
            e.perImage.forEach((i) => {
              const pose = (i.pose as FacePose | null) ?? FACE_POSES[i.index ?? 0];
              if (pose) next[pose] = i.reason;
            });
            setFaceIssues(next);
          } else {
            setFormError(e.message);
          }
          return { jumpTo: 'face' };
        }
      }

      for (const d of docs) {
        if (!d.file || docsDone.current.has(d.key)) continue;
        try {
          await api.uploadLabourerDoc(id, { docType: d.docType, side: d.side, number: d.number.trim() || undefined, expiryOn: d.expiryOn || undefined }, d.file);
          docsDone.current.add(d.key);
        } catch (err) {
          setErrors({ [`doc:${d.key}`]: parseLabourError(err).message });
          return { jumpTo: 'documents' };
        }
      }
      return { result: { id, code: created.current?.code ?? null, faceStatus: faceDone.current ?? 'none', gaps: gaps.current } };
    } finally {
      setBusy(false);
    }
  }

  return { run, busy, errors, setErrors, clear, faceIssues, formError, existingId, savedCode };
}
