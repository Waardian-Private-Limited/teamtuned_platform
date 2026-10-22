'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import { useRouter, useSearchParams } from 'next/navigation';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { usePermission } from '@/lib/hooks/usePermission';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { PERF_PERMISSIONS, TABS, type TabKey } from '../constants/perf.constants';
import { CompetencyTab, KraTab } from './KraTab';
import { KpiTab } from './KpiTab';
import { PresetsTab } from './PresetsTab';
import { RuleTab } from './RuleTab';
import { ScaleTab } from './ScaleTab';
import { SettingsTab } from './SettingsTab';
import { TemplateTab } from './TemplateTab';
import { PageHead } from './ui';

/** Performance setup: the library of KRAs, KPIs and competencies, the templates built from them, who gets which, and the settings. */
export function PerformanceSetup() {
  const router = useRouter();
  const params = useSearchParams();
  const { isOrgAdmin, can } = usePermission();
  const canEdit = can(PERF_PERMISSIONS.CONFIGURE);
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  // Tabs remount when imported data changes, so lists reload.
  const [version, setVersion] = React.useState(0);

  const tab: TabKey = TABS.some((t) => t.value === params.get('tab')) ? (params.get('tab') as TabKey) : 'templates';
  const setTab = (next: TabKey) => router.replace(`?tab=${next}`, { scroll: false });
  const shared = { subOrgId, canEdit, isOrgAdmin };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead title="Performance setup" subtitle="Library, templates and rules" help={HELP.setup}
        actions={<SubOrgFilter value={subOrgId} onChange={setSubOrgId} />}>
        <div className="overflow-x-auto tt-scroll-hidden">
          <SegmentedControl<TabKey> options={TABS} value={tab} onChange={setTab} fitText />
        </div>
      </PageHead>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-line bg-surface p-3 tt-scroll-hidden sm:p-4">
        <div key={`${tab}-${subOrgId ?? 'all'}-${version}`}>
          {tab === 'templates' && <TemplateTab {...shared} />}
          {tab === 'kpis' && <KpiTab {...shared} />}
          {tab === 'kras' && <KraTab {...shared} />}
          {tab === 'competencies' && <CompetencyTab {...shared} />}
          {tab === 'scales' && <ScaleTab {...shared} />}
          {tab === 'rules' && <RuleTab {...shared} />}
          {tab === 'settings' && <SettingsTab subOrgId={subOrgId} canEdit={canEdit} />}
          {tab === 'presets' && <PresetsTab {...shared} onImported={() => setVersion((v) => v + 1)} />}
        </div>
      </div>
    </div>
  );
}
