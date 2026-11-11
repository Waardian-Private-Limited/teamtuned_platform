'use client';

import Image from 'next/image';
import { ArrowDown, Briefcase, Building2, MapPin, Search, X } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { button, cx, heading, text } from '@/theme/tokens';
import { useHostedJobs } from '../hooks/useHostedJobs';
import type { WorkMode } from '../types/careers.types';
import { WORK_MODE_LABEL } from '../utils/format';
import { JobCard, JobCardSkeleton } from './JobCard';
import { CompanyMark, PublicShell, StatusScreen } from './PublicShell';

/** A pill filter row: "All" plus each value; scrolls sideways on small screens. */
function ChipRow({ label, value, options, onChange }: {
  label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (v: string) => void;
}) {
  if (options.length < 2 && !value) return null;
  const chip = (active: boolean) => cx(
    'inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors',
    active ? 'border-fg bg-fg text-bg' : 'border-line bg-surface text-fg hover:border-fg/40'
  );
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 tt-scroll-hidden sm:mx-0 sm:flex-wrap sm:px-0">
      <button type="button" onClick={() => onChange('')} aria-pressed={!value} className={chip(!value)}>All {label.toLowerCase()}s</button>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value === value ? '' : o.value)} aria-pressed={o.value === value} className={chip(o.value === value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof MapPin; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--tt-on-primary)]/10"><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <div>
        <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
        <p className="mt-1 text-xs opacity-70">{label}</p>
      </div>
    </div>
  );
}

