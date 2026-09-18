'use client';

import { useMemo } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { text } from '@/theme/tokens';
import type { Site, SiteIncharge, SiteInchargeCandidate } from '../../types/sites.model';

interface SiteInchargesDrawerProps {
  open: boolean;
  site: Site | null;
  incharges: SiteIncharge[];
  candidates: SiteInchargeCandidate[];
  isLoading: boolean;
  candidatesLoading: boolean;
  isSaving: boolean;
  onSearch: (term: string) => void;
  onAssign: (employeeId: number) => void;
  onRemove: (employeeId: number) => void;
  onClose: () => void;
}

export function SiteInchargesDrawer({
  open,
  site,
  incharges,
  candidates,
  isLoading,
  candidatesLoading,
  isSaving,
  onSearch,
  onAssign,
  onRemove,
  onClose,
}: SiteInchargesDrawerProps) {
  // Only offer candidates who aren't already incharges for this site
  const inchargeIds = useMemo(() => new Set(incharges.map((i) => i.id)), [incharges]);
  const options = useMemo<ComboboxOption[]>(
    () =>
      candidates
        .filter((c) => !inchargeIds.has(c.id))
        .map((c) => ({
          value: c.id,
          label: c.name,
          description: [c.designation, c.departmentName].filter(Boolean).join(' · ') || undefined,
        })),
    [candidates, inchargeIds]
  );

  return (
    <Drawer open={open} onClose={onClose} title={site ? `Site Incharges — ${site.name}` : 'Site Incharges'}>
      {isLoading || !site ? (
        <p className={text.body}>Loading…</p>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">
              Assign a site incharge
            </label>
            <Combobox
              options={options}
              value={null}
              onChange={(value) => value !== null && onAssign(Number(value))}
              placeholder="Search active employees…"
              searchPlaceholder="Search active employees…"
              disabled={isSaving}
              loading={candidatesLoading}
              onSearch={onSearch}
              clearable={false}
            />
          </div>

          <div className="border-t border-line pt-4">
            <div className="flex items-center justify-between">
              <p className={text.overline}>Current Incharges ({incharges.length})</p>
              {site.isHeadOffice && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tt-primary)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--tt-primary)]">
                  <ShieldCheck className="h-3 w-3" />
                  Head Office
                </span>
              )}
            </div>

            {incharges.length === 0 ? (
              <p className="mt-2 text-sm text-fg-muted">No incharges assigned to this site yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line/60 rounded-lg border border-line">
                {incharges.map((incharge) => (
                  <li key={incharge.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">{incharge.name}</span>
                      <span className="block truncate text-xs text-fg-muted">
                        {[incharge.email, incharge.phoneNumber].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => onRemove(incharge.id)}
                      aria-label={`Remove ${incharge.name} as incharge`}
                      className="shrink-0 rounded-[var(--tt-radius-sm)] p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
