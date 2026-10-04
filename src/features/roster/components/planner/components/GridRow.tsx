'use client';

import React, { useMemo } from 'react';
import type { Assignment, BoardEmployee, ShiftInfo } from '../../../types/roster.types';
import { cellKey, isWeekend, rowCellMap, sameRefs } from '../../../utils/rosterBoard';
import { clockOf, formatDay, formatRange } from '../../../utils/rosterTime';
import { toneOf, TONE_CLASS } from '../../../utils/shiftTone';
import { GridCell } from './GridCell';
import { NAME_W, ROW_H } from './gridMetrics';

export interface GridRowProps {
  employee: BoardEmployee;
  rows: Assignment[];
  dates: string[];
  templates: Map<number, ShiftInfo>;
  errorDates: string;
  selectedDates: string;
  pulseDate: string;
  hours: number;
  canEdit: boolean;
  onMove: (fromKey: string, toKey: string) => void;
}

const KIND_TITLE: Record<string, string> = { off: 'Off', leave: 'Leave', holiday: 'Holiday', comp_off: 'Comp off', unavailable: 'Unavailable' };

function GridRowImpl({ employee, rows, dates, templates, errorDates, selectedDates, pulseDate, hours, canEdit, onMove }: GridRowProps) {
  const cells = useMemo(() => rowCellMap(rows), [rows]);
  return (
    <div className="flex" style={{ height: ROW_H }} data-row={employee.id}>
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-b border-r border-line bg-surface px-3"
        style={{ width: NAME_W, height: ROW_H }}
      >
        {errorDates && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--tt-danger)]" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold leading-tight text-fg">{employee.name}</p>
          <p className="truncate text-[10px] leading-tight text-fg-muted">{employee.role_name || employee.department_name || employee.employee_code || ''}</p>
        </div>
        <span className="shrink-0 rounded border border-line bg-bg-subtle px-1 py-0.5 text-[10px] font-semibold leading-none text-fg-muted">{hours}h</span>
      </div>
      {dates.map((d) => {
        const list = cells.get(d);
        const a = list?.[0];
        const tpl = a?.shift_template_id ? templates.get(a.shift_template_id) : undefined;
        const second = list && list[1]?.kind === 'shift' ? templates.get(list[1].shift_template_id || 0)?.code || '' : '';
        let title = `${employee.name} · ${formatDay(d, { weekday: 'short', day: 'numeric', month: 'short' })}`;
        if (a) {
          if (a.kind === 'shift' && tpl) {
            const range = a.start_at ? `${clockOf(a.start_at)} – ${clockOf(a.end_at)}` : formatRange(tpl.start_min, tpl.duration_min);
            title += ` · ${tpl.name} ${range}`;
            if (a.is_overtime) title += ' · overtime';
            if (a.earns_comp_off) title += ' · earns comp off';
          } else title += ` · ${KIND_TITLE[a.kind] || a.kind}`;
          if (a.locked) title += ' · locked';
        } else title += ' · nothing planned';
        return (
          <GridCell
            key={d}
            cellId={cellKey(employee.id, d)}
            employeeId={employee.id}
            date={d}
            kind={a?.kind || ''}
            code={tpl?.code || '?'}
            tone={a?.kind === 'shift' ? TONE_CLASS[toneOf(tpl)] : ''}
            second={second}
            locked={Boolean(a?.locked)}
            ot={Boolean(a?.is_overtime)}
            comp={Boolean(a?.earns_comp_off)}
            errored={errorDates.includes(`|${d}|`)}
            selected={selectedDates.includes(`|${d}|`)}
            pulse={pulseDate === d}
            weekend={isWeekend(d)}
            title={title}
            canEdit={canEdit}
            onMove={onMove}
          />
        );
      })}
    </div>
  );
}

function equal(a: GridRowProps, b: GridRowProps) {
  return (
    a.employee === b.employee &&
    sameRefs(a.rows, b.rows) &&
    a.dates === b.dates &&
    a.templates === b.templates &&
    a.errorDates === b.errorDates &&
    a.selectedDates === b.selectedDates &&
    a.pulseDate === b.pulseDate &&
    a.hours === b.hours &&
    a.canEdit === b.canEdit &&
    a.onMove === b.onMove
  );
}

export const GridRow = React.memo(GridRowImpl, equal);
