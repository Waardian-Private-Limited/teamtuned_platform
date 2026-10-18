'use client';

import React from 'react';
import { FileText, IdCard } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import * as api from '../api/insurance.api';
import { ILLUSTRATIONS, RELATION_LABEL, TYPE_LABEL } from '../constants/insurance.constants';
import { useMyCover } from '../hooks/useInsuranceData';
import { useOpenFile } from '../hooks/useOpenFile';
import type { Enrollment, Member } from '../types/insurance.types';
import { ageOf, day, money } from '../utils/format';
import { PremiumSummary } from './components/PremiumSummary';
import { StatusBadge } from './components/StatusBadge';

function People({ title, list }: { title: string; list: Member[] }) {
  if (!list.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{title}</p>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {list.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <span className="min-w-0 truncate"><span className="font-semibold text-fg">{m.name}</span> <span className="text-fg-muted">· {RELATION_LABEL[m.relation]}{m.dob ? ` · ${ageOf(m.dob)}` : ''}</span></span>
            {m.role === 'nominee' && <span className="shrink-0 font-semibold tabular-nums text-fg">{m.nominee_share}%</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CoverCard({ cover }: { cover: Enrollment }) {
  const files = useOpenFile();
  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-fg">{cover.plan.name}</p>
          <p className="truncate text-xs text-fg-muted">{TYPE_LABEL[cover.plan.type]} · {cover.plan.insurer}{cover.plan.policy_number ? ` · ${cover.plan.policy_number}` : ''}</p>
        </div>
        <StatusBadge status={cover.status} />
      </header>

      <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div><dt className="text-fg-muted">Sum insured</dt><dd className="text-sm font-bold tabular-nums text-fg">{money(cover.sum_insured)}</dd></div>
        <div><dt className="text-fg-muted">Valid from</dt><dd className="font-semibold text-fg">{day(cover.start_date)}</dd></div>
        <div><dt className="text-fg-muted">Valid till</dt><dd className="font-semibold text-fg">{day(cover.end_date)}</dd></div>
        <div><dt className="text-fg-muted">Member no</dt><dd className="font-semibold text-fg">{cover.member_no || '—'}</dd></div>
      </dl>

      <People title="Family covered" list={cover.dependents} />
      <People title="Nominees" list={cover.nominees} />

      {cover.annual_premium > 0 && (
        <PremiumSummary
          annual={cover.annual_premium}
          employer={cover.employer_share}
          employee={cover.employee_share}
          recovery={{ mode: cover.recovery.mode, installments: cover.recovery.months }}
          schedule={cover.dues}
        />
      )}

      {(cover.has_card || cover.plan.has_document) && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          {cover.has_card && <Btn onClick={() => files.open('card', () => api.cardLink(cover.id, true))} busy={files.busy === 'card'} icon={<IdCard className="h-3.5 w-3.5" />}>E-card</Btn>}
          {cover.plan.has_document && <Btn onClick={() => files.open('doc', () => api.myDocumentLink(cover.id))} busy={files.busy === 'doc'} icon={<FileText className="h-3.5 w-3.5" />}>Policy document</Btn>}
        </div>
      )}
    </article>
  );
}

export function MyInsurancePage() {
  const { items, isLoading, error } = useMyCover();
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto tt-scroll-hidden">
      <div className="rounded-xl border border-line bg-surface p-3 sm:p-3.5"><h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">My insurance</h1></div>
      {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>}
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl border border-line bg-bg-subtle" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState illustration={ILLUSTRATIONS.health} title="You are not covered yet" description="When your company adds you to an insurance plan, it shows up here." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{items.map((c) => <CoverCard key={c.id} cover={c} />)}</div>
      )}
    </div>
  );
}
