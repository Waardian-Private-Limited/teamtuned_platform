'use client';

import React from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { APPROVAL_LEVEL_LABELS } from '../../../constants/roster.constants';
import type { ApprovalLevel, ApprovalLevelType } from '../../../types/roster.types';
import { describeChain } from '../../../utils/teamTree';
import { EmployeePicker } from '../../catalog-shared/EmployeePicker';
import { btnSecondary, iconBtn, miniInput, personName } from '../../catalog-shared/catalogUi';
import type { TeamDetailTabProps } from './TeamTabProps';
import { TabFooter } from './TabFooter';

const TYPES: ApprovalLevelType[] = ['unit_manager', 'reporting_manager', 'permission', 'employee'];
const MAX_LEVELS = 6;

export function ApprovalsTab({ editor, detail, units }: TeamDetailTabProps) {
  const [chain, setChain] = React.useState<ApprovalLevel[]>(detail.approval_chain ?? []);
  const [names, setNames] = React.useState<Record<number, string>>(() => {
    const known: Record<number, string> = {};
    detail.members.forEach((m) => (known[m.employee_id] = m.name));
    detail.managers.forEach((m) => (known[m.employee_id] = m.name));
    return known;
  });
  const nameOf = (id: number) => names[id];
  const parent = units.find((u) => u.id === detail.parent_unit_id);
  const inheritsFrom = parent ? `Inherited from ${parent.name}` : 'Default';

  const patch = (i: number, level: ApprovalLevel) => setChain((c) => c.map((l, idx) => (idx === i ? level : l)));
  const move = (i: number, d: -1 | 1) => setChain((c) => {
    const j = i + d;
    if (j < 0 || j >= c.length) return c;
    const next = [...c];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const incomplete = chain.some((l) => l.type === 'employee' && !l.employeeId);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div>
        <h4 className="text-sm font-bold text-fg">Who approves swaps and open-shift claims</h4>
        <p className="mb-3 text-[11px] text-fg-muted">Requests go through each step in order. Everyone in the list must approve before the roster changes.</p>

        {chain.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line px-3 py-4 text-xs text-fg-muted">
            <p className="font-semibold text-fg">{inheritsFrom}</p>
            <p className="mt-1">{describeChain(detail.effective_approval_chain, nameOf)}</p>
            <p className="mt-2">Add a step below to give this team its own approval chain.</p>
          </div>
        ) : (
          <ol className="space-y-2">
            {chain.map((level, i) => (
              <li key={i} className="rounded-lg border border-line bg-surface p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fg text-[11px] font-bold text-fg-inverted">{i + 1}</span>
                  <select
                    value={level.type}
                    aria-label={`Approval step ${i + 1}`}
                    onChange={(e) => patch(i, { type: e.target.value as ApprovalLevelType, employeeId: null })}
                    className={cx(miniInput, 'min-w-0 flex-1')}
                  >
                    {TYPES.map((t) => <option key={t} value={t}>{APPROVAL_LEVEL_LABELS[t]}</option>)}
                  </select>
                  <div className="flex items-center">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" className={iconBtn}><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" disabled={i === chain.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className={iconBtn}><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setChain((c) => c.filter((_, idx) => idx !== i))} aria-label="Remove step" className={cx(iconBtn, 'hover:text-[var(--tt-danger)]')}><X className="h-4 w-4" /></button>
                  </div>
                </div>
                {level.type === 'employee' && (
                  <div className="mt-2 pl-8">
                    {level.employeeId ? (
                      <p className="flex items-center gap-2 text-sm text-fg">
                        <span className="font-semibold">{names[level.employeeId] ?? 'Chosen person'}</span>
                        <button type="button" onClick={() => patch(i, { type: 'employee', employeeId: null })} className="text-xs font-semibold text-fg-muted underline-offset-4 hover:underline">Change</button>
                      </p>
                    ) : (
                      <EmployeePicker
                        placeholder="Choose the approver…"
                        onPick={(e) => {
                          setNames((n) => ({ ...n, [e.id]: personName(e) }));
                          patch(i, { type: 'employee', employeeId: e.id });
                        }}
                      />
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={chain.length >= MAX_LEVELS} onClick={() => setChain((c) => [...c, { type: 'unit_manager' }])} className={btnSecondary}>
            <Plus className="h-3.5 w-3.5" /> Add step
          </button>
          {chain.length > 0 && (
            <button type="button" onClick={() => setChain([])} className={btnSecondary}>Use {parent ? "parent's" : 'default'} chain</button>
          )}
        </div>

        <TabFooter
          label="Save approvals"
          saving={editor.saving === 'approvals'}
          disabled={incomplete}
          error={incomplete ? 'Choose a person for each “A specific person” step.' : editor.errors.approvals?.message}
          onSave={() => editor.saveChain(chain.length ? chain : null)}
        />
      </div>

      <aside className="h-fit rounded-xl border border-line bg-bg-subtle/60 p-4 text-xs leading-relaxed text-fg-muted">
        <h4 className="text-sm font-bold text-fg">Chain in effect today</h4>
        <p className="mt-2 text-fg">{describeChain(detail.effective_approval_chain, nameOf)}</p>
        <p className="mt-1">{detail.approval_chain?.length ? 'Set on this team.' : inheritsFrom + '.'}</p>
        <p className="mt-3">Up to {MAX_LEVELS} steps. Changes apply to new requests; requests already in progress keep the chain they started with.</p>
      </aside>
    </div>
  );
}
