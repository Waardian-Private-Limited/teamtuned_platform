'use client';

import React from 'react';
import { DISBURSEMENT_LABEL, KIND_LABEL } from '../../constants/salaryAdvance.constants';
import type { AdvanceDetail } from '../../types/salaryAdvance.model';
import { dateText, monthLabel } from '../../utils/format';
import { Block } from './StatusBadges';

export function Panel({ title, aside, children, flush }: { title: string; aside?: React.ReactNode; children: React.ReactNode; flush?: boolean }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--tt-shadow-sm)]">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-sm font-bold text-fg">{title}</h2>
        {aside}
      </header>
      <div className={flush ? '' : 'p-4 sm:p-5'}>{children}</div>
    </section>
  );
}

function Fact({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2 min-w-0' : 'min-w-0'}>
      <dt className="text-[11px] text-fg-muted sm:text-xs">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}

export function DetailFacts({ detail }: { detail: AdvanceDetail }) {
  const d = detail;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      <Fact label="Type" value={`${d.typeName} · ${KIND_LABEL[d.kind]}`} />
      <Fact label="Paid out" value={DISBURSEMENT_LABEL[d.disbursementMode]} />
      <Fact label="Requested on" value={dateText(d.createdAt)} />
      <Fact label="Decided on" value={dateText(d.decidedAt)} />
      <Fact label="Paid out on" value={dateText(d.disbursedAt)} />
      <Fact label="First instalment" value={d.startMonth ? monthLabel(d.startMonth) : '—'} />
      {d.closedAt && <Fact label="Closed on" value={dateText(d.closedAt)} />}
      {d.source !== 'employee' && <Fact label="Created by" value={d.source === 'hr' ? 'HR' : 'Imported from the old system'} />}
      {d.reason && <Fact wide label="Reason" value={<span className="font-normal">{d.reason}</span>} />}
    </dl>
  );
}

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Block className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Block key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Block className="h-80 rounded-xl" />
        <Block className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
