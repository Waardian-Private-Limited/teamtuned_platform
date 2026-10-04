'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { STATUS_LABELS } from '../../../constants/roster.constants';
import type { OpenShift, ShiftInfo } from '../../../types/roster.types';
import { useRosterBoardOpenShifts } from '../../../hooks/useRosterBoardOpenShifts';
import { formatDay } from '../../../utils/rosterTime';

interface Props {
  rosterId: number;
  unitId: number | undefined;
  openShifts: OpenShift[];
  templates: ShiftInfo[];
  dates: string[];
  canEdit: boolean;
  canForce: boolean;
  refresh: () => Promise<unknown>;
}

const field = 'h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';

export function OpenShiftsPanel({ rosterId, unitId, openShifts, templates, dates, canEdit, canForce, refresh }: Props) {
  const os = useRosterBoardOpenShifts(rosterId, unitId, refresh);
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState('');
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [needed, setNeeded] = useState(1);
  const [pickFor, setPickFor] = useState<number | null>(null);
  const tplMap = new Map(templates.map((t) => [t.id, t]));
  const shifts = [...openShifts].sort((a, b) => a.work_date.localeCompare(b.work_date));

  const submit = async () => {
    if (!date || !templateId) return;
    if (await os.create({ date, templateId, needed, isOvertime: false })) {
      setAdding(false);
      setDate('');
      setTemplateId('');
      setNeeded(1);
    }
  };

  return (
    <div className="space-y-3 p-4">
      {canEdit && !adding && (
        <button type="button" onClick={() => setAdding(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-semibold text-fg hover:bg-bg-subtle">
          <Plus className="h-3.5 w-3.5" />
          Add open shift
        </button>
      )}
      {adding && (
        <div className="space-y-2 rounded-lg border border-line p-3">
          <select aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} className={field}>
            <option value="">Pick a day</option>
            {dates.map((d) => <option key={d} value={d}>{formatDay(d, { weekday: 'short', day: 'numeric', month: 'short' })}</option>)}
          </select>
          <select aria-label="Shift" value={templateId} onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : '')} className={field}>
            <option value="">Pick a shift</option>
            {templates.filter((t) => t.status === 'active').map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
          </select>
          <input aria-label="People needed" type="number" min={1} max={50} value={needed} onChange={(e) => setNeeded(Math.max(1, Number(e.target.value) || 1))} className={field} />
          {os.createError && <p className="text-xs font-medium text-[var(--tt-danger)]">{os.createError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(false)} className="h-8 flex-1 rounded-lg border border-line text-xs font-semibold text-fg hover:bg-bg-subtle">Cancel</button>
            <button type="button" disabled={!date || !templateId || os.creating} onClick={submit} className="h-8 flex-1 rounded-lg bg-[var(--tt-primary)] text-xs font-semibold text-[var(--tt-on-primary)] disabled:opacity-40">
              {os.creating ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {!shifts.length && !adding && <p className="py-6 text-center text-xs text-fg-muted">No open shifts in this roster.</p>}

      <ul className="space-y-2">
        {shifts.map((s) => {
          const t = tplMap.get(s.shift_template_id);
          const isOpen = s.status === 'open';
          const refused = os.refusal?.shiftId === s.id ? os.refusal : null;
          return (
            <li key={s.id} className="rounded-lg border border-line p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-fg">{s.shift_name || t?.name || 'Shift'}</p>
                  <p className="text-[11px] text-fg-muted">{formatDay(s.work_date, { weekday: 'short', day: 'numeric', month: 'short' })} · {s.filled}/{s.needed} filled</p>
                </div>
                <span className={cx('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', isOpen ? 'border-line-strong text-fg' : 'border-line text-fg-muted')}>{STATUS_LABELS[s.status] || s.status}</span>
              </div>
              {isOpen && canEdit && (
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPickFor(pickFor === s.id ? null : s.id);
                      if (!os.candidates[s.id]) os.loadCandidates(s);
                    }}
                    className="h-7 rounded-md border border-line px-2 text-[11px] font-semibold text-fg hover:bg-bg-subtle"
                  >
                    Assign
                  </button>
                  <button type="button" disabled={os.busyId === s.id} onClick={() => os.close(s)} className="h-7 rounded-md border border-line px-2 text-[11px] font-semibold text-fg-muted hover:bg-bg-subtle disabled:opacity-40">Close</button>
                </div>
              )}
              {pickFor === s.id && (
                <ul className="mt-2 divide-y divide-line/60 rounded-lg border border-line">
                  {os.loadingCandidatesId === s.id && <li className="px-3 py-2 text-xs text-fg-muted">Finding people…</li>}
                  {os.candidates[s.id]?.length === 0 && <li className="px-3 py-2 text-xs text-fg-muted">Nobody is available.</li>}
                  {os.candidates[s.id]?.slice(0, 8).map((c) => (
                    <li key={c.employeeId} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                      <span className="min-w-0 truncate font-semibold text-fg">
                        {c.name}
                        {c.overtime && <span className="ml-1.5 rounded border border-line-strong px-1 text-[10px] text-fg-muted">overtime</span>}
                      </span>
                      <button type="button" disabled={os.busyId === s.id} onClick={() => os.assign(s, c.employeeId)} className="shrink-0 rounded-md border border-line px-2 py-1 font-semibold text-fg hover:bg-bg-subtle disabled:opacity-40">Assign</button>
                    </li>
                  ))}
                </ul>
              )}
              {refused && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-[var(--tt-danger)]">{refused.message}</p>
                  {canForce && (
                    <button type="button" onClick={() => os.assign(s, refused.employeeId, true)} className="mt-1 text-xs font-semibold text-fg underline-offset-4 hover:underline">Assign anyway</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
