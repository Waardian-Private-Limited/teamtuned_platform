'use client';

import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { SelectField, TextField, FieldLabel } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { MODE_LABEL, OPERATOR_LABEL } from '../constants';
import type { Condition, EmployeeRef, FlowStep, Lookups, Operator, RequestTypeDef, StepMode } from '../types/approvals';
import { EmployeeSearch } from './EmployeeSearch';

interface Props {
  index: number;
  count: number;
  step: FlowStep;
  type: RequestTypeDef;
  lookups: Lookups | null;
  employees: Record<number, EmployeeRef>;
  errors: string[];
  onChange: (step: FlowStep) => void;
  onEmployees: (list: EmployeeRef[]) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

const isLast = (i: number, n: number) => i === n - 1;

export function StepEditor({ index, count, step, type, lookups, employees, errors, onChange, onEmployees, onMove, onRemove }: Props) {
  const approver = step.approver;
  const setApprover = (patch: Partial<typeof approver>) => onChange({ ...step, approver: { ...approver, ...patch } });
  const changeType = (next: string) => {
    const base = { type: next } as typeof approver;
    if (next === 'reporting_manager') base.levels = 1;
    if (next === 'role') { base.sameSubOrg = true; base.sameSite = false; }
    if (next === 'permission') base.permission = type.permissionOptions[0]?.code;
    onChange({ ...step, approver: base });
  };
  const when = step.when || [];
  const setWhen = (next: Condition[]) => onChange({ ...step, when: next.length ? next : null });
  const addCondition = () => {
    const fact = type.facts[0];
    if (fact) setWhen([...when, { fact: fact.key, op: fact.type === 'number' ? 'gt' : 'eq', value: fact.type === 'boolean' ? true : 0 }]);
  };
  const patchCondition = (i: number, patch: Partial<Condition>) => setWhen(when.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const selected = (approver.employeeIds || []).map((id) => employees[id] || { id, name: `#${id}`, code: null, department: null });

  return (
    <div className="rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--tt-primary)] text-[11px] font-bold text-[var(--tt-on-primary)]">{index + 1}</span>
        <input
          value={step.name}
          onChange={(e) => onChange({ ...step, name: e.target.value })}
          aria-label="Step name"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-fg outline-none"
        />
        <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)} className="rounded p-1 text-fg-muted hover:bg-bg-subtle disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
        <button type="button" aria-label="Move down" disabled={isLast(index, count)} onClick={() => onMove(1)} className="rounded p-1 text-fg-muted hover:bg-bg-subtle disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
        <button type="button" aria-label="Remove step" disabled={count === 1} onClick={onRemove} className="rounded p-1 text-fg-muted hover:bg-bg-subtle disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
      </div>

      <div className="space-y-3 p-4">
        <SelectField label="Who approves" value={approver.type} onChange={(v) => v && changeType(String(v))} options={type.approverTypes.map((a) => ({ value: a.type, label: a.label }))} />

        {approver.type === 'reporting_manager' && (
          <SelectField label="Manager level" numeric value={approver.levels ?? 1} onChange={(v) => setApprover({ levels: Number(v) || 1 })}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: n === 1 ? 'Direct manager' : `${n} levels up` }))} />
        )}
        {approver.type === 'role' && (
          <div className="space-y-3">
            <SelectField label="Role" numeric value={approver.roleId ?? null} onChange={(v) => setApprover({ roleId: v === null ? undefined : Number(v) })} options={(lookups?.roles || []).map((r) => ({ value: r.id, label: r.name }))} />
            <div className="flex items-center justify-between text-sm text-fg"><span>Only from the employee&apos;s sub-organization</span><Switch label="Same sub-organization" checked={approver.sameSubOrg !== false} onChange={(v) => setApprover({ sameSubOrg: v })} /></div>
            <div className="flex items-center justify-between text-sm text-fg"><span>Only from the employee&apos;s site</span><Switch label="Same site" checked={Boolean(approver.sameSite)} onChange={(v) => setApprover({ sameSite: v })} /></div>
          </div>
        )}
        {approver.type === 'employee' && (
          <EmployeeSearch label="Employees" multiple value={selected}
            onChange={(list) => { onEmployees(list); setApprover({ employeeIds: list.map((e) => e.id) }); }} />
        )}
        {approver.type === 'permission' && (
          <SelectField label="Permission" value={approver.permission ?? null} onChange={(v) => setApprover({ permission: v ? String(v) : undefined })} options={type.permissionOptions.map((p) => ({ value: p.code, label: p.label }))} />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Approval rule" value={step.mode} onChange={(v) => v && onChange({ ...step, mode: v as StepMode, quorum: v === 'quorum' ? step.quorum || 2 : null })} options={Object.entries(MODE_LABEL).map(([value, label]) => ({ value, label }))} />
          {step.mode === 'quorum' && <TextField label="How many must approve" type="number" min={1} value={String(step.quorum ?? 2)} onChange={(v) => onChange({ ...step, quorum: Number(v) || 1 })} />}
        </div>

        {!isLast(index, count) && (
          <SelectField label="If nobody is found" value={step.ifNobody} onChange={(v) => v && onChange({ ...step, ifNobody: v as FlowStep['ifNobody'] })}
            options={[{ value: 'org_admins', label: 'Send to organization admins' }, { value: 'skip', label: 'Skip this step' }]} />
        )}

        {!isLast(index, count) && type.facts.length > 0 && (
          <div>
            <FieldLabel
              label="Run this step only when"
              aside={
                <button
                  type="button"
                  onClick={addCondition}
                  className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md border border-line bg-surface px-2 text-xs font-medium text-fg shadow-xs transition-colors hover:bg-bg-subtle active:scale-[0.98]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add condition</span>
                </button>
              }
            />
            <div className="space-y-2">
              {when.map((c, i) => {
                const def = type.facts.find((f) => f.key === c.fact);
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-bg-subtle p-2">
                    <select value={c.fact} onChange={(e) => { const f = type.facts.find((x) => x.key === e.target.value); patchCondition(i, { fact: e.target.value, op: f?.type === 'number' ? 'gt' : 'eq', value: f?.type === 'boolean' ? true : 0 }); }} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm text-fg">
                      {type.facts.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                    <select value={c.op} onChange={(e) => patchCondition(i, { op: e.target.value as Operator })} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm text-fg">
                      {(def?.type === 'number' ? (['gt', 'gte', 'lt', 'lte', 'eq', 'ne'] as Operator[]) : (['eq', 'ne'] as Operator[])).map((o) => <option key={o} value={o}>{OPERATOR_LABEL[o]}</option>)}
                    </select>
                    {def?.type === 'boolean' ? (
                      <select value={String(c.value)} onChange={(e) => patchCondition(i, { value: e.target.value === 'true' })} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm text-fg">
                        <option value="true">Yes</option><option value="false">No</option>
                      </select>
                    ) : (
                      <input type={def?.type === 'number' ? 'number' : 'text'} value={String(c.value)} onChange={(e) => patchCondition(i, { value: def?.type === 'number' ? Number(e.target.value) : e.target.value })} className="h-9 w-24 rounded-lg border border-line bg-surface px-2 text-sm text-fg" />
                    )}
                    <button type="button" aria-label="Remove condition" onClick={() => setWhen(when.filter((_, k) => k !== i))} className="ml-auto rounded p-1 text-fg-muted hover:bg-surface"><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
              {when.length === 0 && <p className="text-xs text-fg-muted">This step always runs.</p>}
            </div>
          </div>
        )}
        {errors.map((m) => <p key={m} className="text-xs font-medium text-[var(--tt-danger)]">{m}</p>)}
      </div>
    </div>
  );
}
