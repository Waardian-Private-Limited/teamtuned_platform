'use client';

import React from 'react';
import { Check, Search, Star } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { FormOptionsDto } from '../../types/employees.dto';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';

type SiteOption = FormOptionsDto['sites'][number];

export function SitePicker({ sites, siteIds, primarySiteId, onChange, error }: {
  sites: SiteOption[];
  siteIds: number[];
  primarySiteId: number | null;
  onChange: (siteIds: number[], primarySiteId: number | null) => void;
  error?: string;
}) {
  const [term, setTerm] = React.useState('');
  const filtered = React.useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return sites;
    return sites.filter((s) => [s.name, s.code, s.city, s.state].some((v) => v && v.toLowerCase().includes(t)));
  }, [sites, term]);

  const toggle = (id: number) => {
    if (siteIds.includes(id)) {
      const nextIds = siteIds.filter((x) => x !== id);
      onChange(nextIds, primarySiteId === id ? nextIds[0] ?? null : primarySiteId);
    } else {
      onChange([...siteIds, id], primarySiteId ?? id);
    }
  };

  const makePrimary = (id: number) => {
    onChange(siteIds.includes(id) ? siteIds : [...siteIds, id], id);
  };

  return (
    <div>
      <FieldLabel
        label="Sites"
        required
        aside={<span className="mb-1.5 text-[11px] text-fg-muted">{siteIds.length} selected</span>}
      />
      <div className={cx('overflow-hidden rounded-lg border', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
        {sites.length > 6 && (
          <div className="flex items-center gap-2 border-b border-line bg-bg-subtle/50 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search sites"
              className="w-full bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle sm:text-sm"
            />
          </div>
        )}
        <ul className="max-h-60 divide-y divide-line/60 overflow-y-auto tt-scroll-hidden">
          {filtered.length === 0 && <li className="px-3 py-3 text-xs text-fg-muted">No sites available for this sub-organization</li>}
          {filtered.map((site) => {
            const checked = siteIds.includes(site.id);
            const primary = primarySiteId === site.id;
            return (
              <li key={site.id} className="flex items-center gap-3 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggle(site.id)}
                  aria-pressed={checked}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', checked ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line-strong')}>
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-fg sm:text-sm">
                      {site.name}
                      {site.is_head_office ? <span className="ml-1.5 text-[10px] font-semibold uppercase text-fg-muted">HQ</span> : null}
                    </span>
                    <span className="block truncate text-[11px] text-fg-muted">{[site.code, site.city, site.state].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => makePrimary(site.id)}
                  className={cx(
                    'inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors',
                    primary ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line text-fg-muted hover:bg-bg-subtle hover:text-fg'
                  )}
                >
                  <Star className="h-3 w-3" />
                  {primary ? 'Primary' : 'Set primary'}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <FieldMessage error={error} hint="Primary site decides the default location, state rules (PT, LWF) and site budget." />
    </div>
  );
}
