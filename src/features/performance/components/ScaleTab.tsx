'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { useResource } from '../hooks/useResource';
import type { Scale } from '../types/perf.types';
import { FormFooter, ListShell, num, numText } from './parts';
import { Btn } from './ui';

interface BandDraft { code: string; label: string; min: string; max: string }
interface Draft { id: number | null; code: string; name: string; isDefault: boolean; bands: BandDraft[]; subOrgId: number | null }

const STARTER: BandDraft[] = [
  { code: '1', label: 'Needs Improvement', min: '0', max: '49.99' },
  { code: '2', label: 'Below Expectations', min: '50', max: '69.99' },
  { code: '3', label: 'Meets Expectations', min: '70', max: '84.99' },
  { code: '4', label: 'Exceeds Expectations', min: '85', max: '94.99' },
  { code: '5', label: 'Outstanding', min: '95', max: '100' },
];
const blank = (subOrgId: number | null): Draft => ({ id: null, code: '', name: '', isDefault: false, bands: STARTER.map((b) => ({ ...b })), subOrgId });

export function ScaleTab({ subOrgId, canEdit, isOrgAdmin }: { subOrgId: number | null; canEdit: boolean; isOrgAdmin: boolean }) {
  const r = useResource<Scale>('scales', subOrgId);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const close = () => { r.clearErrors(); setDraft(null); };
  const setBand = (i: number, patch: Partial<BandDraft>) => draft && setDraft({ ...draft, bands: draft.bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const save = async () => {
    if (!draft) return;
    const body = {
      code: draft.code, name: draft.name, is_default: draft.isDefault,
      bands: draft.bands.map((b) => ({ code: b.code, label: b.label, min: num(b.min), max: num(b.max) })),
      ...(draft.id ? {} : { sub_organization_id: draft.subOrgId }),
    };
    if (await r.save(draft.id, body, 'bands')) setDraft(null);
  };

  return (
    <>
      <ListShell<Scale>
        title="Rating scales" noun="rating scale" intro="Turns a score (0 to 100) into a rating band."
        items={r.items} loadError={r.loadError} status={r.status} onStatus={r.setStatus} canEdit={canEdit}
        onAdd={() => setDraft(blank(subOrgId))}
        onEdit={(s) => setDraft({ id: s.id, code: s.code, name: s.name, isDefault: s.is_default, subOrgId: s.sub_organization_id, bands: s.bands.map((b) => ({ code: b.code, label: b.label, min: numText(b.min), max: numText(b.max) })) })}
        onArchive={r.archive}
        row={(s) => ({ name: <>{s.name}{s.is_default && <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">Default</span>}</>, detail: s.bands.map((b) => `${b.label} ${b.min}–${b.max}`).join(' · ') })}
      />
      <Dialog open={Boolean(draft)} onClose={close} title={draft?.id ? 'Edit rating scale' : 'Add rating scale'} maxWidthClassName="max-w-2xl" footer={<FormFooter onCancel={close} onSave={save} saving={r.saving} />}>
        {draft && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label="Name" required value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} error={r.errors.name} maxLength={100} autoFocus />
              <TextField label="Code" required value={draft.code} onChange={(v) => setDraft({ ...draft, code: v.toUpperCase() })} error={r.errors.code} hint="Letters, numbers and underscore." maxLength={30} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">Bands</p>
              <div className="space-y-2">
                {draft.bands.map((b, i) => (
                  <div key={i} className="grid grid-cols-[3.5rem_1fr_5rem_5rem_auto] items-start gap-2">
                    <TextField label="Code" value={b.code} onChange={(v) => setBand(i, { code: v })} maxLength={30} />
                    <TextField label="Label" value={b.label} onChange={(v) => setBand(i, { label: v })} maxLength={60} />
                    <TextField label="From" type="number" value={b.min} onChange={(v) => setBand(i, { min: v })} />
                    <TextField label="To" type="number" value={b.max} onChange={(v) => setBand(i, { max: v })} />
                    <button type="button" aria-label="Remove band" onClick={() => setDraft({ ...draft, bands: draft.bands.filter((_, j) => j !== i) })} className="mt-7 rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {r.errors.bands && <p role="alert" className="mt-1 text-xs font-medium text-[var(--tt-danger)]">{r.errors.bands}</p>}
              <Btn type="button" variant="secondary" size="sm" className="mt-2" onClick={() => setDraft({ ...draft, bands: [...draft.bands, { code: '', label: '', min: '', max: '' }] })}>
                <Plus className="h-3.5 w-3.5" /> Add band
              </Btn>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line p-3">
              <div>
                <p className="text-sm font-semibold text-fg">Default scale</p>
                <p className="text-xs text-fg-muted">Used when a template does not pick a scale. One default per company.</p>
              </div>
              <Switch checked={draft.isDefault} onChange={(v) => setDraft({ ...draft, isDefault: v })} label="Default scale" />
            </div>
            {!draft.id && <SubOrgPicker value={draft.subOrgId} onChange={(v) => setDraft({ ...draft, subOrgId: v })} allowShared={isOrgAdmin} />}
          </div>
        )}
      </Dialog>
    </>
  );
}
