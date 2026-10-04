'use client';

import React from 'react';
import { Switch } from '@/components/ui/Switch';
import { FieldLabel } from '@/components/ui/FormControls';
import { cx } from '@/theme/tokens';
import type { UnitSettings } from '../../../types/roster.types';
import type { WeightKey } from '../../../utils/teamRules';
import { miniInput } from '../../catalog-shared/catalogUi';
import type { TeamDetailTabProps } from './TeamTabProps';
import { TabFooter } from './TabFooter';
import { AdvancedWeights } from './AdvancedWeights';

function Row({ title, help, children }: { title: string; help: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="mt-0.5 text-[11px] text-fg-muted">{help}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function RulesTab({ editor, detail }: TeamDetailTabProps) {
  const start: UnitSettings = { ...detail.effective_settings, ...detail.settings };
  const [auto, setAuto] = React.useState(start.autoGenerate?.enabled ?? false);
  const [daysBefore, setDaysBefore] = React.useState(start.autoGenerate?.daysBefore ?? 7);
  const [periodLen, setPeriodLen] = React.useState<number | null>(start.autoGenerate?.periodLengthDays ?? null);
  const [overtime, setOvertime] = React.useState(start.allowOvertimeToCover ?? false);
  const [seconds, setSeconds] = React.useState(start.optimizeSeconds ?? 2);
  const [weights, setWeights] = React.useState<Partial<Record<WeightKey, number>>>(start.weights ?? {});
  const [customDays, setCustomDays] = React.useState(periodLen ?? 28);
  const invalid = daysBefore < 1 || daysBefore > 60 || seconds < 1 || seconds > 30 || (periodLen !== null && (periodLen < 7 || periodLen > 62));

  const save = () => editor.saveSettings({
    autoGenerate: { enabled: auto, daysBefore, periodLengthDays: periodLen },
    allowOvertimeToCover: overtime,
    optimizeSeconds: seconds,
    weights,
  });

  return (
    <div className="max-w-3xl space-y-4">
      <div className="rounded-xl border border-line px-4">
        <div className="divide-y divide-line/70">
          <Row title="Create the next roster automatically" help="A draft is generated for you ahead of each period, ready to review. Nothing is published until you do it.">
            <Switch checked={auto} onChange={setAuto} label="Create next roster automatically" />
          </Row>
          {auto && (
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div>
                <FieldLabel label="Days before the period starts" />
                <input type="number" min={1} max={60} value={daysBefore} onChange={(e) => setDaysBefore(Number(e.target.value))} className={miniInput} />
                <p className="mt-1 text-[11px] text-fg-muted">Between 1 and 60 days.</p>
              </div>
              <div>
                <FieldLabel label="Roster period" />
                <div className="flex gap-2">
                  <select value={periodLen === null ? 'month' : 'days'} onChange={(e) => setPeriodLen(e.target.value === 'month' ? null : customDays)} className={cx(miniInput, 'flex-1')}>
                    <option value="month">Calendar month</option>
                    <option value="days">A set number of days</option>
                  </select>
                  {periodLen !== null && (
                    <input
                      type="number"
                      min={7}
                      max={62}
                      value={periodLen}
                      onChange={(e) => {
                        setPeriodLen(Number(e.target.value));
                        setCustomDays(Number(e.target.value));
                      }}
                      className={cx(miniInput, 'w-20')}
                      aria-label="Days in period"
                    />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-fg-muted">{periodLen === null ? 'One roster per calendar month.' : 'Between 7 and 62 days.'}</p>
              </div>
            </div>
          )}
          <Row title="Allow overtime to cover gaps" help="If nobody else can fill a shift, the generator may add overtime instead of leaving it empty.">
            <Switch checked={overtime} onChange={setOvertime} label="Allow overtime to cover gaps" />
          </Row>
          <Row title="Time spent improving the roster" help="Longer search can find fairer rosters for big teams. Between 1 and 30 seconds.">
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={30} value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className={cx(miniInput, 'w-20')} aria-label="Seconds" />
              <span className="text-xs text-fg-muted">seconds</span>
            </div>
          </Row>
        </div>
      </div>
      <AdvancedWeights weights={weights} onChange={setWeights} />
      <TabFooter label="Save rules" saving={editor.saving === 'rules'} disabled={invalid} error={invalid ? 'Check the highlighted numbers are within range.' : editor.errors.rules?.message} onSave={save} />
    </div>
  );
}
