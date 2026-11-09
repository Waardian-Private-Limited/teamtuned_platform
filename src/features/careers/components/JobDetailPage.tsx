'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Briefcase, Clock, MapPin } from 'lucide-react';
import { button, cx, heading, text } from '@/theme/tokens';
import { useJobDetail } from '../hooks/useJobDetail';
import type { JobDetail } from '../types/careers.types';
import { WORK_MODE_LABEL, formatDateOnly, formatExperience, formatSalary, postedAgo } from '../utils/format';
import { ApplyForm } from './ApplyForm';
import { Markdown } from './Markdown';
import { PublicShell, StatusScreen } from './PublicShell';

function KeyFacts({ job }: { job: JobDetail }) {
  const facts: Array<[string, string | null]> = [
    ['Department', job.department],
    ['Location', job.location],
    ['Work mode', job.workMode ? WORK_MODE_LABEL[job.workMode] : null],
    ['Employment type', job.employmentType],
    ['Experience', formatExperience(job.experience)],
    ['Salary', formatSalary(job.salary)],
    ['Posted', postedAgo(job.postedAt)?.replace(/^Posted /, '') ?? null],
    ['Apply by', formatDateOnly(job.closesOn)],
  ];
  const shown = facts.filter(([, v]) => v);
  return (
    <div className="rounded-[var(--tt-radius-lg)] border border-line p-5 sm:p-6">
      <h2 className={text.overline}>Key facts</h2>
      <dl className="mt-4 divide-y divide-line">
        {shown.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <dt className="text-sm text-fg-muted">{label}</dt>
            <dd className="text-right text-sm font-medium text-fg">{value}</dd>
          </div>
        ))}
      </dl>
      <a href="#apply" className={cx(button.primary, 'mt-6 !h-12')}>Apply now</a>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="h-4 w-20 rounded bg-bg-subtle" />
      <div className="mt-6 h-10 w-3/4 max-w-lg rounded bg-bg-subtle" />
      <div className="mt-4 flex gap-4">
        <div className="h-4 w-24 rounded bg-bg-subtle" />
        <div className="h-4 w-24 rounded bg-bg-subtle" />
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-4 rounded bg-bg-subtle" style={{ width: `${90 - i * 8}%` }} />)}
        </div>
        <div className="h-64 rounded-[var(--tt-radius-lg)] bg-bg-subtle" />
      </div>
    </div>
  );
}

/** On phones, an Apply bar stays at the bottom until the form itself is on screen. */
function useApplyInView(ready: boolean) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = document.getElementById('apply');
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting || e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [ready]);
  return inView;
}

export function JobDetailPage({ slug, jobSlug }: { slug: string; jobSlug: string }) {
  const { job, company, state, error, reload } = useJobDetail(slug, jobSlug);
  const applyInView = useApplyInView(state === 'ready');
  const boardHref = `/careers/${encodeURIComponent(slug)}`;

  if (state === 'not_found') {
    return (
      <PublicShell company={company} homeHref={company ? boardHref : undefined}>
        <StatusScreen
          illustration="review"
          title="This job is no longer available"
          description="The position may have been filled or closed, or the careers page is not public right now."
          action={company ? <Link href={boardHref} className={button.secondary}>See open positions</Link> : undefined}
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell company={company} homeHref={boardHref} share={job ? { title: job.title, subtitle: [job.department, job.location].filter(Boolean).join(' · ') } : undefined}>
      {state === 'loading' && <DetailSkeleton />}

      {state === 'error' && (
        <StatusScreen
          title="We could not load this job"
          description={error}
          action={<button type="button" onClick={reload} className={button.secondary}>Try again</button>}
        />
      )}

      {state === 'ready' && job && (
        <article>
          <Link href={boardHref} className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All jobs
          </Link>

          <header className="relative mt-6 overflow-hidden rounded-[var(--tt-radius-lg)] bg-[var(--tt-primary)] px-5 py-8 text-[var(--tt-on-primary)] sm:px-8 sm:py-10">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="relative">
              {job.department && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">{job.department}</p>}
              <h1 className="mt-2 break-words text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">{job.title}</h1>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  job.location ? { icon: MapPin, label: `${job.location}${job.workMode ? ` · ${WORK_MODE_LABEL[job.workMode]}` : ''}` } : null,
                  job.employmentType ? { icon: Briefcase, label: job.employmentType } : null,
                  formatExperience(job.experience) ? { icon: Clock, label: formatExperience(job.experience) as string } : null,
                ].filter((x): x is { icon: typeof MapPin; label: string } => Boolean(x)).map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--tt-on-primary)]/10 px-3 py-1.5 text-sm font-medium">
                    <Icon className="h-4 w-4 opacity-70" aria-hidden="true" />{label}
                  </span>
                ))}
              </div>
              <a href="#apply" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-[var(--tt-on-primary)] px-6 text-sm font-bold text-[var(--tt-primary)] transition-transform hover:-translate-y-0.5">
                Apply for this role <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
            <div className="min-w-0">
              {job.description ? (
                <Markdown source={job.description} />
              ) : (
                <p className={text.lead}>No description has been added for this role yet.</p>
              )}

              {job.skills.length > 0 && (
                <section className="mt-10" aria-labelledby="skills-heading">
                  <h2 id="skills-heading" className={heading.sm}>Skills</h2>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {job.skills.map((s) => (
                      <li key={s} className="rounded-full bg-bg-subtle px-3 py-1.5 text-sm font-medium text-fg">{s}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Facts inline on small screens; sidebar on desktop. */}
              <div className="mt-10 lg:hidden">
                <KeyFacts job={job} />
              </div>

              <section id="apply" className="mt-14 scroll-mt-24 border-t border-line pt-10">
                <ApplyForm slug={slug} jobSlug={jobSlug} jobTitle={job.title} companyName={company?.name ?? ''} form={job.form} />
              </section>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <KeyFacts job={job} />
              </div>
            </aside>
          </div>

          <div className={cx(
            'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-200 lg:hidden',
            applyInView ? 'translate-y-full' : 'translate-y-0'
          )}>
            <a href="#apply" className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--tt-primary)] text-sm font-bold text-[var(--tt-on-primary)]">
              Apply for this role <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </article>
      )}
    </PublicShell>
  );
}
