'use client';

import Image from 'next/image';
import { Search, X } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { button, cx, heading, text } from '@/theme/tokens';
import { useHostedJobs } from '../hooks/useHostedJobs';
import type { WorkMode } from '../types/careers.types';
import { WORK_MODE_LABEL } from '../utils/format';
import { JobCard, JobCardSkeleton } from './JobCard';
import { CompanyMark, PublicShell, StatusScreen } from './PublicShell';

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          'h-12 w-full appearance-none rounded-[var(--tt-radius-control)] border bg-surface pl-4 pr-10 text-[15px] text-fg outline-none transition-colors',
          'focus:border-[var(--tt-primary)] focus:ring-4 focus:ring-[var(--tt-ring)]',
          value ? 'border-[var(--tt-primary)] font-medium' : 'border-line hover:border-line-strong'
        )}
      >
        <option value="">{`All ${label.toLowerCase()}s`}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
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
  const showFilters = facets.departments.length > 1 || facets.locations.length > 1 || facets.workModes.length > 1 || vm.hasFilters;

  return (
    <PublicShell company={company}>
      {/* Company header */}
      <section className="border-b border-line pb-10 sm:pb-12">
        {vm.state === 'loading' && !company ? (
          <div className="animate-pulse" aria-hidden="true">
            <div className="h-14 w-14 rounded-[var(--tt-radius-md)] bg-bg-subtle" />
            <div className="mt-6 h-9 w-2/3 max-w-md rounded bg-bg-subtle" />
            <div className="mt-4 h-4 w-full max-w-xl rounded bg-bg-subtle" />
          </div>
        ) : (
          <div className="max-w-3xl">
            {company && <CompanyMark company={company} size={56} />}
            <p className={cx(text.overline, 'mt-6')}>Careers</p>
            <h1 className={cx(heading.xl, 'mt-2')}>
              {company?.name ? `Work at ${company.name}` : 'Open positions'}
            </h1>
            {company?.intro && (
              <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-fg-muted sm:text-lg">{company.intro}</p>
            )}
          </div>
        )}
      </section>

      {/* Search + filters */}
      <section aria-label="Search jobs" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <label className="relative block sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search jobs</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={vm.searchInput}
            onChange={(e) => vm.setSearchInput(e.target.value)}
            placeholder="Search by title or skill"
            className="h-12 w-full rounded-[var(--tt-radius-control)] border border-line bg-surface pl-11 pr-4 text-base text-fg outline-none transition-colors placeholder:text-fg-subtle hover:border-line-strong focus:border-[var(--tt-primary)] focus:ring-4 focus:ring-[var(--tt-ring)]"
          />
        </label>
        {showFilters && (
          <>
            <FilterSelect
              label="Department"
              value={vm.filters.department}
              onChange={(v) => vm.update({ department: v })}
              options={facets.departments.map((d) => ({ value: d, label: d }))}
            />
            <FilterSelect
              label="Location"
              value={vm.filters.location}
              onChange={(v) => vm.update({ location: v })}
              options={facets.locations.map((d) => ({ value: d, label: d }))}
            />
            <FilterSelect
              label="Work mode"
              value={vm.filters.workMode}
              onChange={(v) => vm.update({ workMode: v as WorkMode | '' })}
              options={(facets.workModes.length ? facets.workModes : (['onsite', 'hybrid', 'remote'] as WorkMode[])).map((m) => ({ value: m, label: WORK_MODE_LABEL[m] }))}
            />
          </>
        )}
      </section>

      {/* Results */}
      <section aria-live="polite" aria-busy={vm.state === 'loading' || vm.fetching} className="mt-8">
        {vm.state === 'ready' && vm.data && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-fg-muted">
              <span className="font-semibold text-fg">{vm.data.total}</span> open {vm.data.total === 1 ? 'position' : 'positions'}
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
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <Image src="/vectors/teams.svg" alt="" width={220} height={160} className="mb-6 h-auto max-h-[150px] w-auto max-w-[220px] object-contain" />
            <h2 className={heading.sm}>{vm.hasFilters ? 'No jobs match your search' : 'No open positions right now'}</h2>
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
                if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </section>
    </PublicShell>
  );
}
