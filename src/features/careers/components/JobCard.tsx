import Link from 'next/link';
import { ArrowUpRight, Briefcase, Clock, MapPin } from 'lucide-react';
import type { PublicJob } from '../types/careers.types';
import { WORK_MODE_LABEL, formatExperience, formatSalary, postedAgo } from '../utils/format';

export function JobMeta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-fg-muted">
      <span className="shrink-0 text-fg-subtle" aria-hidden="true">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line px-2.5 py-1 text-xs font-medium text-fg">
      {children}
    </span>
  );
}

export function JobCard({ job, href }: { job: PublicJob; href: string }) {
  const experience = formatExperience(job.experience);
  const salary = formatSalary(job.salary);
  const posted = postedAgo(job.postedAt);

  return (
    <li>
      <Link
        href={href}
        className="group relative block rounded-[var(--tt-radius-lg)] border border-line bg-surface p-5 transition-all duration-150 hover:border-fg/30 hover:shadow-[var(--tt-shadow-md)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {job.department && (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">{job.department}</p>
            )}
            <h3 className="text-lg font-semibold leading-snug tracking-tight text-fg">{job.title}</h3>
          </div>
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-fg transition-colors group-hover:border-[var(--tt-primary)] group-hover:bg-[var(--tt-primary)] group-hover:text-[var(--tt-on-primary)]"
          >
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {job.location && <JobMeta icon={<MapPin className="h-4 w-4" />}>{job.location}</JobMeta>}
          {job.employmentType && <JobMeta icon={<Briefcase className="h-4 w-4" />}>{job.employmentType}</JobMeta>}
          {experience && <JobMeta icon={<Clock className="h-4 w-4" />}>{experience}</JobMeta>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {job.workMode && <Tag>{WORK_MODE_LABEL[job.workMode]}</Tag>}
          {salary && <Tag>{salary}</Tag>}
          {posted && <span className="ml-auto text-xs text-fg-subtle">{posted}</span>}
        </div>
      </Link>
    </li>
  );
}

export function JobCardSkeleton() {
  return (
    <li className="animate-pulse rounded-[var(--tt-radius-lg)] border border-line p-5 sm:p-6" aria-hidden="true">
      <div className="h-3 w-24 rounded bg-bg-subtle" />
      <div className="mt-3 h-5 w-2/3 rounded bg-bg-subtle" />
      <div className="mt-5 flex gap-4">
        <div className="h-4 w-24 rounded bg-bg-subtle" />
        <div className="h-4 w-20 rounded bg-bg-subtle" />
      </div>
      <div className="mt-4 h-6 w-28 rounded-full bg-bg-subtle" />
    </li>
  );
}
