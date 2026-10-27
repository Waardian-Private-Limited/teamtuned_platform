'use client';

import React, { useState } from 'react';
import { LP } from '../../constants/labour.constants';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import { Gate, PageHeader, Tabs } from '../shared/Primitives';
import { PacksTab } from './PacksTab';
import { PresetsSection } from './PresetsSection';
import { TemplatesTab } from './TemplatesTab';

export function CompliancePage() {
  const { enabled, can } = useLabourAccess();
  return <Gate enabled={enabled} allowed={can(LP.COMPLIANCE)} what="compliance forms"><Compliance /></Gate>;
}

function Compliance() {
  const [tab, setTab] = useState<'forms' | 'packs'>('forms');
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto tt-scroll-hidden">
      <PageHeader title="Compliance forms" description="Design the forms clients ask for and set which sites collect which details." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'forms', label: 'Forms' }, { value: 'packs', label: 'Packs' }]} />
      <PresetsSection onInstalled={() => setReloadKey((k) => k + 1)} />
      {tab === 'forms' ? <TemplatesTab reloadKey={reloadKey} /> : <PacksTab reloadKey={reloadKey} />}
    </div>
  );
}
