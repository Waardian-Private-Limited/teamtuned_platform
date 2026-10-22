'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { useResource } from '../hooks/useResource';
import type { Competency, Kra } from '../types/perf.types';
import { FormFooter, ListShell } from './parts';

interface Draft { id: number | null; name: string; category: string; description: string; subOrgId: number | null }
const blank = (subOrgId: number | null): Draft => ({ id: null, name: '', category: '', description: '', subOrgId });

export function KraTab({ subOrgId, canEdit, isOrgAdmin }: { subOrgId: number | null; canEdit: boolean; isOrgAdmin: boolean }) {
  const r = useResource<Kra>('kras', subOrgId);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const close = () => { r.clearErrors(); setDraft(null); };
  const save = async () => {
    if (!draft) return;
    const body = { name: draft.name, category: draft.category, description: draft.description, ...(draft.id ? {} : { sub_organization_id: draft.subOrgId }) };
    if (await r.save(draft.id, body)) setDraft(null);
  };

  return (
    <>
      <ListShell<Kra>
        title="KRAs" noun="KRA" intro="Broad areas of a job, e.g. Revenue. KPIs sit under one."
        items={r.items} loadError={r.loadError} status={r.status} onStatus={r.setStatus} canEdit={canEdit}
        onAdd={() => setDraft(blank(subOrgId))}
        onEdit={(k) => setDraft({ id: k.id, name: k.name, category: k.category || '', description: k.description || '', subOrgId: k.sub_organization_id })}
        onArchive={r.archive}
        row={(k) => ({ name: k.name, detail: [k.category, k.description].filter(Boolean).join(' · ') })}
      />
      <Dialog open={Boolean(draft)} onClose={close} title={draft?.id ? 'Edit KRA' : 'Add KRA'} footer={<FormFooter onCancel={close} onSave={save} saving={r.saving} />}>
        {draft && (
          <div className="space-y-3">
            <TextField label="Name" required value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} error={r.errors.name} maxLength={150} autoFocus />
            <TextField label="Category" value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} error={r.errors.category} hint="Optional. Helps group KRAs, for example Output or Quality." maxLength={80} />
            <Textarea label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} error={r.errors.description} />
            {!draft.id && <SubOrgPicker value={draft.subOrgId} onChange={(v) => setDraft({ ...draft, subOrgId: v })} allowShared={isOrgAdmin} />}
          </div>
        )}
      </Dialog>
    </>
  );
}

interface CompDraft extends Draft { group: string; levels: Record<number, string> }
const LEVELS = [1, 2, 3, 4, 5] as const;
const blankComp = (subOrgId: number | null): CompDraft => ({ ...blank(subOrgId), group: '', levels: {} });

export function CompetencyTab({ subOrgId, canEdit, isOrgAdmin }: { subOrgId: number | null; canEdit: boolean; isOrgAdmin: boolean }) {
  const r = useResource<Competency>('competencies', subOrgId);
  const [draft, setDraft] = React.useState<CompDraft | null>(null);
  const close = () => { r.clearErrors(); setDraft(null); };
  const save = async () => {
    if (!draft) return;
    const levels = LEVELS.filter((l) => draft.levels[l]?.trim()).map((l) => ({ level: l, descriptor: draft.levels[l].trim() }));
    const body = { name: draft.name, group_name: draft.group, description: draft.description, levels, ...(draft.id ? {} : { sub_organization_id: draft.subOrgId }) };
    if (await r.save(draft.id, body)) setDraft(null);
  };

  return (
    <>
      <ListShell<Competency>
        title="Competencies" noun="competency" intro="Behaviours rated 1 to 5, e.g. Teamwork."
        items={r.items} loadError={r.loadError} status={r.status} onStatus={r.setStatus} canEdit={canEdit}
        onAdd={() => setDraft(blankComp(subOrgId))}
        onEdit={(c) => setDraft({ id: c.id, name: c.name, category: '', description: c.description || '', subOrgId: c.sub_organization_id, group: c.group_name || '', levels: Object.fromEntries(c.levels.map((l) => [l.level, l.descriptor])) })}
        onArchive={r.archive}
        row={(c) => ({ name: c.name, detail: [c.group_name, c.description].filter(Boolean).join(' · ') })}
      />
      <Dialog open={Boolean(draft)} onClose={close} title={draft?.id ? 'Edit competency' : 'Add competency'} maxWidthClassName="max-w-2xl" footer={<FormFooter onCancel={close} onSave={save} saving={r.saving} />}>
        {draft && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label="Name" required value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} error={r.errors.name} maxLength={150} autoFocus />
              <TextField label="Group" value={draft.group} onChange={(v) => setDraft({ ...draft, group: v })} hint="For example Core, Functional or Leadership." maxLength={80} />
            </div>
            <Textarea label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} />
            <div>
              <p className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">What each rating looks like <span className="font-normal text-fg-muted">(optional)</span></p>
              <div className="space-y-2">
                {LEVELS.map((l) => (
                  <TextField key={l} label={`Level ${l}`} value={draft.levels[l] || ''} onChange={(v) => setDraft({ ...draft, levels: { ...draft.levels, [l]: v } })} maxLength={500} />
                ))}
              </div>
              {r.errors.levels && <p role="alert" className="mt-1 text-xs font-medium text-[var(--tt-danger)]">{r.errors.levels}</p>}
            </div>
            {!draft.id && <SubOrgPicker value={draft.subOrgId} onChange={(v) => setDraft({ ...draft, subOrgId: v })} allowShared={isOrgAdmin} />}
          </div>
        )}
      </Dialog>
    </>
  );
}
