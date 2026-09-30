'use client';

import React from 'react';
import { CalendarClock, Moon, Timer } from 'lucide-react';
import type { PolicyScheduleDto, WeekOffConfig } from '../../types/employees.dto';
import { FieldMessage, OptionCard, Section, SelectField, TextField } from '@/components/ui/FormControls';
import { WeekOffEditor } from './WeekOffEditor';
import type { EmployeeFormController } from './types';

const SOURCE_LABEL: Record<string, string> = {
  role: 'role',
  department: 'department',
  site: 'site',
  sub_organization: 'sub-organization',
  employee_type: 'employment type',
  organization: 'organization',
  default: 'organization default',
};

const PATTERN_LABEL: Record<string, string> = {
  every_week: 'every week',
  alternate: '1st, 3rd, 5th',
  '1st_and_3rd': '1st & 3rd',
  '2nd_and_4th': '2nd & 4th',
  specific_weeks: 'selected weeks',
};

function hhmm(t: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

function policyWeekOffs(s: PolicyScheduleDto) {
  if (s.weeklyOffMode === 'flexible') return `Flexible, up to ${s.flexibleDaysPerMonth ?? 4} days a month`;
  if (!s.weekOffs.length) return 'No weekly off in policy';
  return s.weekOffs
    .map((w) => `${w.day}${w.offType === 'half_off' ? ' (half)' : ''}${w.pattern !== 'every_week' ? ` · ${PATTERN_LABEL[w.pattern] || w.pattern}` : ''}`)
    .join(', ');
}

function ModeBanner({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-line bg-bg-subtle/60 p-3">
      <span className="mt-0.5 text-fg">{icon}</span>
      <div>
        <p className="text-xs font-semibold text-fg sm:text-sm">{title}</p>
        <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">{text}</p>
      </div>
    </div>
  );
}

export function StepSchedule({ c }: { c: EmployeeFormController }) {
  const { form, set, errors, options, inherited, inheritedLoading, policy } = c;
  const inheritedPolicy = options?.policies.find((p) => p.id === inherited?.policy_id) || null;
  const schedule = policy?.schedule || null;

  const policyOptions = (options?.policies || []).map((p) => ({ value: p.id, label: p.name }));
  const inheritedHint = inheritedLoading
    ? 'Checking which policy applies…'
    : inheritedPolicy
      ? `${inheritedPolicy.name} applies from ${SOURCE_LABEL[inherited?.source || ''] || 'assignment'}. Pick another only to override for this employee.`
      : 'No policy is assigned to this department, role or site. Select one.';

  const startCustomWeekOff = () => {
    if (!form.weekOffConfig && schedule) {
      const seed = { weeklyOffMode: schedule.weeklyOffMode === 'flexible' ? 'flexible' : 'fixed_days', flexibleDaysPerMonth: schedule.flexibleDaysPerMonth ?? 4, ...schedule.weekOffConfig } as WeekOffConfig;
      set('weekOffConfig', seed);
    }
    set('weekOffMode', 'custom');
  };

  const policyShift = schedule?.shiftStart ? `${hhmm(schedule.shiftStart)} – ${hhmm(schedule.shiftEnd)}` : 'As set in policy';
  const customNight = form.customShiftStart && form.customShiftEnd && form.customShiftEnd <= form.customShiftStart;

  return (
    <div className="space-y-4">
      <Section title="Attendance policy" description="Rules for late marks, half days, overtime and leave come from the policy">
        <SelectField<number>
          label="Policy"
          required
          numeric
          value={form.policyId ?? inheritedPolicy?.id ?? null}
          onChange={(v) => set('policyId', v === inheritedPolicy?.id ? null : v)}
          options={policyOptions}
          placeholder="Select a policy"
          error={errors.policy_id}
          hint={form.policyId && form.policyId !== inheritedPolicy?.id ? 'Employee-level override' : inheritedHint}
        />
      </Section>

      {schedule && (
        <Section title="Shift" description="Timing rules follow the policy; the shift decides the clock times">
          {schedule.timingMode === 'roster' && (
            <ModeBanner
              icon={<CalendarClock className="h-4 w-4" />}
              title="Roster based"
              text={`Shifts and off days are planned per date in the roster. Standard off days per week: ${schedule.rosterOffDaysPerWeek ?? 1}. Dates with no roster entry show as Unscheduled.`}
            />
          )}
          {schedule.timingMode === 'flexible' && (
            <ModeBanner
              icon={<Timer className="h-4 w-4" />}
              title="Flexible hours"
              text={`No fixed start time. The employee must complete ${schedule.flexibleHours ?? 8} hours a day.`}
            />
          )}
          {schedule.timingMode === 'fixed_time' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                <OptionCard
                  selected={form.shiftSource === 'policy'}
                  onClick={() => set('shiftSource', 'policy')}
                  title="Policy default"
                  description={policyShift}
                />
                {(options?.shift_templates || []).map((t) => (
                  <OptionCard
                    key={t.id}
                    selected={form.shiftSource === 'template' && form.shiftTemplateId === t.id}
                    onClick={() => {
                      set('shiftSource', 'template');
                      set('shiftTemplateId', t.id);
                    }}
                    title={t.name}
                    description={
                      <span className="inline-flex items-center gap-1">
                        {hhmm(t.start_time)} – {hhmm(t.end_time)}
                        {t.is_night ? <Moon className="h-3 w-3" aria-label="Night shift" /> : null}
                      </span>
                    }
                  />
                ))}
                <OptionCard
                  selected={form.shiftSource === 'custom'}
                  onClick={() => set('shiftSource', 'custom')}
                  title="Custom timing"
                  description="Set this employee's own start, end and break"
                />
              </div>
              {form.shiftSource === 'custom' && (
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-line p-3 sm:grid-cols-3">
                  <TextField label="Starts" required type="time" value={form.customShiftStart} onChange={(v) => set('customShiftStart', v)} error={errors.shift_start} />
                  <TextField label="Ends" required type="time" value={form.customShiftEnd} onChange={(v) => set('customShiftEnd', v)} error={errors.shift_end} hint={customNight ? 'Ends next day (night shift)' : undefined} />
                  <TextField label="Break (minutes)" type="number" min={0} max={240} value={form.customBreak} onChange={(v) => set('customBreak', v)} error={errors.shift_break_minutes} />
                </div>
              )}
            </div>
          )}
          <FieldMessage error={errors.shift_template_id} />
        </Section>
      )}

      {schedule && schedule.timingMode !== 'roster' && (
        <Section title="Weekly off">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <OptionCard selected={form.weekOffMode === 'policy'} onClick={() => set('weekOffMode', 'policy')} title="Follow policy" description={policyWeekOffs(schedule)} />
            <OptionCard selected={form.weekOffMode === 'custom'} onClick={startCustomWeekOff} title="Custom for this employee" description="Any days, half days, alternate or chosen weeks" />
          </div>
          {form.weekOffMode === 'custom' && form.weekOffConfig && options?.week_off_schema && (
            <div className="mt-4">
              <WeekOffEditor value={form.weekOffConfig} onChange={(v) => set('weekOffConfig', v)} schema={options.week_off_schema as Record<string, unknown>} error={errors.week_off_config} />
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
