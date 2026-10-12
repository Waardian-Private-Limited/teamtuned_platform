'use client';

import Link from 'next/link';
import { PencilLine } from 'lucide-react';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import type { AdvanceDetail } from '../../types/salaryAdvance.model';
import { money, monthLabel } from '../../utils/format';
import { Panel } from './DetailSections';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-semibold text-fg">{children}</span>
    </div>
  );
}

/** The decided repayment plan before payout, and merge links after. */
export function PlanPanel({ detail, base, onEdit }: { detail: AdvanceDetail; base: string; onEdit: () => void }) {
  const ctx = detail.planContext;
  const link = (id: number) => <Link key={id} href={`${base}/advances/${id}`} className="underline underline-offset-2 hover:text-fg-muted">#{id}</Link>;

  if (!ctx) {
    if (!detail.mergedIntoId && !detail.mergedFrom.length) return null;
    return (
      <Panel title="Merged">
        {detail.mergedIntoId && <Row label="Moved into">{link(detail.mergedIntoId)}</Row>}
        {detail.mergedFrom.map((m) => (
          <Row key={m.advanceId} label={`Took over ${money(m.outstanding)} from`}>{link(m.advanceId)}</Row>
        ))}
      </Panel>
    );
  }

  const p = ctx.plan;
  const merging = ctx.mergeable.filter((m) => p.mergeAdvanceIds.includes(m.id));
  return (
    <Panel
      title="Repayment plan"
      aside={detail.can.plan ? <Btn icon={<PencilLine className="h-3.5 w-3.5" />} onClick={onEdit}>Change</Btn> : undefined}
    >
      <Row label="Amount">{money(p.approvedAmount)}</Row>
      <Row label="Repayment">{p.installments === 1 ? 'In one go' : `${p.installments} instalments of ${money(p.installmentAmount)}`}</Row>
      <Row label="First deduction">{p.startMonthPlanned ? monthLabel(p.startMonthPlanned, 'short') : 'Payroll after payout'}</Row>
      <Row label="Paid out">{p.disbursementMode === 'payroll' ? 'With payroll' : 'By Accounts'}</Row>
      {merging.length > 0 && <Row label="Merges">{merging.map((m) => link(m.id))}</Row>}
      {ctx.mergeable.length > merging.length && (
        <Row label="Kept separate">{ctx.mergeable.filter((m) => !p.mergeAdvanceIds.includes(m.id)).map((m) => link(m.id))}</Row>
      )}
      <Row label="Total a month">{money(p.monthlyDeduction)}</Row>
    </Panel>
  );
}
