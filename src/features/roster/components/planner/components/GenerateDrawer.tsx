'use client';

import { useEffect, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import type { UnitSettings } from '../../../types/roster.types';
import type { GenerateOptions } from '../../../hooks/useRosterBoard';

const DEFAULTS = { nights: 3, weekends: 2, holidays: 3, preference: 4 };
const SLIDERS: { key: keyof typeof DEFAULTS; label: string; hint: string }[] = [
  { key: 'nights', label: 'Spread night shifts evenly', hint: 'Higher means nights are shared more fairly' },
  { key: 'weekends', label: 'Spread weekend work evenly', hint: 'Higher means fewer people carry most weekends' },
  { key: 'holidays', label: 'Spread holiday work evenly', hint: 'Higher means holiday duty rotates' },
  { key: 'preference', label: 'Honour shift preferences', hint: 'Higher means preferred and avoided shifts matter more' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  regenerate: boolean;
  lockedCount: number;
  settings: UnitSettings | undefined;
  onSubmit: (opts: GenerateOptions) => Promise<boolean>;
}

export function GenerateDrawer({ open, onClose, regenerate, lockedCount, settings, onSubmit }: Props) {
  const [keepLocked, setKeepLocked] = useState(true);
  const [allowOt, setAllowOt] = useState(false);
  const [reroll, setReroll] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>(DEFAULTS);
  const [base, setBase] = useState<Record<string, number>>(DEFAULTS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next: Record<string, number> = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) {
      const v = settings?.weights?.[k as keyof typeof DEFAULTS];
      if (typeof v === 'number') next[k] = Math.min(10, v);
    }
    setBase(next);
    setWeights(next);
    setKeepLocked(true);
    setAllowOt(Boolean(settings?.allowOvertimeToCover));
    setReroll(false);
  }, [open, settings]);

  const submit = async () => {
    setBusy(true);
    const changed: Record<string, number> = {};
    for (const k of Object.keys(weights)) if (weights[k] !== base[k]) changed[k] = weights[k];
    const ok = await onSubmit({
      keepLocked,
      allowOvertimeToCover: allowOt,
      seed: reroll ? Math.floor(Math.random() * 1_000_000) + 1 : undefined,
      weights: changed,
    });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} title={regenerate ? 'Regenerate roster' : 'Generate roster'}>
      <div className="flex min-h-full flex-col gap-5">
        <p className="text-sm text-fg-muted">
          The planner fills the period using your team&apos;s shifts, headcount, patterns, leave and availability. You can edit anything afterwards.
        </p>

        <div className="space-y-4 rounded-xl border border-line p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">Keep locked cells</p>
              <p className="text-xs text-fg-muted">{lockedCount > 0 ? `${lockedCount} cell${lockedCount === 1 ? ' is' : 's are'} locked, including your manual edits.` : 'Cells you edit by hand are locked and survive regeneration.'}</p>
            </div>
            <Switch checked={keepLocked} onChange={setKeepLocked} label="Keep locked cells" />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">Allow overtime to cover gaps</p>
              <p className="text-xs text-fg-muted">When nobody is free, use extra hours instead of leaving the shift short.</p>
            </div>
            <Switch checked={allowOt} onChange={setAllowOt} label="Allow overtime to cover gaps" />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">Try a different result</p>
              <p className="text-xs text-fg-muted">Shuffles the starting point so you get another valid roster.</p>
            </div>
            <Switch checked={reroll} onChange={setReroll} label="Try a different result" />
          </div>
        </div>

        <div className="rounded-xl border border-line p-4">
          <p className="text-sm font-semibold text-fg">Fairness emphasis</p>
          <p className="mb-3 text-xs text-fg-muted">Optional. Leave as is for your team&apos;s defaults.</p>
          <div className="space-y-4">
            {SLIDERS.map((s) => (
              <div key={s.key}>
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor={`w-${s.key}`} className="font-semibold text-fg">{s.label}</label>
                  <span className="font-semibold text-fg-muted">{weights[s.key]}</span>
                </div>
                <input
                  id={`w-${s.key}`}
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={weights[s.key]}
                  onChange={(e) => setWeights((w) => ({ ...w, [s.key]: Number(e.target.value) }))}
                  className="mt-1 w-full accent-[var(--tt-primary)]"
                />
                <p className="text-[11px] text-fg-muted">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto flex gap-2.5 pt-2">
          <Button variant="secondary" className="!h-10 flex-1 !text-sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="!h-10 flex-1 !text-sm" loading={busy} onClick={submit}>{regenerate ? 'Regenerate' : 'Generate'}</Button>
        </div>
      </div>
    </Drawer>
  );
}
