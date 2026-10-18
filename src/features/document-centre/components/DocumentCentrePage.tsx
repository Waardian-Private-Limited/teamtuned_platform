'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { messageOf } from '@/lib/api/errors';
import { Tabs } from '@/features/recruitment/shared/components/Tabs';
import { pageTitle, toolbarCard } from '@/features/recruitment/interviews/lib/ui';
import * as api from '../api/documents.api';
import type { AssetDto, TypesDto } from '../types/documents.dto';
import { GeneratePanel } from './generate/GeneratePanel';
import { TemplatesPanel } from './templates/TemplatesPanel';
import { AssetsPanel } from './assets/AssetsPanel';

type Tab = 'generate' | 'templates' | 'assets';
const TABS = [
  { value: 'generate', label: 'Generate' },
  { value: 'templates', label: 'Templates' },
  { value: 'assets', label: 'Signatures & stamps' },
] as const;

/**
 * Document Centre: letters made from templates HR designs (offer, appointment, joining for now),
 * generated on demand and downloaded or emailed — nothing is stored but the issue log.
 * `?candidate=<applicationId>` opens Generate for that candidate.
 */
export function DocumentCentrePage() {
  const params = useSearchParams();
  const candidate = Number(params.get('candidate')) || null;
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'templates' ? 'templates' : 'generate');
  const [types, setTypes] = useState<TypesDto | null>(null);
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAssets = useCallback(() => {
    api.listAssets().then((r) => setAssets(r.items)).catch(() => setAssets([]));
  }, []);

  useEffect(() => {
    api.getTypes().then(setTypes).catch((err) => setError(messageOf(err)));
    loadAssets();
  }, [loadAssets]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className={toolbarCard}>
        <h1 className={pageTitle}>Document Centre</h1>
        <Tabs tabs={TABS} value={tab} onChange={setTab} idPrefix="doc-centre" ariaLabel="Document Centre sections" />
      </div>
      <div id={`doc-centre-panel-${tab}`} role="tabpanel" aria-labelledby={`doc-centre-tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto tt-scroll-hidden">
        {error && <Alert message={error} tone="error" />}
        {tab === 'generate' && <GeneratePanel initialCandidateId={candidate} />}
        {tab === 'templates' && types && <TemplatesPanel types={types} assets={assets} />}
        {tab === 'assets' && <AssetsPanel assets={assets} onChanged={loadAssets} />}
      </div>
    </div>
  );
}
