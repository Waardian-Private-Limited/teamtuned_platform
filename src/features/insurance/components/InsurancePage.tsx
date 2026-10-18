'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { usePermission } from '@/lib/hooks/usePermission';
import { INSURANCE_ACCESS, INSURANCE_PERMISSIONS } from '../constants/insurance.constants';
import { CoverageTab } from './CoverageTab';
import { NoAccess } from './components/NoAccess';
import { OverviewTab } from './OverviewTab';
import { PlansTab } from './PlansTab';

type Tab = 'overview' | 'plans' | 'coverage';

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'plans', label: 'Plans' },
  { value: 'coverage', label: 'Coverage' },
];

const todayLocal = () => new Date().toLocaleDateString('en-CA');

export function InsurancePage() {
  const { canAny } = usePermission();
  if (!canAny(INSURANCE_ACCESS)) return <NoAccess />;
  return <Insurance />;
}

function Insurance() {
  const { can } = usePermission();
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.some((t) => t.value === raw) ? (raw as Tab) : 'overview';
  const planParam = Number(params.get('plan'));

  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  const [planId, setPlanId] = React.useState<number | null>(Number.isInteger(planParam) && planParam > 0 ? planParam : null);
  const [version, setVersion] = React.useState(0);
  const today = React.useMemo(todayLocal, []);

  const go = (next: Tab, plan: number | null = null) => {
    setPlanId(plan);
    const q = new URLSearchParams();
    if (next !== 'overview') q.set('tab', next);
    if (plan) q.set('plan', String(plan));
    router.replace(q.toString() ? `?${q}` : '?', { scroll: false });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
        <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Insurance</h1>
        <SegmentedControl fitText value={tab} onChange={(v) => go(v)} options={TABS} />
      </div>

      {tab === 'overview' && (
        <OverviewTab subOrgId={subOrgId} onSubOrgChange={setSubOrgId} version={version} onOpenPlan={(id) => go('coverage', id)} onOpenCoverage={() => go('coverage')} />
      )}
      {tab === 'plans' && (
        <PlansTab
          today={today}
          canManage={can(INSURANCE_PERMISSIONS.PLANS)}
          subOrgId={subOrgId}
          onSubOrgChange={setSubOrgId}
          onOpenCoverage={(id) => go('coverage', id)}
          onChanged={() => setVersion((v) => v + 1)}
        />
      )}
      {tab === 'coverage' && (
        <CoverageTab
          canEnroll={can(INSURANCE_PERMISSIONS.ENROLL)}
          initialPlanId={planId}
          subOrgId={subOrgId}
          onSubOrgChange={setSubOrgId}
          onChanged={() => setVersion((v) => v + 1)}
        />
      )}
    </div>
  );
}
