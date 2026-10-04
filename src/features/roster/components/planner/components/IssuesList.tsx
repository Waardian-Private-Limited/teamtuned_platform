'use client';

import { useMemo } from 'react';
import { cx } from '@/theme/tokens';
import { VIOLATION_LABELS } from '../../../constants/roster.constants';
import type { BoardEmployee, ShiftInfo, Violation } from '../../../types/roster.types';
import { formatDay } from '../../../utils/rosterTime';

const SEVERITIES: { key: Violation['severity']; label: string }[] = [
  { key: 'error', label: 'Needs fixing' },
  { key: 'warning', label: 'Worth a look' },
  { key: 'info', label: 'For information' },
];

interface Props {
  violations: Violation[];
  employees: Map<number, BoardEmployee>;
  templates: Map<number, ShiftInfo>;
  onPick: (v: Violation) => void;
}

export function IssuesList({ violations, employees, templates, onPick }: Props) {
  const groups = useMemo(() => {
    const out: { severity: (typeof SEVERITIES)[number]; codes: [string, Violation[]][] }[] = [];
    for (const sev of SEVERITIES) {
      const byCode = new Map<string, Violation[]>();
      for (const v of violations) {
        if (v.severity !== sev.key) continue;
        const l = byCode.get(v.code);
        if (l) l.push(v);
        else byCode.set(v.code, [v]);
      }
      if (byCode.size) out.push({ severity: sev, codes: [...byCode.entries()] });
    }
    return out;
  }, [violations]);

  if (!violations.length) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm font-semibold text-fg">No issues found</p>
        <p className="mt-1 text-xs text-fg-muted">Every rule, leave day and coverage need is met.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.severity.key}>
          <h3 className={cx('mb-2 text-xs font-bold uppercase tracking-wide', g.severity.key === 'error' ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>
            {g.severity.label} · {g.codes.reduce((n, [, l]) => n + l.length, 0)}
          </h3>
          <div className="space-y-3">
            {g.codes.map(([code, list]) => (
              <div key={code}>
                <p className="mb-1 text-xs font-semibold text-fg">{VIOLATION_LABELS[code] || code} <span className="font-normal text-fg-muted">({list.length})</span></p>
                <ul className="divide-y divide-line/60 rounded-lg border border-line">
                  {list.map((v, i) => {
                    const who = v.employeeId !== undefined ? employees.get(v.employeeId)?.name || `Employee ${v.employeeId}` : '';
                    const shift = v.templateId ? templates.get(v.templateId)?.name : '';
                    const what = who || shift || 'Coverage';
                    return (
                      <li key={`${code}:${v.employeeId ?? ''}:${v.templateId ?? ''}:${v.date}:${i}`}>
                        <button type="button" onClick={() => onPick(v)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-bg-subtle">
                          <span className="min-w-0 truncate font-semibold text-fg">
                            {what}
                            {who && shift ? ` · ${shift}` : ''}
                          </span>
                          <span className="shrink-0 text-fg-muted">
                            {formatDay(v.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                            {code === 'understaffed' && v.slots ? ` · ${v.slots} short` : ''}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
