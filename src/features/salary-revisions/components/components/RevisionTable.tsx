'use client';

import { ArrowRight } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import { StatusBadge } from '@/features/compensation/components/shared/StatusBadge';
import type { RevisionDto } from '@/features/compensation/types/compensation.dto';
import { date, inr, pct } from '@/features/compensation/utils/format';
import { RevisionRowActions, type RevisionActionHandlers, type RevisionPerms } from './RevisionRowActions';

interface Props {
  revisions: RevisionDto[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  perms: RevisionPerms;
  busyIds: Set<number>;
  handlers: RevisionActionHandlers;
}

const th = 'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle whitespace-nowrap';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4 align-middle text-xs sm:text-sm 2xl:text-base text-fg';

export function RevisionTable({ revisions, selected, onToggle, onToggleAll, perms, busyIds, handlers }: Props) {
  const all = revisions.length > 0 && revisions.every((r) => selected.has(r.id));
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[920px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(th, 'w-10 first:rounded-tl-xl')}><input type="checkbox" aria-label="Select all" checked={all} onChange={onToggleAll} /></th>
            <th className={th}>Employee</th>
            <th className={th}>Type</th>
            <th className={th}>Effective</th>
            <th className={th}>Annual CTC</th>
            <th className={th}>Change</th>
            <th className={th}>Status</th>
            <th className={cx(th, 'text-right last:rounded-tr-xl')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {revisions.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className={td}><input type="checkbox" aria-label={`Select ${r.employee.name}`} checked={selected.has(r.id)} onChange={() => onToggle(r.id)} /></td>
              <td className={td}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.employee.name}</span>
                  <SubOrgBadge subOrgId={r.sub_organization_id} />
                </div>
                <div className="text-[11px] text-fg-muted 2xl:text-xs">{[r.employee.employee_code, r.employee.department_name].filter(Boolean).join(' · ')}</div>
              </td>
              <td className={td}>
                <span className="block">{r.revision_type_label}</span>
                {r.new_designation && r.new_designation !== r.previous_designation && (
                  <span className="block text-[11px] text-fg-muted">{r.previous_designation || '—'} → {r.new_designation}</span>
                )}
              </td>
              <td className={td}>
                <span className="block whitespace-nowrap">{date(r.effective_from)}</span>
                {r.status === 'approved' && r.switch_on && <span className="block text-[11px] text-fg-muted">Payroll from {date(r.switch_on)}</span>}
              </td>
              <td className={cx(td, 'whitespace-nowrap')}>
                <span className="inline-flex items-center gap-1 text-fg-muted">{inr(r.previous_ctc)} <ArrowRight className="h-3 w-3" /></span> <b>{inr(r.new_ctc)}</b>
                {r.arrears_amount ? <span className="block text-[11px] text-fg-muted">Arrears {inr(r.arrears_amount)}</span> : null}
              </td>
              <td className={cx(td, 'font-semibold')}>{pct(r.change_percent)}</td>
              <td className={td}><StatusBadge status={r.status} /></td>
              <td className={td}><RevisionRowActions revision={r} perms={perms} busy={busyIds.has(r.id)} handlers={handlers} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
