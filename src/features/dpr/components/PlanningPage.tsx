'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CalendarRange, ListChecks, Settings } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { btnClass, IconBtn, PageHead, Panel, SearchBox, Table, td } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import { n1, Tag } from './parts';
import { PlanTab } from './PlanTab';
import { SetupTab } from './SetupTab';

/** Planning: every site with this month's plan, as in the old DPR planning screen. A site opens its plan, milestones and setup. */
export function DprPlanningPage({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState('');
  const [search, setSearch] = React.useState('');
  React.useEffect(() => { const t = setTimeout(() => setSearch(q), 250); return () => clearTimeout(t); }, [q]);
  const { data, loading, error } = useAsync(() => api.overview({ q: search }), [search]);
  const open = (id: number, tab = 'plan') => `${basePath}/planning/${id}?tab=${tab}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      <PageHead
        title="DPR planning" count={data?.items.length}
        subtitle={data ? `${data.totals.planned} of ${data.totals.sites} sites planned for ${data.month_label}` : 'Plan each site month by month'}
        actions={(
          <>
            <SearchBox value={q} onChange={setQ} placeholder="Search sites" />
            {data?.access.admin && <Link href={`${basePath}/lists`} className={btnClass('secondary')}><ListChecks className="h-3.5 w-3.5" />Master lists</Link>}
          </>
        )}
      />
      {error && <p className="text-sm text-[var(--tt-danger)]">{error}</p>}
      <Panel>
        {loading && !data ? <div className="p-4"><TableSkeleton rows={5} columns={5} /></div> : !data?.items.length ? (
          <div className="p-6"><EmptyState illustration={{ src: '/vectors/patterns.svg', width: 180, height: 140, alt: '' }} title={search ? 'No site matches' : 'No sites'} description={search ? 'Try another name or code.' : 'Sites you can plan show here.'} /></div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table minWidth={760} head={[{ label: 'Site' }, { label: 'City' }, { label: data.month_label }, { label: 'Setup' }, { label: '', className: 'text-right' }]}>
                {data.items.map((r) => (
                  <tr key={r.site.id} className="cursor-pointer hover:bg-bg-subtle/60" onClick={() => router.push(open(r.site.id, r.ready ? 'plan' : 'setup'))}>
                    <td className={td}><p className="font-semibold text-fg">{r.site.name}</p><p className="text-[11px] text-fg-muted">{r.site.code}</p></td>
                    <td className={`${td} text-fg-muted`}>{r.site.city || '—'}</td>
                    <td className={td}>{r.plan ? <Tag tone="done">Planned · {n1(r.plan.concrete_target_m3)} m³</Tag> : <Tag tone={r.ready ? 'late' : 'plain'}>Not planned</Tag>}</td>
                    <td className={td}>{r.ready ? <span className="text-xs text-fg-muted">Ready{r.billing_enabled ? ' · billing' : ''}</span> : <Tag tone="wait">Not set up</Tag>}</td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={open(r.site.id, r.ready ? 'plan' : 'setup')} className={btnClass('primary', 'sm')}><CalendarRange className="h-3.5 w-3.5" />{r.ready ? 'Plan' : 'Set up'}</Link>
                        <IconBtn label="Site setup" onClick={() => router.push(open(r.site.id, 'setup'))}><Settings className="h-4 w-4" /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {data.items.map((r) => (
                <li key={r.site.id} className="flex items-center justify-between gap-3 p-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">{r.site.name}</p>
                    <div className="mt-1">{r.plan ? <Tag tone="done">Planned</Tag> : <Tag tone={r.ready ? 'late' : 'plain'}>{r.ready ? 'Not planned' : 'Not set up'}</Tag>}</div>
                  </div>
                  <Link href={open(r.site.id, r.ready ? 'plan' : 'setup')} className={btnClass('primary', 'sm')}>{r.ready ? 'Plan' : 'Set up'}</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}

const TABS = [{ value: 'plan', label: 'Plans' }, { value: 'setup', label: 'Site setup' }] as const;
type Tab = (typeof TABS)[number]['value'];

/** One site's planning: the month plan, the milestones and the site setup. */
export function DprPlanningSitePage({ basePath, siteId }: { basePath: string; siteId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // Milestones live inside each month's plan.
  const tab = (params.get('tab') === 'setup' ? 'setup' : 'plan') as Tab;
  const planParam = params.get('plan');
  const plan = planParam === 'new' ? 'new' : Number(planParam) > 0 ? Number(planParam) : null;
  const { data, error, refetch } = useAsync(() => api.setup(siteId), [siteId]);
  const go = (next: { tab?: string; plan?: number | 'new' | null }) => {
    const qs = new URLSearchParams(params.toString());
    if (next.tab) qs.set('tab', next.tab);
    if (next.plan !== undefined) { if (next.plan === null) qs.delete('plan'); else qs.set('plan', String(next.plan)); }
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  };
  const back = <Link href={`${basePath}/planning`} aria-label="All sites" className="rounded-lg p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>;
  if (error) return <div className="space-y-3">{back}<p className="text-sm text-[var(--tt-danger)]">{error}</p></div>;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      <PageHead
        title={<>{back}{data?.site.name || 'Site'}</>}
        subtitle={data ? [data.site.code, data.site.city, data.setup.ready ? `${data.setup.locations.length} locations` : 'not set up yet'].filter(Boolean).join(' · ') : ' '}
        actions={<Link href={`${basePath}/dashboard?site=${siteId}`} className={btnClass('secondary')}>Dashboard</Link>}
      >
        <div className="overflow-x-auto tt-scroll-hidden"><SegmentedControl fitText value={tab} onChange={(t) => go({ tab: t, plan: null })} options={TABS} /></div>
      </PageHead>
      {tab === 'plan' && <PlanTab siteId={siteId} plan={plan} onOpen={(p) => go({ tab: 'plan', plan: p })} onTab={(t) => go({ tab: t === 'setup' ? 'setup' : 'plan' })} />}
      {tab === 'setup' && data && <SetupTab siteId={siteId} initial={data} onSaved={refetch} />}
    </div>
  );
}
