'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, SquarePen } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { InfoRow, Section } from '@/components/ui/FormControls';
import { usePermission } from '@/lib/hooks/usePermission';
import { formatDate } from '@/lib/datetime';
import { EMPLOYEE_PERMISSIONS, STATUS_TONE } from '../constants/employees.constants';
import { useEmployeeDetail } from '../hooks/useEmployeeDetail';
import { useEmployeeRoutes } from '../hooks/useEmployeeRoutes';
import { ContractCard } from './detail/ContractCard';

/** One employee at a glance: job placement and, for fixed-term staff, the contract. Editing stays on the form. */
export function EmployeeDetailPage({ employeeId }: { employeeId: number }) {
  const routes = useEmployeeRoutes();
  const { can } = usePermission();
  const canEdit = can(EMPLOYEE_PERMISSIONS.EDIT);
  const { detail: d, error, setContract } = useEmployeeDetail(employeeId);
  const primarySite = d?.sites?.find((s) => s.is_primary)?.name || null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href={routes.list} aria-label="Back to employees" className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">{d?.name || 'Employee'}</h1>
            <p className="truncate text-[11px] text-fg-muted sm:text-xs">{d ? [d.employee_code, d.designation].filter(Boolean).join(' · ') || '—' : ''}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {d && d.status !== 'Deleted' && <StatusPill label={d.status} tone={STATUS_TONE[d.status]} />}
          {canEdit && d && (
            <Link href={routes.edit(employeeId)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm">
              <SquarePen className="h-3.5 w-3.5" />
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto tt-scroll-hidden">
        {error ? (
          <p className="rounded-xl border border-line bg-surface p-5 text-sm text-[var(--tt-danger)]">{error}</p>
        ) : !d ? (
          <div className="h-48 animate-pulse rounded-xl border border-line bg-bg-subtle" />
        ) : (
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 lg:grid-cols-2">
            <Section title="Job">
              <div className="divide-y divide-line/60">
                <InfoRow label="Joined" value={formatDate(d.employment_start_date)} />
                {d.confirmation_date && <InfoRow label="Confirmation" value={formatDate(d.confirmation_date)} />}
                <InfoRow label="Reporting manager" value={d.reporting_manager?.name || '—'} />
                <InfoRow label="Primary site" value={primarySite || '—'} />
                <InfoRow label="Work state" value={d.work_state || '—'} />
                <InfoRow label="Grade / band" value={d.grade_name || '—'} />
                <InfoRow label="Cost centre" value={d.cost_centre_name || '—'} />
                {d.exit_date && <InfoRow label="Exit date" value={formatDate(d.exit_date)} />}
              </div>
            </Section>
            {d.contract_end && (
              <ContractCard
                employeeId={employeeId}
                start={d.contract_start}
                end={d.contract_end}
                canRenew={canEdit && d.status !== 'Terminated' && d.status !== 'Deleted'}
                onRenewed={setContract}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
