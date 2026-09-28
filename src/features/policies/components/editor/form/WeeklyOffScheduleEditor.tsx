'use client';

import React from 'react';
import { Calendar, Check, Info, Sun, Moon } from 'lucide-react';
import { cx } from '@/theme/tokens';

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DayScheduleConfig {
  offType?: 'working' | 'full_off' | 'half_off';
  halfDaySession?: 'morning' | 'afternoon';
  pattern?: 'every_week' | 'alternate' | '1st_and_3rd' | '2nd_and_4th' | 'specific_weeks';
  specificWeek1?: boolean;
  specificWeek2?: boolean;
  specificWeek3?: boolean;
  specificWeek4?: boolean;
  specificWeek5?: boolean;
}

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

interface WeeklyOffScheduleEditorProps {
  value: Record<string, unknown>;
  onChange: (dayKey: DayKey, dayConfig: DayScheduleConfig) => void;
}

export function WeeklyOffScheduleEditor({ value, onChange }: WeeklyOffScheduleEditorProps) {
  const [activeDay, setActiveDay] = React.useState<DayKey>('monday');

  const getDay = (key: DayKey): DayScheduleConfig => {
    return (value[key] as DayScheduleConfig) || { offType: 'working' };
  };

  const currentConfig = getDay(activeDay);
  const currentOffType = currentConfig.offType || 'working';

  const updateDay = (key: DayKey, patch: Partial<DayScheduleConfig>) => {
    const existing = getDay(key);
    onChange(key, { ...existing, ...patch });
  };

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[var(--tt-primary)]" />
            <h4 className="text-xs font-bold text-fg sm:text-sm">Weekly Off Schedule</h4>
          </div>
          <p className="mt-0.5 text-[11px] text-fg-muted">
            Configure full or half-day offs for each day of the week, with recurrence patterns.
          </p>
        </div>
      </div>

      {/* 7 Days Matrix / Strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {DAYS.map((d) => {
          const conf = getDay(d.key);
          const off = conf.offType || 'working';
          const isSelected = activeDay === d.key;

          let badgeText = 'Working';
          let badgeCls = 'text-zinc-800 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-bold';
          if (off === 'full_off') {
            badgeText = 'Full Off';
            badgeCls = 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30 font-semibold';
          } else if (off === 'half_off') {
            badgeText = 'Half Off';
            badgeCls = 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30 font-semibold';
          }

          let patternShort = '';
          if (off !== 'working') {
            const p = conf.pattern || 'every_week';
            if (p === 'alternate') patternShort = 'Alt (1,3,5)';
            else if (p === '1st_and_3rd') patternShort = '1st & 3rd';
            else if (p === '2nd_and_4th') patternShort = '2nd & 4th';
            else if (p === 'specific_weeks') {
              const w: string[] = [];
              if (conf.specificWeek1) w.push('1');
              if (conf.specificWeek2) w.push('2');
              if (conf.specificWeek3) w.push('3');
              if (conf.specificWeek4) w.push('4');
              if (conf.specificWeek5) w.push('5');
              patternShort = w.length ? `W${w.join(',')}` : 'Custom';
            } else {
              patternShort = 'All Weeks';
            }
          }

          return (
            <div
              key={d.key}
              role="button"
              tabIndex={0}
              onClick={() => setActiveDay(d.key)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  setActiveDay(d.key);
                }
              }}
              className={cx(
                'group relative flex flex-col justify-between rounded-xl border p-2.5 transition-all text-left cursor-pointer outline-none',
                isSelected
                  ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)] shadow-xs'
                  : 'border-line bg-surface hover:border-line-strong hover:bg-bg-subtle/50'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-fg">{d.short}</span>
                <span className={cx('rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wider', badgeCls)}>
                  {badgeText}
                </span>
              </div>

              <div className="mt-2 min-h-[16px]">
                {off !== 'working' ? (
                  <span className="text-[10px] font-medium text-fg-muted truncate block">
                    {patternShort}
                  </span>
                ) : (
                  <span className="text-[10px] text-fg-subtle">Regular shift</span>
                )}
              </div>

              {/* Quick toggle action button */}
              <div className="mt-2.5 flex items-center gap-1 border-t border-line/60 pt-1.5">
                <button
                  type="button"
                  title={`Toggle ${d.label} state`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = off === 'working' ? 'full_off' : off === 'full_off' ? 'half_off' : 'working';
                    updateDay(d.key, { offType: next });
                    setActiveDay(d.key);
                  }}
                  className="w-full text-center text-[10px] font-semibold text-[var(--tt-primary)] hover:underline"
                >
                  {off === 'working' ? '+ Make Off' : off === 'full_off' ? '→ Half Day' : '→ Working'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Details Panel */}
      <div className="rounded-xl border border-line bg-bg-subtle/70 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-fg">
              {DAYS.find((d) => d.key === activeDay)?.label} Settings:
            </span>

            {/* Quick 3-state Segmented Selector */}
            <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-xs">
              <button
                type="button"
                onClick={() => updateDay(activeDay, { offType: 'working' })}
                className={cx(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  currentOffType === 'working'
                    ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-xs'
                    : 'text-fg-muted hover:text-fg'
                )}
              >
                Working Day
              </button>
              <button
                type="button"
                onClick={() => updateDay(activeDay, { offType: 'full_off' })}
                className={cx(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  currentOffType === 'full_off'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-fg-muted hover:text-fg'
                )}
              >
                Full Day Off
              </button>
              <button
                type="button"
                onClick={() => updateDay(activeDay, { offType: 'half_off' })}
                className={cx(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  currentOffType === 'half_off'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-fg-muted hover:text-fg'
                )}
              >
                Half Day Off
              </button>
            </div>
          </div>

          {currentOffType === 'half_off' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-fg-muted">Off session:</span>
              <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => updateDay(activeDay, { halfDaySession: 'morning' })}
                  className={cx(
                    'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                    (currentConfig.halfDaySession || 'morning') === 'morning'
                      ? 'bg-[var(--tt-primary)] text-white'
                      : 'text-fg-muted hover:text-fg'
                  )}
                >
                  <Sun className="h-3 w-3" /> Morning Off
                </button>
                <button
                  type="button"
                  onClick={() => updateDay(activeDay, { halfDaySession: 'afternoon' })}
                  className={cx(
                    'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                    currentConfig.halfDaySession === 'afternoon'
                      ? 'bg-[var(--tt-primary)] text-white'
                      : 'text-fg-muted hover:text-fg'
                  )}
                >
                  <Moon className="h-3 w-3" /> Afternoon Off
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recurrence & Week Patterns (When Full Off or Half Off) */}
        {currentOffType !== 'working' ? (
          <div className="mt-3 flex flex-col gap-2.5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <label className="text-[11px] font-semibold text-fg sm:text-xs min-w-[120px]">
                Recurrence Pattern:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'every_week', label: 'Every Week' },
                  { id: 'alternate', label: 'Alternate (1st, 3rd, 5th)' },
                  { id: '1st_and_3rd', label: '1st & 3rd Week' },
                  { id: '2nd_and_4th', label: '2nd & 4th Week' },
                  { id: 'specific_weeks', label: 'Custom Specific Weeks' },
                ].map((pat) => {
                  const isCur = (currentConfig.pattern || 'every_week') === pat.id;
                  return (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => updateDay(activeDay, { pattern: pat.id as DayScheduleConfig['pattern'] })}
                      className={cx(
                        'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                        isCur
                          ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-white shadow-xs'
                          : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg'
                      )}
                    >
                      {pat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Specific Weeks Pill Selector (Dynamic like Employee Popup) */}
            {currentConfig.pattern === 'specific_weeks' && (
              <div className="mt-1 flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-2.5">
                <span className="text-[11px] font-semibold text-fg">
                  Select which weeks of the month are off:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: 'specificWeek1', label: '1st Week (Days 1–7)', short: 'Week 1' },
                    { key: 'specificWeek2', label: '2nd Week (Days 8–14)', short: 'Week 2' },
                    { key: 'specificWeek3', label: '3rd Week (Days 15–21)', short: 'Week 3' },
                    { key: 'specificWeek4', label: '4th Week (Days 22–28)', short: 'Week 4' },
                    { key: 'specificWeek5', label: '5th Week (Days 29–31)', short: 'Week 5' },
                  ].map((w) => {
                    const isChecked = Boolean(currentConfig[w.key as keyof DayScheduleConfig]);
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => updateDay(activeDay, { [w.key]: !isChecked })}
                        className={cx(
                          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                          isChecked
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                            : 'border-line bg-bg-subtle text-fg-muted hover:border-line-strong hover:bg-surface hover:text-fg'
                        )}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5" />}
                        {w.short}
                        <span className="text-[10px] opacity-75 hidden sm:inline">
                          ({w.label.split('(')[1]?.replace(')', '')})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5th Week Explainer Callout */}
            <div className="mt-1 flex items-start gap-1.5 rounded-lg border border-line/60 bg-surface/50 p-2 text-[11px] text-fg-muted">
              <Info className="h-3.5 w-3.5 shrink-0 text-blue-500 mt-0.5" />
              <span>
                <strong>5th Week of the Month:</strong> In months with 29, 30, or 31 days (e.g. March, May, July), weekdays can occur 5 times.
                In <em>Alternate</em>, the 5th week is treated as an odd week (off). In <em>1st & 3rd</em> or <em>2nd & 4th</em>, the 5th occurrence is a normal working day. Use <em>Custom Specific Weeks</em> for complete control over the 5th week.
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-fg-muted mt-1">
            {DAYS.find((d) => d.key === activeDay)?.label} is marked as a standard working day. Attendance is expected as per shift hours.
          </p>
        )}
      </div>
    </div>
  );
}
