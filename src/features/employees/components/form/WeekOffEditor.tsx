'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { Chip, FieldLabel, FieldMessage, OptionCard } from '@/components/ui/FormControls';
import type { DayKey, DayOffConfig, SchemaField, WeekOffConfig } from '../../types/employees.dto';

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const VALUE_LABEL: Record<string, string> = {
  working: 'Working',
  full_off: 'Full day off',
  half_off: 'Half day off',
  first_half: 'First half off',
  second_half: 'Second half off',
  morning: 'Morning off',
  afternoon: 'Afternoon off',
  every_week: 'Every week',
  alternate: 'Alternate (1st, 3rd, 5th)',
  '1st_and_3rd': '1st & 3rd',
  '2nd_and_4th': '2nd & 4th',
  specific_weeks: 'Pick weeks',
  fixed_days: 'Fixed days',
  flexible: 'Flexible days',
};

const label = (v: string) => VALUE_LABEL[v] || v.replace(/_/g, ' ');
const select = 'h-9 w-full rounded-lg border border-line bg-surface px-2 text-xs text-fg outline-none focus:border-[var(--tt-primary)] sm:text-sm';

function values(schema: Record<string, unknown>, day: DayKey, field: string): string[] {
  const group = schema[day] as Record<string, SchemaField> | undefined;
  return group?.[field]?.values || [];
}

export function WeekOffEditor({ value, onChange, schema, error }: {
  value: WeekOffConfig;
  onChange: (v: WeekOffConfig) => void;
  schema: Record<string, unknown>;
  error?: string;
}) {
  const modeField = schema.weeklyOffMode as SchemaField | undefined;
  const flexField = schema.flexibleDaysPerMonth as SchemaField | undefined;
  const setDay = (day: DayKey, patch: Partial<DayOffConfig>) => onChange({ ...value, [day]: { ...value[day], ...patch } });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {(modeField?.values || ['fixed_days', 'flexible']).map((m) => (
          <OptionCard
            key={m}
            selected={value.weeklyOffMode === m}
            onClick={() => onChange({ ...value, weeklyOffMode: m })}
            title={label(m)}
            description={m === 'flexible' ? 'Employee picks off days, up to a monthly count' : 'Set each weekday as working, full off or half off'}
          />
        ))}
      </div>

      {value.weeklyOffMode === 'flexible' ? (
        <div className="max-w-xs">
          <FieldLabel label={flexField?.label || 'Off days per month'} />
          <input
            type="number"
            min={flexField?.min ?? 1}
            max={flexField?.max ?? 31}
            value={value.flexibleDaysPerMonth}
            onChange={(e) => onChange({ ...value, flexibleDaysPerMonth: Number(e.target.value) || 0 })}
            className={select}
          />
          {flexField?.help && <p className="mt-1 text-[11px] text-fg-muted">{flexField.help}</p>}
        </div>
      ) : (
        <div className="divide-y divide-line/60 rounded-lg border border-line">
          {DAYS.map(({ key, label: dayLabel }) => {
            const conf = value[key] || { offType: 'working' };
            const off = conf.offType !== 'working';
            return (
              <div key={key} className={cx('grid grid-cols-1 gap-2 p-3 sm:grid-cols-[7rem_1fr_1fr_1fr] sm:items-center', off && 'bg-bg-subtle/40')}>
                <span className="text-xs font-semibold text-fg sm:text-sm">{dayLabel}</span>
                <select className={select} value={conf.offType} onChange={(e) => setDay(key, { offType: e.target.value })} aria-label={`${dayLabel} status`}>
                  {values(schema, key, 'offType').map((v) => <option key={v} value={v}>{label(v)}</option>)}
                </select>
                {off ? (
                  <select className={select} value={conf.pattern || 'every_week'} onChange={(e) => setDay(key, { pattern: e.target.value })} aria-label={`${dayLabel} recurrence`}>
                    {values(schema, key, 'pattern').map((v) => <option key={v} value={v}>{label(v)}</option>)}
                  </select>
                ) : <span className="hidden sm:block" />}
                {off && conf.offType === 'half_off' ? (
                  <select className={select} value={conf.halfDaySession || 'first_half'} onChange={(e) => setDay(key, { halfDaySession: e.target.value })} aria-label={`${dayLabel} half-day session`}>
                    {values(schema, key, 'halfDaySession').map((v) => <option key={v} value={v}>{label(v)}</option>)}
                  </select>
                ) : <span className="hidden sm:block" />}
                {off && conf.pattern === 'specific_weeks' && (
                  <div className="flex flex-wrap gap-1.5 sm:col-span-3 sm:col-start-2">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const k = `specificWeek${n}` as keyof DayOffConfig;
                      return (
                        <Chip key={n} active={Boolean(conf[k])} onClick={() => setDay(key, { [k]: !conf[k] } as Partial<DayOffConfig>)}>
                          {['1st', '2nd', '3rd', '4th', '5th'][n - 1]} week
                        </Chip>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <FieldMessage error={error} />
    </div>
  );
}
