'use client';

import React from 'react';
import { Archive, ArchiveRestore, CalendarClock, Pencil, RefreshCw, Trash2, Users } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { TYPE_LABEL } from '../../constants/insurance.constants';
import type { Plan } from '../../types/insurance.types';
import { day, money, recoveryText } from '../../utils/format';

interface PlanCardProps {
  plan: Plan;
  today: string;
  canManage: boolean;
  onEdit: () => void;
  onRenew: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onOpenCoverage: () => void;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-fg-muted">{children}</span>;
}

function coversText(plan: Plan): string[] {
  const c = plan.covers;
  const out: string[] = ['Employee'];
  if (c.spouse) out.push('Spouse');
  if (c.children) out.push(c.maxChildren ? `Up to ${c.maxChildren} children` : 'Children');
  if (c.parents) out.push('Parents');
  if (c.parentsInLaw) out.push('Parents-in-law');
  return out;
}

export function PlanCard({ plan, today, canManage, onEdit, onRenew, onArchive, onDelete, onOpenCoverage }: PlanCardProps) {
  const expired = plan.end_date < today;
  const archived = plan.status === 'archived';
  const employer = plan.premium.employer;
  return (
    <div className={cx('flex min-w-0 flex-col justify-between gap-4 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5', archived && 'opacity-75')}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-fg">{plan.name}</p>
            <p className="truncate text-[11px] text-fg-muted">{plan.insurer}{plan.policy_number ? ` · ${plan.policy_number}` : ''}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            <Chip>{TYPE_LABEL[plan.type]}</Chip>
            {archived && <Chip>Archived</Chip>}
            {!archived && expired && <Chip>Expired</Chip>}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-fg-muted">Sum insured</p>
        <p className="text-2xl font-extrabold tabular-nums text-fg">{money(plan.sum_insured)}</p>

        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <CalendarClock className="h-3.5 w-3.5" /> {day(plan.start_date)} – {day(plan.end_date)}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {coversText(plan).map((t) => <Chip key={t}>{t}</Chip>)}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-fg-muted">Yearly premium</dt>
            <dd className="font-semibold tabular-nums text-fg">{money(plan.premium.amount)}{plan.premium.basis === 'per_member' ? ' / person' : ''}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Company pays</dt>
            <dd className="font-semibold tabular-nums text-fg">{employer.type === 'percent' ? `${employer.value}%` : money(employer.value)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-fg-muted">Employee share</dt>
            <dd className="font-semibold text-fg">{recoveryText(plan.recovery.mode, plan.recovery.installments, plan.recovery.calendarMonths)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <button type="button" onClick={onOpenCoverage} className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg underline-offset-4 hover:underline">
          <Users className="h-3.5 w-3.5" /> {plan.employees} covered
        </button>
        {canManage && (
          <div className="flex items-center gap-0.5">
            <IconBtn label="Edit" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></IconBtn>
            {!archived && <IconBtn label="Renew" onClick={onRenew}><RefreshCw className="h-3.5 w-3.5" /></IconBtn>}
            <IconBtn label={archived ? 'Restore' : 'Archive'} onClick={onArchive}>{archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}</IconBtn>
            {plan.employees === 0 && <IconBtn label="Delete" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></IconBtn>}
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="rounded-md p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
      {children}
    </button>
  );
}
