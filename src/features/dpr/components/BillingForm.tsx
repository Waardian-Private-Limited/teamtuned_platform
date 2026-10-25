'use client';

import React from 'react';
import { Paperclip, Plus, Trash2, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { formatDate } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';
import { Btn, Card, IconBtn } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import type { BillingData, BillingForm as Form, CheckRow } from '../api/dpr.api';
import { DateBox, LocationSelect, n1, NumBox, TextBox } from './parts';

const STEEL = [['received', 'Received'], ['billed', 'Billed'], ['wip', 'WIP'], ['jmr', 'JMR total'], ['stock', 'Stock'], ['scrap', 'Scrap']] as const;
const r2 = (v: number) => Math.round(v * 100) / 100;

function YesNo({ value, onChange, disabled, error }: { value: boolean | null; onChange: (v: boolean) => void; disabled?: boolean; error?: boolean }) {
  return (
    <div className={cx('inline-flex h-8 overflow-hidden rounded-lg border', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
      {[true, false].map((v) => (
        <button key={String(v)} type="button" disabled={disabled} onClick={() => onChange(v)} aria-pressed={value === v}
          className={cx('px-3 text-xs font-semibold transition-colors', value === v ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'bg-surface text-fg-muted hover:text-fg')}>
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

function Checks({ title, rows, prefix, errors, disabled, onChange }: { title: string; rows: CheckRow[]; prefix: 'checklist' | 'documents'; errors: Record<string, string>; disabled: boolean; onChange: (rows: CheckRow[]) => void }) {
  const [uploading, setUploading] = React.useState<number | null>(null);
  const set = (i: number, patch: Partial<CheckRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const upload = async (i: number, files: FileList | null) => {
    if (!files?.length) return;
    setUploading(i);
    try { const r = await api.uploadFiles([...files]); set(i, { files: [...rows[i].files, ...r.files.map((f) => ({ name: f.file_name, url: f.url }))] }); } catch (e) { showError(messageOf(e)); } finally { setUploading(null); }
  };
  return (
    <Card title={title} note={`${rows.filter((r) => r.done).length} of ${rows.length} yes`}>
      <ul className="divide-y divide-line/60">
        {rows.map((r, i) => {
          const e = errors[`${prefix}.${i}`];
          return (
            <li key={r.name} className="space-y-2 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-fg">{r.name}</p>
                <YesNo value={r.done} onChange={(v) => set(i, { done: v })} disabled={disabled} error={Boolean(e)} />
              </div>
              {r.done === false && <TextBox value={r.remark} onChange={(v) => set(i, { remark: v })} ariaLabel="Why not" placeholder="Why not" disabled={disabled} />}
              {r.done && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {r.files.map((f, k) => (
                    <span key={f.url} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle py-0.5 pl-2 pr-1 text-[11px]">
                      <a href={f.url} target="_blank" rel="noreferrer" className="max-w-[10rem] truncate hover:underline">{f.name}</a>
                      {!disabled && <button type="button" aria-label="Remove file" onClick={() => set(i, { files: r.files.filter((_, j) => j !== k) })}><X className="h-3 w-3" /></button>}
                    </span>
                  ))}
                  {!disabled && (
                    <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-dashed border-line px-2 text-[11px] font-semibold text-fg-muted hover:text-fg">
                      {uploading === i ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Paperclip className="h-3 w-3" />}Attach
                      <input type="file" multiple className="hidden" onChange={(ev) => upload(i, ev.target.files)} />
                    </label>
                  )}
                </div>
              )}
              {e && <p className="text-[11px] font-medium text-[var(--tt-danger)]">{e}</p>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** The billing report: bill dates met, steel and concrete reconciliation (differences worked out), checklist, documents, vendors. */
/** The steps of the CBD form, as on the old one, and which answers (error keys) each holds. */
export const BILLING_STEPS: { title: string; keys: string[] }[] = [
  { title: 'Billing deadlines', keys: ['client_bill_done_on', 'contractor_bill_done_on'] },
  { title: 'Steel reconciliation', keys: ['steel'] },
  { title: 'Concrete reconciliation', keys: ['concrete'] },
  { title: 'Report checklist', keys: ['checklist'] },
  { title: 'Documents for client bill', keys: ['documents'] },
  { title: 'Vendor registration', keys: ['vendors', 'note'] },
];

export function BillingForm({ form, data, onChange, errors, disabled, step }: { form: Form; data: BillingData; onChange: (d: BillingData) => void; errors: Record<string, string>; disabled: boolean; step: number }) {
  const set = (patch: Partial<BillingData>) => onChange({ ...data, ...patch });
  const steel = data.steel || {};
  const wastage = steel.received ? r2(((steel.scrap || 0) / steel.received) * 100) : null;
  // The old CBD form's six steps, in order.
  const steps: React.ReactNode[] = [
      <Card title="Bill targets">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><p className="mb-1.5 text-xs font-semibold">Client bill done on <span className="font-normal text-fg-muted">· target {formatDate(form.plan?.client_bill_on)}</span></p><DateBox value={data.client_bill_done_on} onChange={(v) => set({ client_bill_done_on: v })} max={form.date} ariaLabel="Client bill done on" disabled={disabled} /></div>
          <div><p className="mb-1.5 text-xs font-semibold">Contractor bill done on <span className="font-normal text-fg-muted">· target {formatDate(form.plan?.contractor_bill_on)}</span></p><DateBox value={data.contractor_bill_done_on} onChange={(v) => set({ contractor_bill_done_on: v })} max={form.date} ariaLabel="Contractor bill done on" disabled={disabled} /></div>
        </div>
      </Card>,
      <Card title="Steel reconciliation" note={form.previous_on ? `last filed ${formatDate(form.previous_on, 'short')}` : 'running totals'}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STEEL.map(([k, label]) => (
            <label key={k} className="text-xs font-semibold text-fg">{label}
              <NumBox wide value={steel[k] ?? null} onChange={(v) => set({ steel: { ...steel, [k]: v } })} ariaLabel={label} error={errors[`steel.${k}`]} disabled={disabled} step={0.01} />
              {form.previous_steel?.[k] !== undefined && form.previous_steel?.[k] !== null && <span className="mt-0.5 block text-[10px] font-normal text-fg-muted">was {n1(form.previous_steel[k] as number)}</span>}
            </label>
          ))}
        </div>
        <p className="text-xs text-fg-muted">Wastage (scrap ÷ received): <b className="text-fg">{wastage === null ? '—' : `${wastage}%`}</b></p>
      </Card>,
      <Card title="Concrete reconciliation" right={!disabled ? <Btn variant="secondary" size="sm" icon={Plus} onClick={() => set({ concrete: [...data.concrete, { location_id: null, theoretical: null, consumed: null }] })}>Add</Btn> : undefined}>
        {!data.concrete.length && <p className="text-xs text-fg-muted">No rows.</p>}
        <div className="space-y-2">
          {data.concrete.map((r, i) => {
            const diff = r.theoretical !== null && r.consumed !== null ? r2(r.consumed - r.theoretical) : null;
            const set_ = (patch: Partial<typeof r>) => set({ concrete: data.concrete.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={i} className="grid grid-cols-2 items-start gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
                <div className="col-span-2 sm:col-span-1"><LocationSelect locations={form.locations} value={r.location_id} onChange={(v) => set_({ location_id: v })} ariaLabel="Location" disabled={disabled} /></div>
                <NumBox value={r.theoretical} onChange={(v) => set_({ theoretical: v })} placeholder="Theory" ariaLabel="Theoretical" error={errors[`concrete.${i}.theoretical`]} disabled={disabled} step={0.01} />
                <NumBox value={r.consumed} onChange={(v) => set_({ consumed: v })} placeholder="Used" ariaLabel="Consumed" error={errors[`concrete.${i}.consumed`]} disabled={disabled} step={0.01} />
                <p className="self-center text-xs tabular-nums text-fg-muted">{diff === null ? '—' : `${diff > 0 ? '+' : ''}${diff} · ${r.theoretical ? r2((diff / r.theoretical) * 100) : 0}%`}</p>
                {!disabled ? <IconBtn label="Remove" onClick={() => set({ concrete: data.concrete.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></IconBtn> : <span />}
              </div>
            );
          })}
        </div>
      </Card>,
      <Checks title="Report checklist" prefix="checklist" rows={data.checklist} errors={errors} disabled={disabled} onChange={(rows) => set({ checklist: rows })} />,
      <Checks title="Documents for the client bill" prefix="documents" rows={data.documents} errors={errors} disabled={disabled} onChange={(rows) => set({ documents: rows })} />,
    <div key="vendors" className="space-y-3 sm:space-y-4">
      <Card title="Vendor registration" right={!disabled ? <Btn variant="secondary" size="sm" icon={Plus} onClick={() => set({ vendors: [...data.vendors, { name: '', reg_form: null, work_order: null, closing_bill: null, remark: null }] })}>Add vendor</Btn> : undefined}>
        {!data.vendors.length && <p className="text-xs text-fg-muted">No vendors.</p>}
        <ul className="space-y-2.5">
          {data.vendors.map((v, i) => {
            const set_ = (patch: Partial<typeof v>) => set({ vendors: data.vendors.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <li key={i} className="space-y-2 rounded-lg border border-line p-2.5">
                <div className="flex items-start gap-2"><TextBox className="flex-1" value={v.name} onChange={(x) => set_({ name: x })} ariaLabel="Vendor" placeholder="Vendor name" error={errors[`vendors.${i}.name`]} disabled={disabled} />{!disabled && <IconBtn label="Remove vendor" onClick={() => set({ vendors: data.vendors.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></IconBtn>}</div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {([['reg_form', 'Registration form'], ['work_order', 'Work order'], ['closing_bill', 'Closing bill']] as const).map(([k, label]) => <span key={k} className="inline-flex items-center gap-2">{label}<YesNo value={v[k]} onChange={(x) => set_({ [k]: x })} disabled={disabled} /></span>)}
                </div>
                {(v.reg_form === false || v.work_order === false || v.closing_bill === false) && <TextBox value={v.remark} onChange={(x) => set_({ remark: x })} ariaLabel="Remark" placeholder="What is missing and why" disabled={disabled} />}
              </li>
            );
          })}
        </ul>
      </Card>
      <Card title="Note"><TextBox value={data.note} onChange={(v) => set({ note: v })} ariaLabel="Note" placeholder="Anything else" disabled={disabled} /></Card>
    </div>,
  ];
  return <div className="space-y-3 sm:space-y-4">{steps[step]}</div>;
}
