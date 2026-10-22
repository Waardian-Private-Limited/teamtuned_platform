'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { Dialog } from '@/components/ui/Dialog';
import { Chip, SelectField, TextField } from '@/components/ui/FormControls';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import * as api from '../api/perf.api';
import { DIMENSION_LABEL } from '../constants/perf.constants';
import { useResource } from '../hooks/useResource';
import type { Dimensions, Named, PersonOption, Rule, RuleOptions, Template } from '../types/perf.types';
import { FormFooter, ListShell, num } from './parts';

type DimKey = keyof typeof DIMENSION_LABEL;
const DIM_KEYS = Object.keys(DIMENSION_LABEL) as DimKey[];
const SOURCE: Record<DimKey, keyof RuleOptions> = { site_ids: 'sites', department_ids: 'departments', role_ids: 'roles', grade_ids: 'grades', employment_type_ids: 'employment_types', cost_centre_ids: 'cost_centres' };

interface Draft { id: number | null; templateId: number | null; priority: string; dims: Dimensions; subOrgId: number | null }
const blank = (subOrgId: number | null): Draft => ({ id: null, templateId: null, priority: '0', dims: {}, subOrgId });

export function RuleTab({ subOrgId, canEdit, isOrgAdmin }: { subOrgId: number | null; canEdit: boolean; isOrgAdmin: boolean }) {
  const r = useResource<Rule>('template-rules', subOrgId);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [options, setOptions] = React.useState<RuleOptions | null>(null);
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [error, setError] = React.useState('');

  // Pick-lists are needed for the form and to show names in the rows.
  React.useEffect(() => {
    Promise.all([api.ruleOptions(), api.list<Template>('templates', 'active', null)])
      .then(([o, t]) => { setOptions(o); setTemplates(t.items); })
      .catch((e) => setError(messageOf(e)));
  }, []);

  const names = (key: DimKey, ids: number[]) => ids.map((id) => (options?.[SOURCE[key]] as Named[] | undefined)?.find((n) => n.id === id)?.name || `#${id}`).join(', ');
  const summary = (d: Dimensions) => {
    const parts = DIM_KEYS.filter((k) => d[k]?.length).map((k) => `${DIMENSION_LABEL[k]}: ${names(k, d[k] as number[])}`);
    if (d.employee_ids?.length) parts.push(`${d.employee_ids.length} named employee${d.employee_ids.length === 1 ? '' : 's'}`);
    return parts.length ? parts.join(' · ') : 'Everyone';
  };

  const close = () => { r.clearErrors(); setDraft(null); };
  const save = async () => {
    if (!draft) return;
    const body = { template_id: draft.templateId, priority: num(draft.priority) ?? 0, dimensions: draft.dims, ...(draft.id ? {} : { sub_organization_id: draft.subOrgId }) };
    if (await r.save(draft.id, body, 'template_id')) setDraft(null);
  };
  const toggle = (key: DimKey, id: number) => {
    if (!draft) return;
    const cur = draft.dims[key] || [];
    setDraft({ ...draft, dims: { ...draft.dims, [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } });
  };

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      <TryEmployee />
      <ListShell<Rule>
        title="Who gets what" noun="rule" intro="Which template each person gets. More specific rules win."
        items={r.items} loadError={r.loadError} status={r.status} onStatus={r.setStatus} canEdit={canEdit}
        onAdd={() => setDraft(blank(subOrgId))} onArchive={r.archive}
        onEdit={(x) => setDraft({ id: x.id, templateId: x.template_id, priority: String(x.priority), dims: x.dimensions, subOrgId: x.sub_organization_id })}
        row={(x) => ({ name: x.template_name || `Template #${x.template_id}`, detail: `${summary(x.dimensions)}${x.priority ? ` · priority ${x.priority}` : ''}` })}
      />
      <Dialog open={Boolean(draft)} onClose={close} title={draft?.id ? 'Edit rule' : 'Add rule'} maxWidthClassName="max-w-2xl" footer={<FormFooter onCancel={close} onSave={save} saving={r.saving} />}>
        {draft && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <SelectField<number> label="Template" required numeric value={draft.templateId} onChange={(v) => setDraft({ ...draft, templateId: v })} options={templates.map((t) => ({ value: t.id, label: t.name }))} error={r.errors.template_id} />
              </div>
              <TextField label="Priority" type="number" value={draft.priority} onChange={(v) => setDraft({ ...draft, priority: v })} error={r.errors.priority} hint="Higher wins a tie." />
            </div>
            <p className="text-xs text-fg-muted">Pick the people this applies to. Leave a group empty to ignore it.</p>
            {DIM_KEYS.map((k) => {
              const list = (options?.[SOURCE[k]] as Named[] | undefined) || [];
              if (!list.length) return null;
              return (
                <div key={k}>
                  <p className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">{DIMENSION_LABEL[k]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((o) => <Chip key={o.id} active={Boolean(draft.dims[k]?.includes(o.id))} onClick={() => toggle(k, o.id)}>{o.name}</Chip>)}
                  </div>
                </div>
              );
            })}
            {r.errors.dimensions && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{r.errors.dimensions}</p>}
            {!draft.id && <SubOrgPicker value={draft.subOrgId} onChange={(v) => setDraft({ ...draft, subOrgId: v })} allowShared={isOrgAdmin} />}
          </div>
        )}
      </Dialog>
    </div>
  );
}

/** Type a name, pick a person, see which template they would get. */
function TryEmployee() {
  const [q, setQ] = React.useState('');
  const [people, setPeople] = React.useState<PersonOption[]>([]);
  const [result, setResult] = React.useState<string>('');

  React.useEffect(() => {
    if (q.trim().length < 2) { setPeople([]); return; }
    const t = setTimeout(() => { api.searchPeople(q.trim()).then((d) => setPeople(d.items)).catch(() => setPeople([])); }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const pick = async (p: PersonOption) => {
    setPeople([]); setQ('');
    try {
      const d = await api.resolveTemplate(p.id);
      setResult(d.template ? `${d.employee.name} gets "${d.template.name}".` : `${d.employee.name} matches no rule, so has no template yet.`);
    } catch (e) { setResult(messageOf(e)); }
  };

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="relative max-w-sm">
        <TextField label="Check an employee" value={q} onChange={setQ} placeholder="Search by name or code" prefix={<Search className="h-3.5 w-3.5" />} />
        {people.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-[var(--tt-shadow-sm)]">
            {people.map((p) => (
              <li key={p.id}><button type="button" onClick={() => pick(p)} className="w-full px-3 py-2 text-left text-sm text-fg hover:bg-bg-subtle">{p.name}{p.employee_code && <span className="ml-2 text-[11px] text-fg-muted">{p.employee_code}</span>}</button></li>
            ))}
          </ul>
        )}
      </div>
      {result && <p className="mt-2 text-sm text-fg">{result}</p>}
    </div>
  );
}
