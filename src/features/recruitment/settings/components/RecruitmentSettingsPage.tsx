'use client';

import { useState } from 'react';
import { Tabs } from '../../shared/components/Tabs';
import { pageTitle, toolbarCard } from '../../interviews/lib/ui';
import { TestBankPanel } from './tests/TestBankPanel';
import { CareersSettingsPanel } from './CareersSettingsPanel';
import { ApiKeysPanel } from './ApiKeysPanel';
import { IntegrationPanel } from './IntegrationPanel';
import { ScorecardSettingsPanel } from './ScorecardSettingsPanel';
import { ReferralProgramPanel } from './ReferralProgramPanel';

type Tab = 'tests' | 'scorecards' | 'referrals' | 'careers';
const TABS = [{ value: 'tests', label: 'Tests' }, { value: 'scorecards', label: 'Scorecards' }, { value: 'referrals', label: 'Referrals' }, { value: 'careers', label: 'Careers & API' }] as const;

export function RecruitmentSettingsPage() {
  const [tab, setTab] = useState<Tab>('tests');
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className={toolbarCard}>
        <h1 className={pageTitle}>Recruitment settings</h1>
        <Tabs tabs={TABS} value={tab} onChange={setTab} idPrefix="recruit-settings" ariaLabel="Settings sections" />
      </div>
      <div id={`recruit-settings-panel-${tab}`} role="tabpanel" className="min-h-0 flex-1 space-y-3 overflow-y-auto tt-scroll-hidden">
        {tab === 'tests' ? (
          <TestBankPanel />
        ) : tab === 'scorecards' ? (
          <ScorecardSettingsPanel />
        ) : tab === 'referrals' ? (
          <ReferralProgramPanel />
        ) : (
          <>
            <CareersSettingsPanel />
            <ApiKeysPanel />
            <IntegrationPanel />
          </>
        )}
      </div>
    </div>
  );
}
