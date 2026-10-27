'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ComplianceGapsList } from './ComplianceGapsList';
import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Drawer } from '@/components/ui/Drawer';
import * as api from '../../api/labour.api';
import { useCatalog, useContractorOptions, useLabourSettings, useLabourSites } from '../../hooks/useLabourLists';
import { messageOf } from '@/lib/api/errors';
import { FormError, primaryBtn, secondaryBtn } from '../shared/Primitives';
import { EMPTY_SHOTS, type Shots } from './wizard/FaceCapture';
import { ReviewStep } from './wizard/Review';
import { AddressStep, BasicStep, CompliancePackStep, DocumentsStep, FaceStep, IdentityStep } from './wizard/Steps';
import { blankForm, formFrom, isMove, stepOfField, validate, validatePack, type PendingDoc, type StepId, type WizardForm } from './wizard/wizard.types';
import { useWizardSubmit, type SubmitResult } from './wizard/useWizardSubmit';
import { useCompliancePack } from '../../hooks/useCompliancePack';
import type { LabourerDetail } from '../../types/labour.types';
import { PaySuggestion } from './wizard/PaySuggestion';

const LABEL: Record<StepId, string> = { basic: 'Basic', address: 'Address', identity: 'Identity', face: 'Face', documents: 'Documents', compliance: 'Compliance details', review: 'Review' };

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (id: number) => void;
  /** Open an edit straight at a step, e.g. 'compliance' to fill what the site's forms still need. */
  startAt?: StepId;
  /** Existing labourer to edit; null creates. */
  editId?: number | null;
  onOpenExisting?: (id: number) => void;
}

export function LabourerWizard({ open, onClose, onSaved, editId = null, onOpenExisting, startAt }: Props) {
  return <Drawer open={open} onClose={onClose} title={editId ? 'Edit labourer' : 'Add labourer'} maxWidthClassName="sm:max-w-3xl">{open && <Body key={editId ?? 'new'} onClose={onClose} onSaved={onSaved} editId={editId} onOpenExisting={onOpenExisting} startAt={startAt} />}</Drawer>;
}

