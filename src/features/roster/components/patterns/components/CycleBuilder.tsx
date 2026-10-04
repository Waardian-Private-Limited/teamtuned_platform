'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Copy, Minus, Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { ShiftOpt } from '../../../hooks/useTeamsCatalog';
import { cellClass, cellLabel, cellTitle, cycleStats, rotateCycle, shiftMap, type CycleCell } from '../../../utils/patternCycle';
import { btnSecondary } from '../../catalog-shared/catalogUi';

const MAX_DAYS = 56;

interface Props {
  cycle: CycleCell[];
  shifts: ShiftOpt[];
  error?: string;
  onChange: (c: CycleCell[]) => void;
}

export function CycleBuilder({ cycle, shifts, error, onChange }: Props) {
  const [selected, setSelected] = React.useState<number | null>(null);
  const map = React.useMemo(() => shiftMap(shifts), [shifts]);
  const stats = cycleStats(cycle, map);
  const setCell = (i: number, v: CycleCell) => onChange(cycle.map((c, idx) => (idx === i ? v : c)));

  return (
    <div>
      <div className={cx('rounded-xl border p-3', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          <button type="button" disabled={cycle.length >= MAX_DAYS} onClick={() => { onChange([...cycle, 'OFF']); setSelected(cycle.length); }} className={btnSecondary}><Plus className="h-3.5 w-3.5" /> Add day</button>
          <button type="button" disabled={cycle.length <= 1} onClick={() => { onChange(cycle.slice(0, -1)); setSelected(null); }} className={btnSecondary}><Minus className="h-3.5 w-3.5" /> Remove last day</button>
          <button type="button" disabled={cycle.length === 0 || cycle.length * 2 > MAX_DAYS} onClick={() => onChange([...cycle, ...cycle])} className={btnSecondary} title="Repeat the sequence once more"><Copy className="h-3.5 w-3.5" /> Repeat</button>
          <button type="button" disabled={cycle.length < 2} onClick={() => onChange(rotateCycle(cycle, -1))} className={btnSecondary} aria-label="Shift everything one day later"><ChevronRight className="h-3.5 w-3.5" /> Rotate</button>
          <button type="button" disabled={cycle.length < 2} onClick={() => onChange(rotateCycle(cycle, 1))} className={btnSecondary} aria-label="Shift everything one day earlier"><ChevronLeft className="h-3.5 w-3.5" /> Rotate back</button>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1.5">
          {cycle.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(selected === i ? null : i)}
              title={`Day ${i + 1}: ${cellTitle(c, map)}`}
              aria-pressed={selected === i}
              className={cx('flex h-12 flex-col items-center justify-center rounded-lg text-xs font-bold transition-shadow', cellClass(c, map), selected === i && 'ring-2 ring-fg ring-offset-1')}
            >
              <span>{cellLabel(c, map)}</span>
              <span className="text-[9px] font-medium opacity-70">Day {i + 1}</span>
            </button>
          ))}
        </div>

        {selected !== null && selected < cycle.length && (
          <div className="mt-3 rounded-lg border border-line bg-bg-subtle/60 p-2.5">
            <p className="mb-1.5 text-xs font-semibold text-fg">Day {selected + 1} is…</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setCell(selected, 'OFF')} className={cx('h-8 rounded-lg border border-dashed px-3 text-xs font-semibold', cycle[selected] === 'OFF' ? 'border-fg text-fg' : 'border-line-strong text-fg-muted hover:bg-bg-subtle')}>Day off</button>
              {shifts.length === 0 && <span className="text-xs text-fg-muted">No active shifts yet. Create shifts first.</span>}
              {shifts.map((s) => (
                <button key={s.value} type="button" onClick={() => setCell(selected, s.value)} className={cx('h-8 rounded-lg px-3 text-xs font-semibold', cellClass(s.value, map), cycle[selected] === s.value && 'ring-2 ring-fg ring-offset-1')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-fg-muted">
          Works {stats.working} of {stats.total} days{stats.weeklyHours > 0 ? ` · about ${stats.weeklyHours} hours a week` : ''}. The cycle repeats from day 1 once it ends.
        </p>
      )}
    </div>
  );
}
