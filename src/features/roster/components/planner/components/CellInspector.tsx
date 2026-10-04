'use client';

import { useEffect, useState } from 'react';
import { Lock, LockOpen, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../../api/roster.api';
import { KIND_LABELS } from '../../../constants/roster.constants';
import type { Assignment, BoardEmployee, Candidate, CellKind, ShiftInfo } from '../../../types/roster.types';
import { parseCellKey } from '../../../utils/rosterBoard';
import { clockOf, formatDay, formatRange } from '../../../utils/rosterTime';
import { toneOf, TONE_CLASS } from '../../../utils/shiftTone';

interface Actions {
  setShiftFor: (keys: string[], templateId: number) => Promise<boolean>;
  setKindFor: (keys: string[], kind: CellKind) => Promise<boolean>;
  toggleLock: (keys: string[]) => Promise<boolean>;
  toggleOvertime: (keys: string[]) => Promise<boolean>;
  clearCells: (keys: string[]) => Promise<boolean>;
  replaceWith: (key: string, c: Candidate) => Promise<boolean>;
}

interface Props {
  rosterId: number;
  keys: string[];
  cellMap: Map<string, Assignment[]>;
  employees: Map<number, BoardEmployee>;
  templates: Map<number, ShiftInfo>;
  activeTemplates: ShiftInfo[];
  canEdit: boolean;
  actions: Actions;
}

const KINDS: CellKind[] = ['off', 'leave', 'holiday', 'unavailable', 'comp_off'];

function reasonText(a: Assignment): string {
  const r = a.explain?.reason;
  if (r === 'overtime_cover') return 'Added as overtime because nobody else was free to cover this shift.';
  if (r === 'lowest_cost') return 'Best fit for this shift after checking rest, fairness, preferences and weekly hours.';
  if (r) return r.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) + '.';
  const bySource: Record<string, string> = {
    manual: 'Set by hand, so it stays when the roster is regenerated.',
    pattern: 'Comes from the work pattern assigned to this person.',
    fixed: 'This person has a fixed shift.',
    swap: 'Came from an approved swap.',
    open_pickup: 'Picked up from an open shift.',
    leave_sync: 'Marked from approved leave.',
  };
  return bySource[a.source] || 'Placed by the planner.';
}

function Btn({ children, active, onClick, disabled, danger }: { children: React.ReactNode; active?: boolean; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'border-fg bg-fg text-fg-inverted' : 'border-line bg-surface text-fg hover:bg-bg-subtle',
        danger && 'hover:text-[var(--tt-danger)]'
      )}
    >
      {children}
    </button>
  );
}

