'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { orgMonth, useOrgTimezone } from '@/lib/datetime';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { PageHead } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import { DashboardTab } from './DashboardTab';
import { ItemsTab } from './ItemsTab';
import { ReportsTab } from './ReportsTab';

const VIEWS = [{ value: 'dashboard', label: 'DPR analytics' }, { value: 'billing', label: 'CBD / billing' }, { value: 'calendar', label: 'Reports calendar' }, { value: 'issues', label: 'Issues' }] as const;
type View = (typeof VIEWS)[number]['value'];

/** DPR dashboard, as in the old one: pick a site and a day; concrete, manpower, equipment, milestones, observations, items, billing. */
export function DprDashboardPage({ basePath }: { basePath: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tz = useOrgTimezone();
  const sites = useAsync(() => api.overview(), []);
  const list = sites.data?.items || [];
  const siteId = Number(params.get('site')) || list[0]?.site.id || 0;
  const billingOn = Boolean(list.find((r) => r.site.id === siteId)?.billing_enabled);
  const views = VIEWS.filter((v) => v.value !== 'billing' || billingOn);
  const asked = params.get('view');
  const view = (views.some((v) => v.value === asked) ? asked : 'dashboard') as View;
  const month = /^\d{4}-\d{2}$/.test(params.get('month') || '') ? (params.get('month') as string) : orgMonth(tz);
  const go = (next: Record<string, string>) => {
    const qs = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) qs.set(k, v);
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  };
  // Milestones, plans and setup live on the planning page.
  const onTab = (t: string) => (t === 'items' ? go({ view: 'issues' }) : router.push(`${basePath}/planning/${siteId}?tab=${t === 'setup' ? 'setup' : 'plan'}`));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      <PageHead
        title="DPR dashboard"
        subtitle={list.find((r) => r.site.id === siteId)?.site.name || 'Pick a site'}
        actions={list.length > 0 && (
          <select value={siteId || ''} onChange={(e) => go({ site: e.target.value })} aria-label="Site"
            className="h-9 min-w-[12rem] rounded-lg border border-line bg-surface px-2.5 text-sm text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]">
            {list.map((r) => <option key={r.site.id} value={r.site.id}>{r.site.name}</option>)}
          </select>
        )}
      >
        {siteId > 0 && <div className="overflow-x-auto tt-scroll-hidden"><SegmentedControl fitText value={view} onChange={(v) => go({ view: v })} options={views} /></div>}
      </PageHead>
      {sites.error && <p className="text-sm text-[var(--tt-danger)]">{sites.error}</p>}
      {!sites.data && !sites.error && <div className="rounded-xl border border-line bg-surface p-4"><TableSkeleton rows={6} columns={4} /></div>}
      {sites.data && !list.length && <div className="rounded-xl border border-line bg-surface p-6"><EmptyState illustration={{ src: '/vectors/patterns.svg', width: 180, height: 140, alt: '' }} title="No sites for you yet" description="You see a site here once you are named on it to report or review, or can view DPR." /></div>}
      {siteId > 0 && (view === 'dashboard' || view === 'billing') && <DashboardTab key={`${siteId}:${view}`} kind={view === 'billing' ? 'billing' : 'progress'} siteId={siteId} basePath={basePath} onTab={onTab} />}
      {siteId > 0 && view === 'calendar' && <ReportsTab key={siteId} siteId={siteId} basePath={basePath} month={month} onMonth={(m) => go({ month: m })} />}
      {siteId > 0 && view === 'issues' && <ItemsTab key={siteId} siteId={siteId} basePath={basePath} />}
    </div>
  );
}