export function CareersBoardPage({ slug }: { slug: string }) {
  const vm = useHostedJobs(slug);
  const company = vm.data?.company ?? null;

  if (vm.state === 'not_found') {
    return (
      <PublicShell>
        <StatusScreen
          illustration="review"
          title="Careers page not found"
          description="This careers page does not exist or is not public right now. Check the link you were given."
        />
      </PublicShell>
    );
  }

  const { facets } = vm;
  const total = vm.data?.total ?? 0;
  const loadingHero = vm.state === 'loading' && !company;

  const hero = (
    <section className="relative overflow-hidden bg-[var(--tt-primary)] text-[var(--tt-on-primary)]">
      {/* Quiet dot grid: texture without colour. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        {loadingHero ? (
          <div className="animate-pulse" aria-hidden="true">
            <div className="h-14 w-14 rounded-xl bg-white/15" />
            <div className="mt-6 h-10 w-2/3 max-w-md rounded bg-white/15" />
            <div className="mt-4 h-4 w-full max-w-xl rounded bg-white/10" />
          </div>
        ) : (
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                {company && <CompanyMark company={company} size={52} />}
                {total > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--tt-on-primary)]/20 bg-[var(--tt-on-primary)]/10 px-3 py-1 text-xs font-semibold">
                    <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />We&apos;re hiring
                  </span>
                )}
              </div>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                {company?.name ? <>Build what&apos;s next<br className="hidden sm:block" /> at {company.name}</> : 'Open positions'}
              </h1>
              {company?.intro && <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-relaxed opacity-80 sm:text-lg">{company.intro}</p>}
              <a href="#roles" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[var(--tt-on-primary)] px-6 text-sm font-bold text-[var(--tt-primary)] transition-transform hover:-translate-y-0.5">
                See {total > 0 ? `${total} open ${total === 1 ? 'role' : 'roles'}` : 'open roles'} <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            {total > 0 && (
              <div className="flex gap-6 sm:gap-8 lg:flex-col lg:gap-5">
                <Stat icon={Briefcase} value={total} label={total === 1 ? 'Open role' : 'Open roles'} />
                {facets.departments.length > 0 && <Stat icon={Building2} value={facets.departments.length} label={facets.departments.length === 1 ? 'Team' : 'Teams'} />}
                {facets.locations.length > 0 && <Stat icon={MapPin} value={facets.locations.length} label={facets.locations.length === 1 ? 'Location' : 'Locations'} />}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );

  return (
    <PublicShell company={company} hero={hero} share={company ? { title: company.name ? `Careers at ${company.name}` : 'Open positions', subtitle: 'Every open role, one scan away' } : undefined}>
      <section id="roles" aria-label="Search jobs" className="scroll-mt-20 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Search jobs</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              type="search"
              value={vm.searchInput}
              onChange={(e) => vm.setSearchInput(e.target.value)}
              placeholder="Search roles, skills or teams"
              className="h-14 w-full rounded-full border border-line bg-surface pl-12 pr-5 text-base text-fg shadow-[var(--tt-shadow-sm)] outline-none transition-colors placeholder:text-fg-subtle hover:border-line-strong focus:border-[var(--tt-primary)] focus:ring-4 focus:ring-[var(--tt-ring)]"
            />
          </label>
          {(facets.workModes.length > 1 || vm.filters.workMode) && (
            <div className="flex shrink-0 rounded-full border border-line bg-surface p-1" role="group" aria-label="Work mode">
              {(['', ...facets.workModes] as Array<WorkMode | ''>).map((m) => (
                <button key={m || 'any'} type="button" onClick={() => vm.update({ workMode: m })} aria-pressed={vm.filters.workMode === m}
                  className={cx('h-11 flex-1 rounded-full px-4 text-sm font-semibold transition-colors sm:flex-none', vm.filters.workMode === m ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg')}>
                  {m ? WORK_MODE_LABEL[m] : 'Any'}
                </button>
              ))}
            </div>
          )}
        </div>
        <ChipRow label="Team" value={vm.filters.department} options={facets.departments.map((d) => ({ value: d, label: d }))} onChange={(v) => vm.update({ department: v })} />
        <ChipRow label="Location" value={vm.filters.location} options={facets.locations.map((d) => ({ value: d, label: d }))} onChange={(v) => vm.update({ location: v })} />
      </section>

      <section aria-live="polite" aria-busy={vm.state === 'loading' || vm.fetching} className="mt-8">
        {vm.state === 'ready' && vm.data && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-fg-muted">
              <span className="font-semibold text-fg">{vm.data.total}</span> {vm.hasFilters ? 'matching' : 'open'} {vm.data.total === 1 ? 'role' : 'roles'}
            </p>
            {vm.hasFilters && (
              <button type="button" onClick={vm.clear} className="inline-flex items-center gap-1 text-sm font-semibold text-fg underline-offset-4 hover:underline">
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear filters
              </button>
            )}
          </div>
        )}

        {vm.state === 'loading' && (
          <ul className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <JobCardSkeleton key={i} />)}
          </ul>
        )}

        {vm.state === 'error' && (
          <div className="flex flex-col items-center rounded-[var(--tt-radius-lg)] border border-line px-6 py-12 text-center">
            <p className="text-base font-semibold text-fg">We could not load jobs</p>
            <p className={cx(text.body, 'mt-1')}>{vm.error}</p>
            <button type="button" onClick={vm.reload} className={cx(button.secondary, 'mt-6 !h-11 !w-auto !px-6')}>Try again</button>
          </div>
        )}

        {vm.state === 'ready' && vm.items.length === 0 && (
          <div className="flex flex-col items-center rounded-[var(--tt-radius-lg)] border border-dashed border-line px-4 py-12 text-center">
            <Image src="/vectors/teams.svg" alt="" width={220} height={160} className="mb-6 h-auto max-h-[150px] w-auto max-w-[220px] object-contain" />
            <h2 className={heading.sm}>{vm.hasFilters ? 'No roles match your search' : 'No open positions right now'}</h2>
            <p className={cx(text.body, 'mt-1 max-w-sm')}>
              {vm.hasFilters ? 'Try a different keyword or clear the filters.' : 'New roles are posted here first. Check back soon.'}
            </p>
            {vm.hasFilters && (
              <button type="button" onClick={vm.clear} className={cx(button.secondary, 'mt-6 !h-11 !w-auto !px-6')}>Clear filters</button>
            )}
          </div>
        )}

        {vm.state === 'ready' && vm.items.length > 0 && (
          <ul className={cx('grid gap-4 md:grid-cols-2 transition-opacity', vm.fetching && 'opacity-60')}>
            {vm.items.map((job) => (
              <JobCard key={job.slug} job={job} href={`/careers/${encodeURIComponent(slug)}/${encodeURIComponent(job.slug)}`} />
            ))}
          </ul>
        )}

        {vm.state === 'ready' && vm.data && vm.data.pages > 1 && (
          <div className="mt-8">
            <Pagination
              currentPage={vm.data.page}
              totalPages={vm.data.pages}
              totalItems={vm.data.total}
              pageSize={vm.data.pageSize}
              onPageChange={(p) => {
                vm.update({ page: p });
                if (typeof window !== 'undefined') document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </section>
    </PublicShell>
  );
}
