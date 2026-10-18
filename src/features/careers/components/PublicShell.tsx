'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { cx, heading, text } from '@/theme/tokens';
import type { CareersCompany } from '../types/careers.types';

/** Company logo, falling back to a monochrome initial tile when there is none or it fails to load. */
export function CompanyMark({ company, size = 40 }: { company: Pick<CareersCompany, 'name' | 'logoUrl'>; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initial = (company.name || '?').trim().charAt(0).toUpperCase();
  if (company.logoUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- org logos live on arbitrary storage hosts
      <img
        src={company.logoUrl}
        alt={company.name ? `${company.name} logo` : 'Company logo'}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-[var(--tt-radius-sm)] border border-line bg-surface object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-[var(--tt-radius-sm)] bg-[var(--tt-primary)] font-bold text-[var(--tt-on-primary)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </span>
  );
}

interface PublicShellProps {
  company?: Pick<CareersCompany, 'name' | 'logoUrl'> | null;
  /** Where the company name in the top bar links to (the board), if anywhere. */
  homeHref?: string;
  children: React.ReactNode;
  /** Narrow column for token pages (test, offer); wide for the board. */
  width?: 'narrow' | 'wide';
}

export function PublicShell({ company, homeHref, children, width = 'wide' }: PublicShellProps) {
  const container = width === 'narrow' ? 'max-w-3xl' : 'max-w-6xl';
  const brand = company?.name ? (
    <span className="flex min-w-0 items-center gap-3">
      <CompanyMark company={company} size={32} />
      <span className="truncate text-[15px] font-semibold text-fg">{company.name}</span>
    </span>
  ) : (
    <span className="h-8" />
  );

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
        <div className={cx('mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6', container)}>
          {homeHref && company?.name ? (
            <Link href={homeHref} className="min-w-0 rounded-[var(--tt-radius-sm)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)]">
              {brand}
            </Link>
          ) : (
            brand
          )}
          {homeHref && (
            <Link href={homeHref} className="shrink-0 text-sm font-semibold text-fg underline-offset-4 hover:underline">
              All jobs
            </Link>
          )}
        </div>
      </header>
      <main className={cx('mx-auto w-full flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12', container)}>{children}</main>
      <footer className="border-t border-line">
        <div className={cx('mx-auto flex items-center justify-center gap-2 px-4 py-6 sm:px-6', container)}>
          <span className={text.caption}>Powered by</span>
          <span className="text-xs font-semibold tracking-tight text-fg">TeamTuned</span>
        </div>
      </footer>
    </div>
  );
}

interface StatusScreenProps {
  illustration?: 'teams' | 'review';
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

/** Full-width centred message used for not-found, expired, done states. */
export function StatusScreen({ illustration = 'review', title, description, action }: StatusScreenProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center sm:py-16">
      <Image
        src={`/vectors/${illustration}.svg`}
        alt=""
        width={220}
        height={160}
        className="mb-8 h-auto max-h-[160px] w-auto max-w-[220px] object-contain"
        priority
      />
      <h1 className={heading.md}>{title}</h1>
      {description && <div className={cx(text.lead, 'mt-3')}>{description}</div>}
      {action && <div className="mt-8 w-full max-w-xs">{action}</div>}
    </div>
  );
}
