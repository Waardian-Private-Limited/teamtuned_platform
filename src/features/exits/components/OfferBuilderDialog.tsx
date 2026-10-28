'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { FieldLabel, FieldMessage, SelectField, TextField, shellClass } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { CHANGE_MODES } from '@/features/salary-revisions/constants/salaryRevisions.constants';
import { inr, pct } from '@/features/compensation/utils/format';
import { addDays, orgToday } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import { OFFER_KIND_LABEL } from '../constants/exits.constants';
import type { HikeMode, HikePreview, OfferInput, OfferKind } from '../types/exits';

const KINDS: OfferKind[] = ['hike', 'retention_bonus', 'hike_and_bonus', 'role_change', 'other'];

/**
 * The counter-offer builder. The hike part reuses the salary revision preview (percent, new CTC or new gross, effective date);
 * the server drafts a `retention` revision and bonus payout from it. Nothing reaches the employee until the offer is sent.
 */
export function OfferBuilderDialog({ open, caseId, onClose, onDone }: { open: boolean; caseId: number; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = React.useState<OfferKind | null>('hike');
  const [mode, setMode] = React.useState<HikeMode>('percent');
  const [value, setValue] = React.useState('');
  const [effective, setEffective] = React.useState(orgToday());
  const [bonus, setBonus] = React.useState('');
  const [bonusMonth, setBonusMonth] = React.useState(orgToday().slice(0, 7));
  const [clawback, setClawback] = React.useState('12');
  const [expires, setExpires] = React.useState(addDays(orgToday(), 3));
  const [note, setNote] = React.useState('');
  const [preview, setPreview] = React.useState<HikePreview | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<'draft' | 'send' | null>(null);

  const hasHike = kind === 'hike' || kind === 'hike_and_bonus';
  const hasBonus = kind === 'retention_bonus' || kind === 'hike_and_bonus';

  React.useEffect(() => {
    if (!open) return;
    setKind('hike'); setMode('percent'); setValue(''); setEffective(orgToday()); setBonus(''); setBonusMonth(orgToday().slice(0, 7));
    setClawback('12'); setExpires(addDays(orgToday(), 3)); setNote(''); setPreview(null); setErrors({});
  }, [open]);

  React.useEffect(() => {
    if (!open || !hasHike || value === '' || !Number.isFinite(Number(value)) || !effective) { setPreview(null); return; }
    let live = true;
    const t = setTimeout(() => {
      api.previewOffer(caseId, { mode, value: Number(value), effective_from: effective })
        .then((p) => { if (live) { setPreview(p); setErrors((e) => ({ ...e, value: '' })); } })
        .catch((e) => { if (live) { setPreview(null); setErrors((x) => ({ ...x, value: messageOf(e) })); } });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [open, hasHike, caseId, mode, value, effective]);

  const save = async (send: boolean) => {
    const next: Record<string, string> = {};
    if (!kind) next.kind = 'Choose a kind';
    if (hasHike && (value === '' || !Number.isFinite(Number(value)) || Number(value) <= 0)) next.value = 'Enter the change';
    if (hasBonus && !(Number(bonus) > 0)) next.bonus = 'Enter the bonus amount';
    if (hasBonus && !(Number(clawback) >= 0)) next.clawback = 'Enter the months';
    if (!expires || expires < orgToday()) next.expires = 'Choose a date from today';
    setErrors(next);
    if (Object.keys(next).length) return;
    const body: OfferInput = {
      kind: kind!, note: note.trim() || undefined, expires_at: expires,
      hike: hasHike ? { mode, value: Number(value), effective_from: effective } : undefined,
      bonus: hasBonus ? { amount: Number(bonus), month: bonusMonth, clawback_months: Number(clawback) } : undefined,
    };
    setBusy(send ? 'send' : 'draft');
    try {
      const offer = await api.createOffer(caseId, body);
      if (send) await api.sendOffer(caseId, offer.id);
      showSuccess(send ? 'Offer sent to the employee' : 'Offer saved as a draft');
      onDone();
    } catch (e) { setErrors({ form: messageOf(e) }); } finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidthClassName="max-w-2xl" title={<h2 className="text-sm font-bold text-fg sm:text-base">Counter-offer</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn busy={busy === 'draft'} disabled={Boolean(busy)} onClick={() => save(false)}>Save draft</Btn><Btn variant="primary" busy={busy === 'send'} disabled={Boolean(busy)} onClick={() => save(true)}>Send to employee</Btn></>}>
      <div className="space-y-4">
        {errors.form && <Alert message={errors.form} />}
        <SelectField<OfferKind> label="Offer" required value={kind} onChange={setKind} error={errors.kind} options={KINDS.map((k) => ({ value: k, label: OFFER_KIND_LABEL[k] }))} />

        {hasHike && (
          <>
            <div>
              <FieldLabel label="Salary change" required />
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="inline-flex h-10 shrink-0 rounded-lg border border-line bg-bg-subtle p-0.5">
                  {CHANGE_MODES.map((m) => (
                    <button key={m.value} type="button" onClick={() => { setMode(m.value); setValue(''); }} className={cx('rounded-md px-3 text-xs font-semibold transition-colors', mode === m.value ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted')}>{m.label}</button>
                  ))}
                </div>
                <div className={shellClass(Boolean(errors.value))}>
                  <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))} placeholder={mode === 'percent' ? 'e.g., 10' : 'e.g., 900000'} aria-label="Salary change" className="w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none focus:ring-0" />
                  <span className="text-xs text-fg-muted">{mode === 'percent' ? '%' : '₹'}</span>
                </div>
              </div>
              <FieldMessage error={errors.value} />
            </div>
            <TextField label="Hike effective from" required type="date" value={effective} onChange={setEffective} />
            {preview && (
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-bg-subtle/50 p-3 sm:grid-cols-3">
                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">CTC</p><p className="mt-0.5 flex flex-wrap items-center gap-1 text-sm text-fg">{inr(preview.previous_ctc)} <ArrowRight className="h-3 w-3" /> <b>{inr(preview.new_ctc)}</b></p></div>
                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Monthly gross</p><p className="mt-0.5 flex flex-wrap items-center gap-1 text-sm text-fg">{inr(preview.previous_gross)} <ArrowRight className="h-3 w-3" /> <b>{inr(preview.new_gross)}</b></p></div>
                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Change</p><p className="mt-0.5 text-sm font-bold text-fg">{pct(preview.change_percent)}</p></div>
              </div>
            )}
          </>
        )}

        {hasBonus && (
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Bonus amount" required inputMode="decimal" prefix="₹" value={bonus} onChange={(v) => setBonus(v.replace(/[^\d.]/g, ''))} error={errors.bonus} />
            <TextField label="Paid in month" required type="month" value={bonusMonth} onChange={setBonusMonth} />
            <TextField label="Clawback (months)" required inputMode="numeric" value={clawback} onChange={(v) => setClawback(v.replace(/\D/g, ''))} error={errors.clawback} hint="Repayable if they leave sooner" />
          </div>
        )}

        <TextField label="Respond by" required type="date" value={expires} onChange={setExpires} error={errors.expires} min={orgToday()} />
        <Textarea label="Note to the employee" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        <p className="text-xs text-fg-muted">A hike is drafted as a salary revision and goes through the usual revision approval. It is applied only if the employee accepts.</p>
      </div>
    </Dialog>
  );
}
