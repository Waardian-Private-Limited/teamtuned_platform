'use client';

import { useEffect, useState } from 'react';
import { Download, Mail } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, SelectField, TextField } from '@/components/ui/FormControls';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { saveBlob, safeFileName } from '@/features/document-centre/lib/files';
import { btn, fieldOf } from '../../interviews/lib/ui';
import * as api from '../api/offers.api';
import type { OfferLetterChoice, OfferLetterFormDto } from '../types/offers.dto';

/**
 * Download or email the offer letter. The letter comes from the default "Offer letter" template
 * in Document Centre; HR confirms its details (letter date, joining date…) and who signs. The
 * first final letter takes a reference number; later ones keep it.
 */
export function OfferLetterDialog({ offerId, mode, candidateName, candidateEmail, onClose, onDone }: {
  offerId: number | null;
  mode: 'download' | 'email';
  candidateName: string;
  candidateEmail?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<OfferLetterFormDto | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [signers, setSigners] = useState<Record<string, number>>({});
  const [stampId, setStampId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!offerId) { setForm(null); return; }
    api.getLetterForm(offerId)
      .then((f) => {
        setForm(f);
        setValues(Object.fromEntries(f.inputs.map((i) => [i.key, i.value || ''])));
        const picks: Record<string, number> = {};
        f.slots.forEach((s) => {
          if (!s.open) return;
          const chosen = s.chosen ?? (f.signatories.length === 1 ? f.signatories[0].id : null);
          if (chosen) picks[s.key] = chosen;
        });
        setSigners(picks);
        setStampId(f.stampId ?? f.stamps[0]?.id ?? null);
        setErrors({});
      })
      .catch((err) => { showError(messageOf(err)); onClose(); });
  }, [offerId, onClose]);

  function choice(): OfferLetterChoice | null {
    if (!form) return null;
    const e: Record<string, string> = {};
    if (form.final) {
      form.inputs.forEach((i) => { if (i.required && !String(values[i.key] || '').trim()) e[`inputs.${i.key}`] = `${i.label} is required`; });
      form.slots.forEach((s) => { if (s.open && !signers[s.key]) e[`signatories.${s.key}`] = 'Pick who signs'; });
    }
    setErrors(e);
    return Object.keys(e).length ? null : { inputs: values, signatories: signers, stamp_id: stampId };
  }

  async function run() {
    const c = choice();
    if (!c || !offerId) return;
    setBusy(true);
    try {
      if (mode === 'download') {
        const blob = await api.downloadLetter(offerId, c);
        saveBlob(blob, safeFileName(form?.final ? 'Offer letter' : 'DRAFT Offer letter', candidateName));
        showSuccess(form?.final ? 'Offer letter downloaded' : 'Draft copy downloaded');
      } else {
        await api.sendOffer(offerId, c);
        showSuccess(`Offer emailed to ${candidateName}`);
      }
      onDone();
      onClose();
    } catch (err) {
      const f = fieldOf(err);
      if (f) setErrors({ [f]: messageOf(err) });
      showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={offerId !== null}
      onClose={() => !busy && onClose()}
      title={mode === 'download' ? 'Download offer letter' : 'Email offer to candidate'}
      maxWidthClassName="max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={btn.secondary}>Cancel</button>
          <button type="button" onClick={run} disabled={busy || !form} className={btn.primary}>
            {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : mode === 'download' ? <Download className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {mode === 'download' ? 'Download' : 'Send email'}
          </button>
        </>
      }
    >
      {!form ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-subtle" />)}</div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-fg-muted">
            Template <span className="font-semibold text-fg">{form.template.name}</span>
            {form.final ? (form.reference ? ` · reference ${form.reference}` : ' · a reference number is given on first issue') : ' · not approved yet, so this is a DRAFT copy'}
          </p>
          {mode === 'email' && (
            <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg-muted">
              The letter is attached and {candidateName} gets a link to accept or decline online{candidateEmail ? ` at ${candidateEmail}` : ''}. Sending again replaces the old link.
            </p>
          )}
          {form.inputs.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {form.inputs.map((i) => (
                <TextField
                  key={i.key}
                  label={i.label}
                  required={i.required}
                  type={i.type === 'date' ? 'date' : i.type === 'number' || i.type === 'money' ? 'number' : 'text'}
                  value={values[i.key] ?? ''}
                  onChange={(v) => { setValues((x) => ({ ...x, [i.key]: v })); setErrors((e) => ({ ...e, [`inputs.${i.key}`]: '' })); }}
                  error={errors[`inputs.${i.key}`] || undefined}
                />
              ))}
            </div>
          )}
          {form.slots.filter((s) => s.open).map((s) => (
            <SelectField<number>
              key={s.key}
              label={`Signed by (${s.label})`}
              required={form.final}
              numeric
              value={signers[s.key] ?? null}
              onChange={(v) => { setSigners((x) => { const n = { ...x }; if (v) n[s.key] = v; else delete n[s.key]; return n; }); setErrors((e) => ({ ...e, [`signatories.${s.key}`]: '' })); }}
              options={form.signatories.map((p) => ({ value: p.id, label: p.designation ? `${p.name}, ${p.designation}` : p.name }))}
              placeholder={form.signatories.length ? 'Choose a signatory' : 'Add one in Document Centre → Signatures & stamps'}
              error={errors[`signatories.${s.key}`] || undefined}
            />
          ))}
          {form.usesStamp && (
            <div>
              <FieldLabel label="Stamp" />
              <SelectField<number> label="" numeric value={stampId} onChange={setStampId} options={form.stamps.map((s) => ({ value: s.id, label: s.name }))} placeholder={form.stamps.length ? 'No stamp' : 'No stamp uploaded'} />
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
