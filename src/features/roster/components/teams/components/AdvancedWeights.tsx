'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { WEIGHT_DEFAULTS, WEIGHT_INFO, type WeightKey } from '../../../utils/teamRules';
import { miniInput } from '../../catalog-shared/catalogUi';

interface Props {
  weights: Partial<Record<WeightKey, number>>;
  onChange: (next: Partial<Record<WeightKey, number>>) => void;
}

export function AdvancedWeights({ weights, onChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const value = (k: WeightKey) => weights[k] ?? WEIGHT_DEFAULTS[k];
  const clamp = (n: number) => Math.min(100, Math.max(0, n));

  return (
    <div className="rounded-xl border border-line">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <ChevronRight className={cx('h-4 w-4 text-fg-muted transition-transform', open && 'rotate-90')} />
        <span>
          <span className="block text-sm font-bold text-fg">Advanced fairness weights</span>
          <span className="block text-[11px] text-fg-muted">Fine-tune what the roster generator cares about. The defaults suit most teams.</span>
        </span>
      </button>
      {open && (
        <div className="border-t border-line px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {WEIGHT_INFO.map((w) => (
              <div key={w.key}>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-fg">{w.label}</label>
                  {weights[w.key] !== undefined && weights[w.key] !== WEIGHT_DEFAULTS[w.key] && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...weights };
                        delete next[w.key];
                        onChange(next);
                      }}
                      className="text-[11px] font-semibold text-fg-muted underline-offset-4 hover:underline"
                    >
                      Reset to {WEIGHT_DEFAULTS[w.key]}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={value(w.key)}
                  onChange={(e) => onChange({ ...weights, [w.key]: clamp(Number(e.target.value) || 0) })}
                  className={cx(miniInput, 'mt-1')}
                />
                <p className="mt-1 text-[11px] text-fg-muted">{w.help}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => onChange({})} className="mt-4 text-xs font-semibold text-fg underline-offset-4 hover:underline">Reset all to defaults</button>
        </div>
      )}
    </div>
  );
}
