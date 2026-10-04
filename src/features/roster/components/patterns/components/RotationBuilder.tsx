'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';
import type { ShiftOpt } from '../../../hooks/useTeamsCatalog';
import { buildRotation, rotationBlockLength, type CycleCell, type RotationStep } from '../../../utils/patternCycle';
import { btnPrimary, btnSecondary, miniInput } from '../../catalog-shared/catalogUi';
import { PatternStrip } from './PatternStrip';

const MAX_DAYS = 56;

interface Props {
  shifts: ShiftOpt[];
  onBuilt: (name: string, cycle: CycleCell[]) => void;
}

function clamp(value: string, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function RotationBuilder({ shifts, onBuilt }: Props) {
  const [workDays, setWorkDays] = React.useState(5);
  const [offDays, setOffDays] = React.useState(2);
  const [steps, setSteps] = React.useState<RotationStep[]>([{ shiftId: null, blocks: 1 }]);

  const cycle = React.useMemo(() => buildRotation(workDays, offDays, steps), [workDays, offDays, steps]);
  const blockCount = steps.filter((s) => s.shiftId).reduce((sum, s) => sum + s.blocks, 0);
  const blockLength = rotationBlockLength(workDays, offDays);
  const tooLong = cycle.length > MAX_DAYS;
  const ready = cycle.length > 0 && !tooLong;

  const setStep = (i: number, patch: Partial<RotationStep>) => setSteps(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const apply = () => {
    const codes = steps.filter((s) => s.shiftId).map((s) => `${shifts.find((x) => x.value === s.shiftId)?.code ?? '?'}${s.blocks > 1 ? `x${s.blocks}` : ''}`);
    onBuilt(`${workDays} on ${offDays} off - ${codes.join('/')}`, cycle);
  };

  return (
    <div className="rounded-xl border border-line bg-bg-subtle/50 p-3">
      <p className="text-xs font-semibold text-fg">Build a rotation</p>
      <p className="mt-0.5 text-[11px] text-fg-muted">Pick the working days and off days in a block, then the order of shifts. Each shift gets its own block of work followed by its days off.</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-xs">
        <label className="text-[11px] font-semibold text-fg">Working days
          <input type="number" min={1} max={14} value={workDays} onChange={(e) => setWorkDays(clamp(e.target.value, 1, 14, 5))} className={`${miniInput} mt-1`} />
        </label>
        <label className="text-[11px] font-semibold text-fg">Days off
          <input type="number" min={0} max={14} value={offDays} onChange={(e) => setOffDays(clamp(e.target.value, 0, 14, 2))} className={`${miniInput} mt-1`} />
        </label>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-[11px] font-semibold text-fg">Shift order</p>
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 text-[11px] text-fg-muted">{i + 1}.</span>
            <select value={step.shiftId ?? ''} onChange={(e) => setStep(i, { shiftId: e.target.value ? Number(e.target.value) : null })} className={`${miniInput} min-w-0 flex-1`} aria-label={`Shift ${i + 1}`}>
              <option value="">Pick a shift…</option>
              {shifts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              for
              <input type="number" min={1} max={8} value={step.blocks} onChange={(e) => setStep(i, { blocks: clamp(e.target.value, 1, 8, 1) })} className={`${miniInput} w-14`} aria-label={`Blocks of shift ${i + 1}`} />
              block{step.blocks > 1 ? 's' : ''}
            </label>
            <button type="button" disabled={steps.length <= 1} onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} aria-label="Remove shift" className="rounded-md p-1 text-fg-muted hover:bg-bg-subtle disabled:opacity-30"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setSteps([...steps, { shiftId: null, blocks: 1 }])} className={btnSecondary}><Plus className="h-3.5 w-3.5" /> Add shift</button>
      </div>

      {cycle.length > 0 && (
        <div className="mt-3">
          <PatternStrip cycle={cycle} shifts={shifts} compact />
          <p className="mt-1.5 text-[11px] text-fg-muted">
            {cycle.length} days, then it repeats. {blockCount > 1 ? `Use ${blockCount} crews with start offsets ${Array.from({ length: blockCount }, (_, i) => i * blockLength).join(', ')} so every shift is always covered.` : 'One crew follows it.'}
          </p>
          {tooLong && <p role="alert" className="mt-1 text-xs font-medium text-[var(--tt-danger)]">A pattern can have at most {MAX_DAYS} days. Reduce the blocks or days.</p>}
        </div>
      )}

      <button type="button" disabled={!ready} onClick={apply} className={`${btnPrimary} mt-3`}>Fill in the cycle</button>
    </div>
  );
}
