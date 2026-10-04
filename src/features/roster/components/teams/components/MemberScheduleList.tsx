'use client';

import React from 'react';
import { Shuffle, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Pattern } from '../../../types/roster.types';
import type { ShiftOpt } from '../../../hooks/useTeamsCatalog';
import { kindOf, type MemberRow, type ScheduleKind } from '../../../hooks/useTeamMembersDraft';
import { btnSecondary, iconBtn, miniInput } from '../../catalog-shared/catalogUi';

interface Props {
  rows: MemberRow[];
  patterns: Pattern[];
  shifts: ShiftOpt[];
  onRemove: (id: number) => void;
  onSchedule: (ids: number[], kind: ScheduleKind, refId: number | null) => void;
  onOffset: (id: number, offset: number) => void;
  onStagger: (ids: number[]) => void;
}

const KIND_LABEL: Record<ScheduleKind, string> = { demand: 'Follows demand', pattern: 'Rotation pattern', fixed: 'Fixed shift' };

export function MemberScheduleList({ rows, patterns, shifts, onRemove, onSchedule, onOffset, onStagger }: Props) {
  const [picked, setPicked] = React.useState<Set<number>>(new Set());
  const ids = [...picked].filter((id) => rows.some((r) => r.employeeId === id));
  const toggle = (id: number) => setPicked((p) => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const allOn = rows.length > 0 && ids.length === rows.length;
  const canStagger = ids.some((id) => rows.find((r) => r.employeeId === id)?.patternId);

  const bulk = (v: string) => {
    if (v === 'demand') onSchedule(ids, 'demand', null);
    else if (v.startsWith('p:')) onSchedule(ids, 'pattern', Number(v.slice(2)));
    else if (v.startsWith('s:')) onSchedule(ids, 'fixed', Number(v.slice(2)));
  };

  if (rows.length === 0) {
    return <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-fg-muted">No one chosen by hand yet. Search above to add someone, or use &ldquo;Choose these people by hand&rdquo; on the list of matches.</p>;
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-fg">
          <input type="checkbox" checked={allOn} onChange={() => setPicked(allOn ? new Set() : new Set(rows.map((r) => r.employeeId)))} />
          Select all
        </label>
        {ids.length > 0 && (
          <>
            <select defaultValue="" onChange={(e) => { bulk(e.target.value); e.target.value = ''; }} className={cx(miniInput, 'w-auto')} aria-label="Set schedule for selected people">
              <option value="" disabled>Set schedule for {ids.length} selected…</option>
              <option value="demand">Follows demand</option>
              {patterns.map((p) => <option key={`p${p.id}`} value={`p:${p.id}`}>Rotation: {p.name}</option>)}
              {shifts.map((s) => <option key={`s${s.value}`} value={`s:${s.value}`}>Fixed: {s.label}</option>)}
            </select>
            <button type="button" disabled={!canStagger} onClick={() => onStagger(ids)} className={btnSecondary} title="Spreads start points across the selected people so crews rotate in different phases">
              <Shuffle className="h-3.5 w-3.5" /> Stagger
            </button>
          </>
        )}
      </div>
      <ul className="divide-y divide-line/70 rounded-lg border border-line bg-surface">
        {rows.map((r) => {
          const kind = kindOf(r);
          const cycle = patterns.find((p) => p.id === r.patternId)?.cycle_days ?? 0;
          return (
            <li key={r.employeeId} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <input type="checkbox" checked={picked.has(r.employeeId)} onChange={() => toggle(r.employeeId)} aria-label={`Select ${r.name}`} />
              <div className="min-w-[8rem] flex-1">
                <p className="truncate text-sm font-semibold text-fg">{r.name}</p>
                {r.code && <p className="text-[11px] text-fg-muted">{r.code}</p>}
              </div>
              <select
                value={kind}
                aria-label="Schedule type"
                onChange={(e) => {
                  const k = e.target.value as ScheduleKind;
                  onSchedule([r.employeeId], k, k === 'pattern' ? patterns[0]?.id ?? null : k === 'fixed' ? shifts[0]?.value ?? null : null);
                }}
                className={cx(miniInput, 'w-40')}
              >
                {(Object.keys(KIND_LABEL) as ScheduleKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
              {kind === 'pattern' && (
                <>
                  <select value={r.patternId ?? ''} onChange={(e) => onSchedule([r.employeeId], 'pattern', Number(e.target.value))} className={cx(miniInput, 'w-40')} aria-label="Rotation pattern">
                    {patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-[11px] text-fg-muted">
                    Starts on day
                    <input type="number" min={1} max={cycle || 56} value={r.offset + 1} onChange={(e) => onOffset(r.employeeId, Math.max(0, (Number(e.target.value) || 1) - 1))} className={cx(miniInput, 'w-16')} />
                  </label>
                </>
              )}
              {kind === 'fixed' && (
                <select value={r.fixedTemplateId ?? ''} onChange={(e) => onSchedule([r.employeeId], 'fixed', Number(e.target.value))} className={cx(miniInput, 'w-40')} aria-label="Fixed shift">
                  {shifts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              )}
              <button type="button" onClick={() => onRemove(r.employeeId)} aria-label={`Remove ${r.name}`} className={iconBtn}><X className="h-4 w-4" /></button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