function Body({ onClose, onSaved, editId = null, onOpenExisting, startAt }: Omit<Props, 'open'>) {
  const editing = Boolean(editId);
  const settings = useLabourSettings();
  const { sites } = useLabourSites();
  const contractors = useContractorOptions();
  const { categories } = useCatalog();
  const [form, setForm] = useState<WizardForm>(blankForm);
  const [detail, setDetail] = useState<LabourerDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [shots, setShots] = useState<Shots>(EMPTY_SHOTS);
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [step, setStep] = useState<StepId>('basic');
  const [done, setDone] = useState<SubmitResult | null>(null);
  const submit = useWizardSubmit();
  // Filling what a site's forms need works even with advanced onboarding off.
  const pack = useCompliancePack(settings?.advancedOnboarding === true || startAt === 'compliance' || Boolean(detail?.complianceGaps), form.siteId);

  useEffect(() => {
    if (!editId) return;
    api.getLabourer(editId).then((d) => { setDetail(d); setForm(formFrom(d)); }).catch((e) => setLoadError(messageOf(e)));
  }, [editId]);

  useEffect(() => { setForm((f) => (f.packId === (pack?.id ?? null) ? f : { ...f, packId: pack?.id ?? null, profile: !editId && f.packId !== null ? {} : f.profile })); }, [pack, editId]);

  const steps = useMemo<StepId[]>(() => ['basic', 'address', 'identity', 'face', 'documents', ...(pack ? (['compliance'] as StepId[]) : []), 'review'], [pack]);
  const idx = steps.indexOf(step);
  const started = React.useRef(false);
  useEffect(() => {
    if (started.current || !startAt || (editing && !detail) || !steps.includes(startAt)) return;
    started.current = true;
    setStep(startAt);
  }, [startAt, steps, editing, detail]);
  const set = (p: Partial<WizardForm>) => setForm((f) => ({ ...f, ...p }));

  const goNext = () => {
    const errs = validate(form);
    const first = Object.keys(errs).find((k) => steps.indexOf(stepOfField(k)) <= idx);
    if (first) {
      submit.setErrors(errs);
      setStep(stepOfField(first));
      return;
    }
    if (step === 'compliance') {
      const pe = validatePack(pack, form.profile);
      if (Object.keys(pe).length) { submit.setErrors(pe); return; }
    }
    setStep(steps[Math.min(idx + 1, steps.length - 1)]);
  };

  const save = async () => {
    const errs = { ...validate(form), ...validatePack(pack, form.profile) };
    const photos = Object.values(shots).filter(Boolean).length;
    if (Object.keys(errs).length) {
      submit.setErrors(errs);
      setStep(stepOfField(Object.keys(errs)[0]));
      return;
    }
    if (photos > 0 && photos < 3) { setStep('face'); return; }
    const r = await submit.run({ editId, form, shots, docs, original: detail });
    if (r.result) setDone(r.result);
    else if (r.jumpTo) setStep(r.jumpTo);
  };

  if (loadError) return <FormError message={loadError} />;
  if (editing && !detail) return <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;

  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--tt-primary)] text-[var(--tt-on-primary)]"><Check className="h-6 w-6" aria-hidden /></span>
        <h3 className="text-base font-bold text-fg">{editing ? 'Labourer updated' : `Labourer added${done.code ? ` (${done.code})` : ''}`}</h3>
        {done.faceStatus === 'pending' && <p className="mt-2 text-sm text-fg-muted">The face photos are saved. Registration will finish automatically in a few minutes — nothing more to do.</p>}
        {done.faceStatus === 'enrolled' && <p className="mt-2 text-sm text-fg-muted">The face is registered and ready for punching.</p>}
        {done.faceStatus === 'none' && <p className="mt-2 text-sm text-fg-muted">No face was registered. You can add it any time by editing the labourer.</p>}
        {done.gaps && done.gaps.missing.length > 0 && (
          <div className="mt-4 w-full text-left"><ComplianceGapsList gaps={done.gaps} /></div>
        )}
        <div className="mt-5 flex gap-2">
          {done.gaps && done.gaps.missing.length > 0 && pack && <button type="button" className={secondaryBtn} onClick={() => { const id = done.id; setDone(null); onSaved(id); setStep('compliance'); api.getLabourer(id).then(setDetail).catch(() => {}); }}>Fill now</button>}
          <button type="button" className={primaryBtn} onClick={() => { onSaved(done.id); onClose(); }}>{done.gaps && done.gaps.missing.length > 0 ? 'Later' : 'Done'}</button>
        </div>
      </div>
    );
  }

  const errors = submit.errors;
  const moving = editing && isMove(form, detail);
  const common = { form, set, errors, clear: submit.clear };
  const cat = categories.find((c) => c.id === form.categoryId);
  const payHint = form.contractorId && form.siteId ? (
    <PaySuggestion contractorId={form.contractorId} siteId={form.siteId} categoryId={form.categoryId} subcategoryId={form.subcategoryId} labourerId={editId}
      contractorName={contractors.find((c) => c.value === form.contractorId)?.label} tradeName={cat?.subcategories.find((s) => s.id === form.subcategoryId)?.name || cat?.name} />
  ) : null;
  const faceExisting = detail ? (detail.faceStatus === 'enrolled' ? 'A face is already registered. New photos replace it.' : detail.faceStatus === 'pending' ? 'Face registration is pending and will finish automatically.' : detail.faceStatus === 'failed' ? 'The last face registration failed. Take new photos.' : '') : '';

  return (
    <div className="flex min-h-full flex-col gap-5">
      <ol className="flex gap-1.5 overflow-x-auto tt-scroll-hidden" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s} className="shrink-0">
            <button type="button" onClick={() => i <= idx && setStep(s)} disabled={i > idx} aria-current={s === step ? 'step' : undefined}
              className={cx('flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold', s === step ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : i < idx ? 'border-line bg-bg-subtle text-fg' : 'border-line text-fg-subtle')}>
              <span className="tabular-nums">{i + 1}</span>{LABEL[s]}
            </button>
          </li>
        ))}
      </ol>
      {submit.savedCode && !editing && <p className="text-xs text-fg-muted">Saved as {submit.savedCode}. Fix what is marked and save again to finish the rest.</p>}

      <div className="flex-1">
        {step === 'basic' && <BasicStep {...common} sites={sites} contractors={contractors} categories={categories} lockContractor={false} move={moving ? { maxBackDays: settings?.regularization.maxBackDays ?? 31 } : null} payHint={payHint} />}
        {step === 'address' && <AddressStep {...common} />}
        {step === 'identity' && <IdentityStep {...common} editing={editing} masked={detail?.aadhaarMasked} existingId={submit.existingId} onOpenExisting={onOpenExisting} />}
        {step === 'face' && <FaceStep shots={shots} onChange={(p, f) => { setShots((s) => ({ ...s, [p]: f })); }} issues={submit.faceIssues} existing={faceExisting} />}
        {step === 'documents' && <DocumentsStep docs={docs} setDocs={setDocs} errors={errors} />}
        {step === 'compliance' && pack && <CompliancePackStep pack={pack} profile={form.profile} onChange={(profile) => set({ profile })} errors={errors} clear={submit.clear} />}
        {step === 'review' && <ReviewStep form={form} sites={sites} contractors={contractors} categories={categories} shots={shots} docs={docs} editing={editing} moving={moving} />}
      </div>

      <FormError message={submit.formError} />
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-2 border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:px-6">
        <button type="button" className={secondaryBtn} onClick={idx === 0 ? onClose : () => setStep(steps[idx - 1])}>{idx === 0 ? 'Cancel' : 'Back'}</button>
        {step === 'review' ? (
          <button type="button" className={primaryBtn} disabled={submit.busy} onClick={save}>{submit.busy ? 'Saving…' : editing ? 'Save changes' : 'Save labourer'}</button>
        ) : (
          <button type="button" className={primaryBtn} onClick={goNext}>Next</button>
        )}
      </div>
    </div>
  );
}