export function CellInspector({ rosterId, keys, cellMap, employees, templates, activeTemplates, canEdit, actions }: Props) {
  const [showWhy, setShowWhy] = useState(false);
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const [loadingCands, setLoadingCands] = useState(false);
  const [candError, setCandError] = useState('');
  const single = keys.length === 1 ? keys[0] : null;

  useEffect(() => {
    setShowWhy(false);
    setCands(null);
    setCandError('');
  }, [single]);

  if (!keys.length) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm font-semibold text-fg">Select a cell</p>
        <p className="mt-1 text-xs text-fg-muted">Click a cell to see its details or change it. Hold Shift or Ctrl to select several.</p>
      </div>
    );
  }

  const first = parseCellKey(keys[0]);
  const emp = employees.get(first.employeeId);
  const prim = (k: string) => cellMap.get(k)?.find((a) => a.seq === 1) ?? cellMap.get(k)?.[0];
  const cur = single ? prim(single) : undefined;
  const tpl = cur?.shift_template_id ? templates.get(cur.shift_template_id) : undefined;
  const assigned = keys.map(prim).filter((a): a is Assignment => Boolean(a));
  const allLocked = assigned.length > 0 && assigned.every((a) => a.locked);
  const shifts = assigned.filter((a) => a.kind === 'shift');
  const allOt = shifts.length > 0 && shifts.every((a) => a.is_overtime);

  const suggest = async () => {
    if (!single || !cur?.shift_template_id) return;
    setLoadingCands(true);
    setCandError('');
    try {
      const { employeeId, date } = parseCellKey(single);
      const res = await api.suggestReplacement(rosterId, { date, templateId: cur.shift_template_id, employeeId, roleId: emp?.role_id });
      setCands(res.candidates);
    } catch (err) {
      setCandError(messageOf(err));
    } finally {
      setLoadingCands(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-sm font-bold text-fg">{single ? emp?.name || `Employee ${first.employeeId}` : `${keys.length} cells selected`}</p>
        <p className="text-xs text-fg-muted">
          {single ? formatDay(first.date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Changes apply to every selected cell'}
        </p>
      </div>

      {single && (
        <div className="rounded-lg border border-line bg-bg-subtle px-3 py-2.5">
          {cur ? (
            <div className="flex items-center gap-2.5">
              {tpl && cur.kind === 'shift' ? (
                <span className={cx('inline-flex h-7 min-w-9 items-center justify-center rounded-md px-1 text-xs font-bold', TONE_CLASS[toneOf(tpl)])}>{tpl.code}</span>
              ) : null}
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-fg">{cur.kind === 'shift' ? tpl?.name || 'Shift' : KIND_LABELS[cur.kind]}</p>
                {cur.kind === 'shift' && tpl && (
                  <p className="text-fg-muted">{cur.start_at ? `${clockOf(cur.start_at)} – ${clockOf(cur.end_at)}` : formatRange(tpl.start_min, tpl.duration_min)}</p>
                )}
                <p className="text-fg-muted">
                  {[cur.locked ? 'Locked' : '', cur.is_overtime ? 'Overtime' : '', cur.earns_comp_off ? 'Earns comp off' : ''].filter(Boolean).join(' · ') || 'Not locked'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-fg-muted">Nothing planned for this day.</p>
          )}
        </div>
      )}

      {canEdit && (
        <>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Shift</p>
            <div className="flex flex-wrap gap-1.5">
              {activeTemplates.map((t, i) => (
                <Btn key={t.id} active={Boolean(single && cur?.kind === 'shift' && cur.shift_template_id === t.id)} onClick={() => actions.setShiftFor(keys, t.id)}>
                  <span className="font-bold">{t.code}</span>
                  <span className="hidden font-medium opacity-70 sm:inline">{t.name}</span>
                  {i < 9 && <span className="text-[10px] opacity-50">{i + 1}</span>}
                </Btn>
              ))}
              {!activeTemplates.length && <p className="text-xs text-fg-muted">No active shifts.</p>}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Mark as</p>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <Btn key={k} active={Boolean(single && cur?.kind === k)} onClick={() => actions.setKindFor(keys, k)}>{KIND_LABELS[k]}</Btn>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Btn onClick={() => actions.toggleLock(keys)} disabled={!assigned.length}>
              {allLocked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {allLocked ? 'Unlock' : 'Lock'}
            </Btn>
            <Btn onClick={() => actions.toggleOvertime(keys)} disabled={!shifts.length} active={allOt}>Overtime</Btn>
            <Btn onClick={() => actions.clearCells(keys)} disabled={!assigned.length} danger>
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Btn>
          </div>
        </>
      )}

      {single && cur && (
        <div className="space-y-2 border-t border-line pt-3">
          <button type="button" onClick={() => setShowWhy((v) => !v)} className="text-xs font-semibold text-fg underline-offset-4 hover:underline">
            {showWhy ? 'Hide explanation' : cur.kind === 'shift' ? 'Why this shift?' : 'Why this?'}
          </button>
          {showWhy && (
            <div className="rounded-lg border border-line p-3 text-xs">
              <p className="text-fg">{reasonText(cur)}</p>
              {cur.explain && cur.explain.cost !== undefined && <p className="mt-1.5 text-fg-muted">Fit cost: {Math.round(cur.explain.cost * 10) / 10} (lower is better)</p>}
              {cur.explain?.alternatives?.length ? (
                <div className="mt-2">
                  <p className="font-semibold text-fg">Other people considered</p>
                  <ul className="mt-1 space-y-0.5 text-fg-muted">
                    {cur.explain.alternatives.map((alt) => (
                      <li key={alt.employeeId}>
                        {employees.get(alt.employeeId)?.name || `Employee ${alt.employeeId}`}
                        {alt.overtime ? ' · would be overtime' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
          {cur.kind === 'shift' && (
            <>
              <button type="button" onClick={suggest} disabled={loadingCands} className="block text-xs font-semibold text-fg underline-offset-4 hover:underline disabled:opacity-50">
                {loadingCands ? 'Finding people…' : 'Suggest replacement'}
              </button>
              {candError && <p className="text-xs font-medium text-[var(--tt-danger)]">{candError}</p>}
              {cands && (
                <ul className="divide-y divide-line/60 rounded-lg border border-line">
                  {cands.length === 0 && <li className="px-3 py-2 text-xs text-fg-muted">Nobody else is available for this shift.</li>}
                  {cands.slice(0, 8).map((c) => (
                    <li key={c.employeeId} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                      <span className="min-w-0 truncate font-semibold text-fg">
                        {c.name}
                        {c.overtime && <span className="ml-1.5 rounded border border-line-strong px-1 text-[10px] font-semibold text-fg-muted">overtime</span>}
                      </span>
                      {canEdit && (
                        <button type="button" onClick={async () => {
                            if (single && (await actions.replaceWith(single, c))) setCands(null);
                          }} className="shrink-0 rounded-md border border-line px-2 py-1 font-semibold text-fg hover:bg-bg-subtle">
                          Swap in
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
