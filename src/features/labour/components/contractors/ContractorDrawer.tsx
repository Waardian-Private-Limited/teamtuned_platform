'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { GitMerge } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/labour.api';
import type { Contractor } from '../../types/labour.types';
import { FormError, Pill, Tabs, secondaryBtn } from '../shared/Primitives';
import { ContractorDocuments } from './ContractorDocuments';
import { ContractorForm } from './ContractorForm';
import { ContractorRates } from './ContractorRates';

type Tab = 'details' | 'documents' | 'rates';

interface Props { open: boolean; id: number | 'new' | null; onClose: () => void; canManage: boolean; onChanged: () => void; onMerge: (c: { id: number; name: string }) => void; onCreated: (id: number) => void }

export function ContractorDrawer({ open, id, onClose, canManage, onChanged, onMerge, onCreated }: Props) {
  return (
    <Drawer open={open} onClose={onClose} title={id === 'new' ? 'Add contractor' : 'Contractor'} maxWidthClassName="sm:max-w-2xl">
      {open && id !== null && <Body key={String(id)} id={id} canManage={canManage} onChanged={onChanged} onMerge={onMerge} onCreated={onCreated} />}
    </Drawer>
  );
}

function Body({ id, canManage, onChanged, onMerge, onCreated }: Omit<Props, 'open' | 'onClose'> & { id: number | 'new' }) {
  const [c, setC] = useState<Contractor | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('details');
  const load = useCallback(() => { if (id !== 'new') api.getContractor(id).then(setC).catch((e) => setError(messageOf(e))); }, [id]);
  useEffect(() => { load(); }, [load]);

  if (id === 'new') return canManage ? <ContractorForm contractor={null} onSaved={(nid) => { onChanged(); onCreated(nid); }} /> : <FormError message="You do not have permission to add contractors." />;
  if (error) return <FormError message={error} />;
  if (!c) return <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;

  const name = c.tradeName || c.legalName;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-fg">{c.legalName}</h3>
          <p className="text-xs text-fg-muted">{[c.code, `${c.labourCount} labourers`].filter(Boolean).join(' · ')}</p>
          <div className="mt-1.5"><Pill tone={c.status === 'active' ? 'good' : 'neutral'}>{c.status}</Pill></div>
        </div>
        {canManage && c.status === 'active' && <button type="button" className={secondaryBtn} onClick={() => onMerge({ id: c.id, name })}><GitMerge className="h-3.5 w-3.5" aria-hidden />Merge</button>}
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ value: 'details', label: 'Details' }, { value: 'documents', label: `Documents (${c.documents?.length || 0})` }, { value: 'rates', label: 'Rates' }]} />
      {tab === 'details' && (canManage ? <ContractorForm contractor={c} onSaved={() => { onChanged(); load(); }} /> : <p className="text-sm text-fg-muted">You can view contractors but not edit them.</p>)}
      {tab === 'documents' && <ContractorDocuments contractorId={c.id} documents={c.documents || []} canManage={canManage} onChanged={() => { load(); }} />}
      {tab === 'rates' && <ContractorRates contractorId={c.id} canManage={canManage} />}
    </div>
  );
}
