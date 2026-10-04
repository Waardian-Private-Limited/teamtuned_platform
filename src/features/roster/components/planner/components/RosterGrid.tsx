'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cx } from '@/theme/tokens';
import type { Assignment, BoardEmployee, ShiftInfo } from '../../../types/roster.types';
import type { SelectMode } from '../../../hooks/useRosterBoardSelection';
import { hoursPerWeek, isWeekend, parseCellKey } from '../../../utils/rosterBoard';
import { formatDay, todayLocal, weekdayIndex } from '../../../utils/rosterTime';
import { WEEKDAYS } from '../../../constants/roster.constants';
import { GridRow } from './GridRow';
import { CELL_W, FOOT_H, HEAD_H, NAME_W, ROW_H } from './gridMetrics';

interface Props {
  employees: BoardEmployee[];
  employeeIds: number[];
  dates: string[];
  byEmployee: Map<number, Assignment[]>;
  templates: Map<number, ShiftInfo>;
  staffed: Map<string, number>;
  understaffedDates: Set<string>;
  errorCellsByEmployee: Map<number, string>;
  selectedByEmployee: Map<number, string>;
  focusKey: string | null;
  pulse: { key: string; n: number } | null;
  canEdit: boolean;
  onSelect: (key: string, mode: SelectMode) => void;
  onMove: (fromKey: string, toKey: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const OVERSCAN = 6;

export function RosterGrid(p: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(600);
  const raf = useRef(0);
  const today = todayLocal();
  const { dates, employees, employeeIds } = p;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    setViewH(el.clientHeight);
    const ro = new ResizeObserver(() => setViewH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setScrollTop(scroller.current?.scrollTop ?? 0));
  }, []);

  const ensureVisible = useCallback(
    (key: string) => {
      const el = scroller.current;
      if (!el) return;
      const { employeeId, date } = parseCellKey(key);
      const r = employeeIds.indexOf(employeeId);
      const c = dates.indexOf(date);
      if (r < 0 || c < 0) return;
      const y = r * ROW_H;
      if (y < el.scrollTop) el.scrollTop = y;
      else if (y + ROW_H > el.scrollTop + el.clientHeight - HEAD_H - FOOT_H) el.scrollTop = y + ROW_H - el.clientHeight + HEAD_H + FOOT_H;
      const x = c * CELL_W;
      if (x < el.scrollLeft) el.scrollLeft = x;
      else if (x + CELL_W > el.scrollLeft + el.clientWidth - NAME_W) el.scrollLeft = x + CELL_W - el.clientWidth + NAME_W;
    },
    [employeeIds, dates]
  );

  useEffect(() => {
    if (p.focusKey) ensureVisible(p.focusKey);
  }, [p.focusKey, ensureVisible]);

  useEffect(() => {
    if (p.pulse) ensureVisible(p.pulse.key);
  }, [p.pulse, ensureVisible]);

  const total = employees.length;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const end = Math.min(total, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN);
  const pulseParsed = p.pulse ? parseCellKey(p.pulse.key) : null;

  const hours = useMemo(() => {
    const m = new Map<number, number>();
    for (const e of employees) m.set(e.id, hoursPerWeek(p.byEmployee.get(e.id) ?? [], p.templates, dates.length));
    return m;
  }, [employees, p.byEmployee, p.templates, dates.length]);

  const handleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-cell]') as HTMLElement | null;
    if (!target?.dataset.id) return;
    p.onSelect(target.dataset.id, e.shiftKey ? 'range' : e.metaKey || e.ctrlKey ? 'toggle' : 'single');
    scroller.current?.focus({ preventScroll: true });
  };

  const width = NAME_W + dates.length * CELL_W;
  const slice = employees.slice(start, end);

  return (
    <div
      ref={scroller}
      tabIndex={0}
      role="grid"
      aria-label="Roster grid"
      onScroll={onScroll}
      onClick={handleClick}
      onKeyDown={p.onKeyDown}
      className="relative min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border border-line bg-surface outline-none focus-visible:ring-1 focus-visible:ring-line-strong"
    >
      <div style={{ width, minWidth: '100%' }}>
        <div className="sticky top-0 z-20 flex border-b border-line bg-surface" style={{ height: HEAD_H }}>
          <div className="sticky left-0 z-30 flex shrink-0 items-end border-r border-line bg-surface px-3 pb-1.5 text-[11px] font-semibold text-fg-muted" style={{ width: NAME_W }}>
            {total} people
          </div>
          {dates.map((d) => {
            const isToday = d === today;
            const first = d === dates[0] || d.endsWith('-01');
            return (
              <div key={d} className={cx('flex shrink-0 flex-col items-center justify-end pb-1', isWeekend(d) && 'bg-bg-subtle')} style={{ width: CELL_W }}>
                {first && <span className="text-[9px] font-semibold uppercase leading-none text-fg-subtle">{formatDay(d, { month: 'short' })}</span>}
                <span className="text-[10px] font-medium leading-tight text-fg-muted">{WEEKDAYS[weekdayIndex(d)]}</span>
                <span className={cx('mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold leading-none', isToday ? 'bg-fg text-fg-inverted' : 'text-fg')}>{Number(d.slice(8))}</span>
              </div>
            );
          })}
        </div>
        <div style={{ height: start * ROW_H }} />
        {slice.map((emp) => (
          <GridRow
            key={emp.id}
            employee={emp}
            rows={p.byEmployee.get(emp.id) ?? EMPTY}
            dates={dates}
            templates={p.templates}
            errorDates={p.errorCellsByEmployee.get(emp.id) ?? ''}
            selectedDates={p.selectedByEmployee.get(emp.id) ?? ''}
            pulseDate={pulseParsed && pulseParsed.employeeId === emp.id ? pulseParsed.date : ''}
            hours={hours.get(emp.id) ?? 0}
            canEdit={p.canEdit}
            onMove={p.onMove}
          />
        ))}
        <div style={{ height: Math.max(0, total - end) * ROW_H }} />
        <div className="sticky bottom-0 z-20 flex border-t border-line bg-surface" style={{ height: FOOT_H }}>
          <div className="sticky left-0 z-30 flex shrink-0 items-center border-r border-line bg-surface px-3 text-[11px] font-semibold text-fg-muted" style={{ width: NAME_W }}>
            Staffed per day
          </div>
          {dates.map((d) => {
            const bad = p.understaffedDates.has(d);
            return (
              <div key={d} className={cx('flex shrink-0 items-center justify-center text-[11px] font-bold', isWeekend(d) && 'bg-bg-subtle', bad ? 'text-[var(--tt-danger)]' : 'text-fg')} style={{ width: CELL_W }}>
                {p.staffed.get(d) ?? 0}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const EMPTY: Assignment[] = [];
