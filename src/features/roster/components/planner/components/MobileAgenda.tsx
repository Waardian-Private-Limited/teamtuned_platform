'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '@/theme/tokens';
import { WEEKDAYS, KIND_LABELS } from '../../../constants/roster.constants';
import type { Assignment, BoardEmployee, ShiftInfo } from '../../../types/roster.types';
import { cellKey } from '../../../utils/rosterBoard';
import { formatRange, todayLocal, weekdayIndex } from '../../../utils/rosterTime';
import { toneOf, TONE_CLASS } from '../../../utils/shiftTone';

interface Props {
  dates: string[];
  assignments: Assignment[];
  employees: Map<number, BoardEmployee>;
  templates: Map<number, ShiftInfo>;
  selected: string | null;
  onPick: (key: string) => void;
}

export function MobileAgenda({ dates, assignments, employees, templates, selected, onPick }: Props) {
  const today = todayLocal();
  const [day, setDay] = useState(() => (dates.includes(today) ? today : dates[0]));
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dates.includes(day)) setDay(dates.includes(today) ? today : dates[0]);
  }, [dates, day, today]);

  useEffect(() => {
    strip.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [day]);

  const groups = useMemo(() => {
    const byShift = new Map<string, Assignment[]>();
    for (const a of assignments) {
      if (a.work_date !== day) continue;
      const k = a.kind === 'shift' ? `s${a.shift_template_id}` : a.kind;
      const l = byShift.get(k);
      if (l) l.push(a);
      else byShift.set(k, [a]);
    }
    const shiftGroups = [...byShift.entries()].filter(([k]) => k.startsWith('s')).sort(([a], [b]) => (templates.get(Number(a.slice(1)))?.start_min ?? 0) - (templates.get(Number(b.slice(1)))?.start_min ?? 0));
    const other = [...byShift.entries()].filter(([k]) => !k.startsWith('s'));
    return [...shiftGroups, ...other];
  }, [assignments, day, templates]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div ref={strip} className="flex gap-1.5 overflow-x-auto pb-1 tt-scroll-hidden">
        {dates.map((d) => (
          <button
            key={d}
            type="button"
            data-active={d === day}
            onClick={() => setDay(d)}
            className={cx('flex h-14 w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-center', d === day ? 'border-fg bg-fg text-fg-inverted' : 'border-line bg-surface text-fg', d === today && d !== day && 'border-line-strong')}
          >
            <span className="text-[10px] font-medium opacity-70">{WEEKDAYS[weekdayIndex(d)]}</span>
            <span className="text-sm font-bold">{Number(d.slice(8))}</span>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto tt-scroll-hidden">
        {!groups.length && <p className="py-10 text-center text-sm text-fg-muted">Nothing planned for this day.</p>}
        {groups.map(([k, list]) => {
          const tpl = k.startsWith('s') ? templates.get(Number(k.slice(1))) : undefined;
          return (
            <section key={k} className="rounded-xl border border-line bg-surface">
              <header className="flex items-center gap-2 border-b border-line px-3 py-2">
                {tpl ? (
                  <>
                    <span className={cx('inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1 text-[11px] font-bold', TONE_CLASS[toneOf(tpl)])}>{tpl.code}</span>
                    <span className="text-sm font-semibold text-fg">{tpl.name}</span>
                    <span className="text-xs text-fg-muted">{formatRange(tpl.start_min, tpl.duration_min)}</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-fg">{KIND_LABELS[k] || k}</span>
                )}
                <span className="ml-auto text-xs font-semibold text-fg-muted">{list.length}</span>
              </header>
              <ul className="divide-y divide-line/60">
                {list.map((a) => {
                  const key = cellKey(a.employee_id, a.work_date);
                  return (
                    <li key={a.id}>
                      <button type="button" onClick={() => onPick(key)} className={cx('flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm', selected === key && 'bg-bg-subtle')}>
                        <span className="min-w-0 truncate font-medium text-fg">{employees.get(a.employee_id)?.name || `Employee ${a.employee_id}`}</span>
                        <span className="shrink-0 text-[11px] text-fg-muted">{[a.locked ? 'locked' : '', a.is_overtime ? 'overtime' : ''].filter(Boolean).join(' · ')}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
