'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/payrollRuns.api';
import type { PayLine } from '../../types/payrollRuns.model';
import { actionBtn } from './controls';

type Step = { step: string; value: string };
interface Draft { amount: string; steps: Step[] }

const field = 'h-8 w-full min-w-0 rounded-md border border-line bg-surface px-2 text-xs text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] disabled:opacity-50';
const sameSteps = (a: Step[], b: Step[]) => a.length === b.length && a.every((s, i) => s.step === b[i].step && s.value === b[i].value);

/**
 * Edit mode of an Earnings / Deductions card: every line's amount and its "how it was calculated" rows can be changed,
 * rows added or removed. Save sends only the lines that changed; the entry is recalculated and the lines then read like
 * any calculated line. Reset puts the edited lines of this card back to the calculated amounts.
 */
export function LinesEditor({ lines, runId, employeeId, stage, onDone }: { lines: PayLine[]; runId: number; employeeId: number; stage: string; onDone: (changed: boolean) => void }) {
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>(() =>
    Object.fromEntries(lines.map((l) => [l.key, { amount: String(l.amount), steps: l.steps.map((s) => ({ ...s })) }]))
  );
  const [busy, setBusy] = React.useState<'save' | 'reset' | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const patch = (key: string, next: Partial<Draft>) => setDrafts((d) => ({ ...d, [key]: { ...d[key], ...next } }));
  const changed = lines.filter((l) => {
    const d = drafts[l.key];
    return Number(d.amount) !== l.amount || !sameSteps(d.steps, l.steps);
  });
  const invalid = lines.find((l) => {
    const v = drafts[l.key].amount.trim();
    return v === '' || !/^\d+(\.\d{1,2})?$/.test(v);
  });
  const edited = lines.filter((l) => l.edited);

  async function save() {
    if (invalid) { setError(`Enter a valid amount for ${invalid.label} (no negative, at most two decimals).`); return; }
    setBusy('save');
    setError(null);
    try {
      const edits: api.LineEditDto[] = changed.map((l) => {
        const d = drafts[l.key];
        const stepsChanged = !sameSteps(d.steps, l.steps);
        return { key: l.key, amount: Number(d.amount), ...(stepsChanged ? { steps: d.steps.filter((s) => s.step.trim()) } : {}) };
      });
      const r = await api.saveLineOverrides({ run_id: runId, employee_id: employeeId, edits });
      showSuccess(r.message);
      onDone(true);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    setBusy('reset');
    try {
      const r = await api.resetLineOverrides({ run_id: runId, employee_id: employeeId, keys: edited.map((l) => l.key) });
      showSuccess(r.message);
      onDone(true);
    } catch (e) {
      showError(messageOf(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <ul className="divide-y divide-line/70">
        {lines.map((l) => {
          const d = drafts[l.key];
          return (
            <li key={l.key} className="space-y-2 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{l.label}</span>
                <div className="flex w-36 shrink-0 items-center rounded-md border border-line bg-surface focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
                  <span className="pl-2 text-xs font-semibold text-fg-muted">₹</span>
                  <input
                    inputMode="decimal"
                    aria-label={`${l.label} amount`}
                    value={d.amount}
                    disabled={busy !== null}
                    onChange={(e) => patch(l.key, { amount: e.target.value.replace(/[^\d.]/g, '') })}
                    className="h-8 w-full min-w-0 bg-transparent px-1.5 text-right text-sm font-semibold tabular-nums text-fg outline-none"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-line bg-bg-subtle/60 p-2.5">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">How it was calculated</p>
                <div className="space-y-1.5">
                  {d.steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        aria-label="Step"
                        value={s.step}
                        maxLength={80}
                        disabled={busy !== null}
                        onChange={(e) => patch(l.key, { steps: d.steps.map((x, j) => (j === i ? { ...x, step: e.target.value } : x)) })}
                        className={field}
                      />
                      <input
                        aria-label="Value"
                        value={s.value}
                        maxLength={120}
                        disabled={busy !== null}
                        onChange={(e) => patch(l.key, { steps: d.steps.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })}
                        className={`${field} max-w-[9rem] text-right tabular-nums`}
                      />
                      <button
                        type="button"
                        aria-label="Remove row"
                        disabled={busy !== null}
                        onClick={() => patch(l.key, { steps: d.steps.filter((_, j) => j !== i) })}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg disabled:opacity-40"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
                {d.steps.length < 12 && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => patch(l.key, { steps: [...d.steps, { step: '', value: '' }] })}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" aria-hidden /> Add row
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-line px-4 py-3">
        {error && <p className="mb-2 text-xs font-medium text-[var(--tt-danger,#b42318)]">{error}</p>}
        <p className="mb-2.5 text-[11px] text-fg-muted">Other lines are not recalculated from these changes: edit them too if they should change.</p>
        {stage !== 'draft' && (
          <p className="mb-2.5 text-[11px] font-medium text-fg">
            This payroll is {stage}. Saving changes this employee&apos;s lines and net pay now; the payslip shows them the next time it is opened or downloaded.
            {stage === 'paid' ? ' The salary was already paid: the difference is flagged on the entry.' : ''}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {edited.length > 0 && (
            <button type="button" className={`${actionBtn.secondary} mr-auto`} disabled={busy !== null} onClick={reset}>
              {busy === 'reset' ? 'Resetting…' : 'Reset to calculated'}
            </button>
          )}
          <button type="button" className={actionBtn.secondary} disabled={busy !== null} onClick={() => onDone(false)}>Cancel</button>
          <button type="button" className={actionBtn.primary} disabled={busy !== null || changed.length === 0} onClick={save}>
            {busy === 'save' ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
