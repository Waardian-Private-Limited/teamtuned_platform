'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePermission } from '@/lib/hooks/usePermission';
import { Alert } from '@/components/ui/Alert';
import { COMP_PERMISSIONS, TABS, type TabKey } from '../constants/compensation.constants';
import { useCompensationSettings } from '../hooks/useCompensationSettings';
import { FilterTabs } from './shared/FilterTabs';
import { CyclesTab } from './cycles/CyclesTab';
import { PayoutsTab } from './payouts/PayoutsTab';
import { StatutoryBonusTab } from './benefits/StatutoryBonusTab';
import { GratuityTab } from './benefits/GratuityTab';
import { SettingsTab } from './settings/SettingsTab';
import { SalaryHistoryDrawer } from './SalaryHistoryDrawer';

export function CompensationPage() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const params = useSearchParams();
  const { can: canCode, hasPerm } = usePermission();
  const can = (code: string) => canCode(code) || hasPerm('HR_MODE');
  const perms = {
    add: can(COMP_PERMISSIONS.ADD),
    edit: can(COMP_PERMISSIONS.EDIT),
    approve: can(COMP_PERMISSIONS.APPROVE),
    remove: can(COMP_PERMISSIONS.DELETE),
  };
  const tab = (TABS.find((t) => t.value === params.get('tab'))?.value || 'appraisals') as TabKey;
  const setTab = (next: TabKey) => router.replace(`${pathname}?tab=${next}`, { scroll: false });
  const settings = useCompensationSettings(null);
  const [historyId, setHistoryId] = React.useState<number | null>(null);
  const catalog = settings.data?.catalog;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div>
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Compensation</h1>
          <p className="text-[11px] text-fg-muted sm:text-xs">Appraisal cycles, bonuses and payouts, statutory bonus, gratuity and compensation rules</p>
        </div>
        <FilterTabs options={TABS} value={tab} onChange={setTab} />
      </div>
      {settings.error && <Alert message={settings.error} tone="error" />}
      {tab === 'appraisals' && <CyclesTab canAdd={perms.add} basePath={pathname} ratingScale={settings.data?.settings.ratingScale || []} />}
      {tab === 'payouts' && <PayoutsTab perms={perms} payoutTypes={catalog?.payout_types || []} allTypes={catalog?.all_payout_types || []} onOpenHistory={setHistoryId} />}
      {tab === 'bonus' && <StatutoryBonusTab canAdd={perms.add} rules={settings.data?.settings.statutoryBonus || null} />}
      {tab === 'gratuity' && <GratuityTab canAdd={perms.add} rules={settings.data?.settings.gratuity || null} />}
      {tab === 'settings' && settings.data && <SettingsTab data={settings.data} canEdit={perms.edit} onSaved={settings.reload} />}
      <SalaryHistoryDrawer employeeId={historyId} onClose={() => setHistoryId(null)} />
    </div>
  );
}
