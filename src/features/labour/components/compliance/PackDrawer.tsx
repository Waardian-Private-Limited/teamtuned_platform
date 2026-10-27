'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Section, SelectField, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { useFilterOptions } from '@/features/payroll-runs/hooks/useFilterOptions';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import type { CompliancePackField, PackDetail, PackFieldType, TemplateSummary } from '../../types/labour.types';
import { parseLabourError } from '../../utils/errors';
import { FormError, primaryBtn, secondaryBtn } from '../shared/Primitives';
import { SiteMultiSelect } from '../shared/FormBits';
import { move } from './designer/blocks';

const TYPES: Array<{ value: PackFieldType; label: string }> = [
  { value: 'text', label: 'Short text' }, { value: 'textarea', label: 'Long text' }, { value: 'number', label: 'Number' }, { value: 'date', label: 'Date' },
  { value: 'select', label: 'Choice list' }, { value: 'combo', label: 'Choice list or typed' }, { value: 'employee', label: 'Employee (prints name and signature)' }, { value: 'checkbox', label: 'Yes / no' }, { value: 'phone', label: 'Phone' },
];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'f_$1').slice(0, 78);

export function PackDrawer({ id, onSaved }: { id: number | null; onSaved: () => void }) {
  const { sites } = useFilterOptions(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [ready, setReady] = useState(!id);
  const [name, setName] = useState('');
  const [clientLabel, setClientLabel] = useState('');
  const [fields, setFields] = useState<CompliancePackField[]>([]);
  const [templateIds, setTemplateIds] = useState<number[]>([]);
  const [siteIds, setSiteIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(id);

  useEffect(() => { api.listTemplates().then((r) => setTemplates(r.templates || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!id) return;
    api.getPack(id).then((p: PackDetail) => {
      setName(p.name); setClientLabel(p.clientLabel || ''); setFields(p.fields || []); setTemplateIds(p.templateIds || []); setSiteIds(p.siteIds || []); setReady(true);
    }).catch((e) => setFormError(parseLabourError(e).message));
  }, [id]);

  const clearErr = () => setErrors({});
  const upd = (i: number, p: Partial<CompliancePackField>) => { setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...p } : f))); clearErr(); };

  const save = async () => {
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      const r = await api.savePack(savedId, { name, clientLabel: clientLabel || null, fields, templateIds, siteIds } as never);
      if (!savedId) setSavedId((r as { id: number }).id);
      showSuccess('Pack saved');
      onSaved();
    } catch (err) {
      const e = parseLabourError(err);
      if (e.status === 409) {
        const taken = Array.isArray(e.details?.siteIds) ? (e.details?.siteIds as number[]).map((sid) => sites.find((s) => s.value === sid)?.label || `Site ${sid}`) : [];
        setErrors({ siteIds: taken.length ? `${e.message} (${taken.join(', ')})` : e.message });
      } else if (e.field) setErrors({ [e.field]: e.message });
      else setFormError(e.message);
    } finally { setBusy(false); }
  };

  if (!ready) return formError ? <FormError message={formError} /> : <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;

  return (
    <div className="space-y-4">
      <Section title="Pack" description="A pack collects extra details for a client and prints that client’s forms.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Pack name" required value={name} error={errors.name} onChange={(v) => { setName(v); clearErr(); }} />
          <TextField label="Client" value={clientLabel} error={errors.clientLabel} onChange={setClientLabel} />
        </div>
      </Section>

      <Section title="Details to collect" description="Shown as an extra step when registering labour at the pack’s sites. Used in forms as {{profile.key}}."
        aside={<button type="button" className={secondaryBtn} onClick={() => setFields([...fields, { key: '', label: '', type: 'text', required: false, options: [] }])}><Plus className="h-3.5 w-3.5" aria-hidden />Add field</button>}>
        {errors.fields && <p role="alert" className="mb-2 text-xs font-medium text-[var(--tt-danger)]">{errors.fields}</p>}
        {fields.length === 0 && <p className="text-xs text-fg-muted sm:text-sm">No extra details. The pack only prints forms.</p>}
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={i} className="rounded-xl border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Label" value={f.label} error={errors[`fields.${i}.label`]} onChange={(label) => upd(i, { label, key: f.key === '' || f.key === slug(f.label) ? slug(label) : f.key })} />
                <TextField label="Key" value={f.key} error={errors[`fields.${i}.key`]} hint="Lowercase letters, digits and _." onChange={(key) => upd(i, { key: key.toLowerCase() })} />
                <SelectField label="Type" value={f.type} options={TYPES} onChange={(type) => upd(i, { type: (type || 'text') as PackFieldType })} />
                <label className="flex items-center justify-between gap-3 self-end rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-fg">Required<Switch label="Required" checked={f.required} onChange={(required) => upd(i, { required })} /></label>
                <div className="sm:col-span-2">
                  <TextField label="Section" value={f.section || ''} error={errors[`fields.${i}.section`]} hint="Optional heading this field is grouped under in the labour wizard." onChange={(section) => upd(i, { section })} />
                </div>
                {(f.type === 'select' || f.type === 'combo') && (
                  <div className="sm:col-span-2">
                    <TextField label="Choices (comma separated)" value={f.options.join(', ')} error={errors[`fields.${i}.options`]} onChange={(v) => upd(i, { options: v.split(',').map((x) => x.trimStart()) })} onBlur={() => upd(i, { options: f.options.map((x) => x.trim()).filter(Boolean) })} />
                  </div>
                )}
              </div>
              <div className="mt-2 flex gap-1">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => setFields(move(fields, i, i - 1))} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" aria-label="Move down" disabled={i === fields.length - 1} onClick={() => setFields(move(fields, i, i + 1))} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" aria-label="Remove field" onClick={() => setFields(fields.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Forms to print" description="Printed together in this order for each labourer.">
        {errors.templateIds && <p role="alert" className="mb-2 text-xs font-medium text-[var(--tt-danger)]">{errors.templateIds}</p>}
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {templates.map((t) => {
            const on = templateIds.includes(t.id);
            return (
              <li key={t.id}>
                <button type="button" aria-pressed={on} onClick={() => setTemplateIds(on ? templateIds.filter((x) => x !== t.id) : [...templateIds, t.id])} className={cx('flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm', on ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5' : 'border-line hover:bg-bg-subtle')}>
                  <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line-strong')}>{on && <Check className="h-3 w-3" aria-hidden />}</span>
                  <span className="min-w-0 truncate font-semibold text-fg">{t.name}</span>
                </button>
              </li>
            );
          })}
          {templates.length === 0 && <li className="text-xs text-fg-muted sm:text-sm">No forms yet. Add some on the Forms tab first.</li>}
        </ul>
      </Section>

      <Section title="Sites" description="A site can follow only one pack.">
        <SiteMultiSelect options={sites} value={siteIds} onChange={(v) => { setSiteIds(v); clearErr(); }} error={errors.siteIds} />
      </Section>
      <FormError message={formError} />
      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:px-6">
        <button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Save pack'}</button>
      </div>
    </div>
  );
}
