'use client';

import React from 'react';
import { AlertTriangle, ArrowRight, UserRound } from 'lucide-react';
import { cx } from '@/theme/tokens';
import * as api from '../api/approvals.api';
import { MODE_LABEL } from '../constants';
import type { EmployeeRef, FlowInput, Preview, RequestTypeDef } from '../types/approvals';
import { EmployeeSearch } from './EmployeeSearch';

interface Props { type: RequestTypeDef; draft: FlowInput | null; initialEmployee?: EmployeeRef | null }

export function ChainPreview({ type, draft, initialEmployee = null }: Props) {
  const [employee, setEmployee] = React.useState<EmployeeRef[]>(initialEmployee ? [initialEmployee] : []);
  const [facts, setFacts] = React.useState<Record<string, string>>({});
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const request = React.useRef(0);
  const key = JSON.stringify({ e: employee[0]?.id, facts, draft });

  React.useEffect(() => {
    const person = employee[0];
    if (!person) { setPreview(null); return; }
    const id = ++request.current;
    setLoading(true);
    const t = setTimeout(() => {
      const parsed: Record<string, unknown> = {};
      for (const f of type.facts) {
        const raw = facts[f.key];
        if (raw === undefined || raw === '') continue;
        parsed[f.key] = f.type === 'number' ? Number(raw) : f.type === 'boolean' ? raw === 'true' : raw;
      }
      api.previewChain({ requestType: type.type, employeeId: person.id, facts: parsed, flow: draft })
        .then((p) => { if (id === request.current) { setPreview(p); setError(null); } })
        .catch((e) => { if (id === request.current) { setPreview(null); setError(e.message || 'Could not preview'); } })
        .finally(() => id === request.current && setLoading(false));
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, type.type]);

  return (
    <div className="space-y-4">
      <EmployeeSearch label="Preview for employee" value={employee} onChange={(v) => setEmployee(v.slice(-1))} />
      {type.facts.length > 0 && employee.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {type.facts.map((f) => (
            <label key={f.key} className="text-xs font-semibold text-fg">
              {f.label}
              {f.type === 'boolean' ? (
                <select value={facts[f.key] ?? ''} onChange={(e) => setFacts({ ...facts, [f.key]: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm font-normal">
                  <option value="">Not set</option><option value="true">Yes</option><option value="false">No</option>
                </select>
              ) : (
                <input type={f.type === 'number' ? 'number' : 'text'} value={facts[f.key] ?? ''} onChange={(e) => setFacts({ ...facts, [f.key]: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm font-normal" placeholder="Not set" />
              )}
            </label>
          ))}
        </div>
      )}

      {!employee.length && <p className="text-sm text-fg-muted">Pick an employee to see who would approve their request.</p>}
      {error && <p className="text-sm font-medium text-[var(--tt-danger)]">{error}</p>}
      {preview && (
        <div className={cx('space-y-3', loading && 'opacity-60')}>
          <p className="text-xs text-fg-muted">
            {preview.flow ? <>Flow: <span className="font-semibold text-fg">{preview.flow.name}</span></> : <>No flow matches. Anyone with <span className="font-semibold text-fg">{type.permissionOptions[0]?.label}</span> can decide.</>}
          </p>
          <ol className="space-y-2">
            {preview.steps.map((s) => (
              <li key={s.index} className={cx('rounded-lg border border-line p-3', s.state === 'skipped' && 'border-dashed opacity-60')}>
                <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bg-subtle text-[11px]">{s.index + 1}</span>
                  {s.name}
                  {s.state === 'skipped' && <span className="text-xs font-normal text-fg-muted">skipped for these values</span>}
                  {s.state === 'conditional' && <span className="text-xs font-normal text-fg-muted">only when its condition holds</span>}
                </div>
                <p className="mt-0.5 text-[11px] text-fg-muted">{MODE_LABEL[s.mode]}{s.mode === 'quorum' ? ` (${s.quorum})` : ''}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.approvers.map((a) => (
                    <span key={a.employeeId} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle px-2 py-0.5 text-xs text-fg">
                      <UserRound className="h-3 w-3" />{a.name}
                      {a.delegatedFrom && <span className="inline-flex items-center gap-0.5 text-fg-muted"><ArrowRight className="h-3 w-3" />covering {a.delegatedFrom}</span>}
                    </span>
                  ))}
                  {s.permission && <span className="rounded-full border border-line bg-bg-subtle px-2 py-0.5 text-xs text-fg">Anyone with {s.permission}</span>}
                </div>
                {s.warning && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--tt-danger)]"><AlertTriangle className="h-3.5 w-3.5" />{s.warning}</p>}
              </li>
            ))}
          </ol>
          {preview.sla && <p className="text-xs text-fg-muted">Reminder after {preview.sla.remindAfterHours}h{preview.sla.escalateAfterHours ? `, escalates to the approver's manager after ${preview.sla.escalateAfterHours}h` : ''}.</p>}
        </div>
      )}
    </div>
  );
}
