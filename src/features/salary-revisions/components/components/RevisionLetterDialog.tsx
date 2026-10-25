'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, SelectField, TextField } from '@/components/ui/FormControls';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { saveBlob, safeFileName } from '@/features/document-centre/lib/files';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import * as api from '../../api/salaryRevisions.api';
import type { RevisionLetterFormDto } from '../../api/salaryRevisions.api';

function fieldOf(err: unknown): string | undefined {
  const data = (err as { data?: unknown } | null)?.data as { field?: unknown; details?: { field?: unknown } } | null | undefined;
  const f = data?.field ?? data?.details?.field;
  return typeof f === 'string' ? f : undefined;
}

/**
 * Download an increment or promotion letter. The letter comes from the default template of that
 * type in Document Centre; HR confirms the letter date and who signs. The first download takes a
 * reference number; later ones keep it, and the employee can then download the same letter.
 */
export function RevisionLetterDialog({ revisionId, employeeName, onClose }: { revisionId: number | null; employeeName?: string | null; onClose: () => void }) {
  const [form, setForm] = React.useState<RevisionLetterFormDto | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [signers, setSigners] = React.useState<Record<string, number>>({});
  const [stampId, setStampId] = React.useState<number | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!revisionId) { setForm(null); return; }
    let active = true;
    api.getLetterForm(revisionId)
      .then((f) => {
        if (!active) return;
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
      .catch((err) => { if (active) { showError(messageOf(err)); onClose(); } });
    return () => { active = false; };
  }, [revisionId, onClose]);

  async function download() {
    if (!form || !revisionId) return;
    const e: Record<string, string> = {};
    form.inputs.forEach((i) => { if (i.required && !String(values[i.key] || '').trim()) e[`inputs.${i.key}`] = `${i.label} is required`; });
    form.slots.forEach((s) => { if (s.open && !signers[s.key]) e[`signatories.${s.key}`] = 'Pick who signs'; });
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const blob = await api.downloadLetter(revisionId, { inputs: values, signatories: signers, stamp_id: stampId });
      saveBlob(blob, safeFileName(form.docTypeLabel, employeeName));
      showSuccess(`${form.docTypeLabel} downloaded`);
      onClose();
    } catch (err) {
      const f = fieldOf(err);
      if (f) setErrors({ [f]: messageOf(err) });
      else showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={revisionId !== null}
      onClose={() => !busy && onClose()}
      title={form ? `Download ${form.docTypeLabel.toLowerCase()}` : 'Letter'}
      maxWidthClassName="max-w-lg"
      footer={
        <>
          <Btn onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn variant="primary" busy={busy} disabled={!form} icon={<Download className="h-4 w-4" />} onClick={download}>Download</Btn>
        </>
      }
    >
      {!form ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-subtle" />)}</div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-fg-muted">
            Template <span className="font-semibold text-fg">{form.template.name}</span>
            {form.reference ? ` · reference ${form.reference}` : ' · a reference number is given on first download'}
            . Change the wording in Document Centre → Templates.
          </p>
          {form.inputs.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {form.inputs.map((i) => (
                <TextField
                  key={i.key}
                  label={i.label}
                  required={i.required}
                  type={i.type === 'date' ? 'date' : i.type === 'number' || i.type === 'money' ? 'number' : 'text'}
                  value={values[i.key] ?? ''}
                  onChange={(v) => { setValues((x) => ({ ...x, [i.key]: v })); setErrors((x) => ({ ...x, [`inputs.${i.key}`]: '' })); }}
                  error={errors[`inputs.${i.key}`] || undefined}
                />
              ))}
            </div>
          )}
          {form.slots.filter((s) => s.open).map((s) => (
            <SelectField<number>
              key={s.key}
              label={`Signed by (${s.label})`}
              required
              numeric
              value={signers[s.key] ?? null}
              onChange={(v) => { setSigners((x) => { const n = { ...x }; if (v) n[s.key] = v; else delete n[s.key]; return n; }); setErrors((x) => ({ ...x, [`signatories.${s.key}`]: '' })); }}
              options={form.signatories.map((p) => ({ value: p.id, label: p.designation ? `${p.name}, ${p.designation}` : p.name }))}
              placeholder={form.signatories.length ? 'Choose a signatory' : 'Add one in Document Centre → Signatures & stamps'}
              error={errors[`signatories.${s.key}`] || undefined}
            />
          ))}
          {form.usesStamp && (
            <div>
              <FieldLabel label="Stamp" />
              <SelectField<number> label="" numeric value={stampId} onChange={setStampId} options={form.stamps.map((s) => ({ value: s.id, label: s.name }))} placeholder={form.stamps.length ? 'No stamp' : 'No stamp uploaded'} error={errors.stamp_id || undefined} />
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
