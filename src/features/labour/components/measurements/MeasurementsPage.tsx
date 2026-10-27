'use client';

import React, { useState } from 'react';
import { LABOUR_MEAS_PAGE_PERMS, LABOUR_MEAS_PERMS } from '../../constants/labour.constants';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import { Gate, PageHeader, Tabs } from '../shared/Primitives';
import { EntriesTab } from './EntriesTab';
import { WorkItemsTab } from './WorkItemsTab';

type Tab = 'entries' | 'items';

/** Measurement book: piece-rate / lump-sum work entries (draft -> submitted -> approved) and the work item catalogue with dated rates. */
export function MeasurementsPage() {
  const { enabled, canAny } = useLabourAccess();
  return <Gate enabled={enabled} allowed={canAny(LABOUR_MEAS_PAGE_PERMS)} what="the measurement book"><Book /></Gate>;
}

function Book() {
  const { canAny } = useLabourAccess();
  const canEntries = canAny(LABOUR_MEAS_PERMS);
  const [tab, setTab] = useState<Tab>(canEntries ? 'entries' : 'items');
  const tabs: Array<{ value: Tab; label: string }> = [...(canEntries ? [{ value: 'entries' as const, label: 'Entries' }] : []), { value: 'items', label: 'Work items' }];
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Measurement book" description="Work paid by measurement: piece rates (₹ per sq m, per rmt …) and lump-sum jobs, entered and approved here." />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={tabs} />
      {tab === 'entries' && canEntries ? <EntriesTab /> : <WorkItemsTab />}
    </div>
  );
}
