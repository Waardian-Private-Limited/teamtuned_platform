'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, MapPin, X } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Alert } from '@/components/ui/Alert';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { FieldLabel, FieldMessage, OptionCard } from '@/components/ui/FormControls';
import { cx, text } from '@/theme/tokens';
import {
  MODES_USING_OTHER_LOCATIONS,
  SITE_EDITOR_TAB_FIELDS,
  SITE_EDITOR_TABS,
  type SiteEditorTab,
} from '../../constants/employeeSites.constants';
import type { useEmployeeSiteEditor } from '../../hooks/useEmployeeSiteEditor';

type Editor = ReturnType<typeof useEmployeeSiteEditor>;

interface EmployeeSiteDrawerProps {
  open: boolean;
  editor: Editor;
  canAssign: boolean;
  onClose: () => void;
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted">{title}</h3>
      {hint && <p className={cx(text.caption, 'mt-0.5')}>{hint}</p>}
    </div>
  );
}

function TabBar({
  value,
  onChange,
  counts,
  errors,
}: {
  value: SiteEditorTab;
  onChange: (tab: SiteEditorTab) => void;
  counts: Record<SiteEditorTab, number>;
  errors: Record<SiteEditorTab, boolean>;
}) {
  return (
    <div role="tablist" aria-label="Site assignment sections" className="flex gap-5">
      {SITE_EDITOR_TABS.map((tab) => {
        const selected = value === tab.value;
        return (
          <button
            key={tab.value}
            id={`empsite-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`empsite-panel-${tab.value}`}
            onClick={() => onChange(tab.value)}
            className={cx(
              '-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 pt-1 text-xs font-semibold transition-colors sm:text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]',
              selected ? 'border-fg text-fg' : 'border-transparent text-fg-muted hover:text-fg'
            )}
          >
            {tab.label}
            <span
              className={cx(
                'min-w-[18px] rounded-full border px-1.5 text-center text-[10px] font-bold leading-4 tabular-nums',
                errors[tab.value]
                  ? 'border-[var(--tt-danger)] text-[var(--tt-danger)]'
                  : selected ? 'border-fg bg-fg text-fg-inverted' : 'border-line text-fg-muted'
              )}
            >
              {counts[tab.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function EmployeeSiteDrawer({ open, editor, canAssign, onClose }: EmployeeSiteDrawerProps) {
  const { detail, sites, fieldErrors } = editor;

  const [tab, setTab] = useState<SiteEditorTab>('sites');
  const headerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Every employee opens on the Sites tab.
  const employeeId = detail?.employee.id ?? null;
  useEffect(() => { setTab('sites'); }, [employeeId, open]);

  const tabErrors = useMemo<Record<SiteEditorTab, boolean>>(() => ({
    sites: SITE_EDITOR_TAB_FIELDS.sites.some((f) => fieldErrors[f]),
    other: SITE_EDITOR_TAB_FIELDS.other.some((f) => fieldErrors[f]),
  }), [fieldErrors]);

  // A save error on the hidden tab brings that tab forward so its red
  // border is visible.
  useEffect(() => {
    setTab((current) => {
      if (tabErrors[current]) return current;
      if (tabErrors.sites) return 'sites';
      if (tabErrors.other) return 'other';
      return current;
    });
  }, [tabErrors]);

  // When the sticky header is pinned, bring the new tab's body to the top
  // of the drawer instead of leaving the user mid-scroll.
  useEffect(() => {
    const header = headerRef.current;
    const panel = panelRef.current;
    if (!header || !panel) return;
    if (panel.getBoundingClientRect().top < header.getBoundingClientRect().bottom) {
      panel.scrollIntoView({ block: 'start' });
    }
  }, [tab]);

  const assignedIds = useMemo(() => new Set(sites.map((s) => s.siteId)), [sites]);
  const siteOptions = useMemo<ComboboxOption[]>(
    () => editor.siteOptions
      .filter((o) => !assignedIds.has(o.id))
      .map((o) => ({ value: o.id, label: o.name, description: [o.code, o.city].filter(Boolean).join(' · ') || undefined })),
    [editor.siteOptions, assignedIds]
  );

  const otherLocationsApply = MODES_USING_OTHER_LOCATIONS.has(editor.locationAccess);
  const currentAccessLabel = detail?.locationAccessOptions.find((o) => o.value === editor.locationAccess)?.label;
  const sitesError = fieldErrors.sites || fieldErrors.primary;
  const title = detail ? detail.employee.name : 'Site assignment';

  return (
    <Drawer open={open} onClose={onClose} title={title} maxWidthClassName="sm:max-w-lg">
      {editor.isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-40 rounded bg-bg-subtle" />
          <div className="h-10 rounded-lg bg-bg-subtle" />
          <div className="h-14 rounded-lg bg-bg-subtle/70" />
          <div className="h-14 rounded-lg bg-bg-subtle/70" />
        </div>
      ) : editor.loadError ? (
        <Alert message={editor.loadError} tone="error" />
      ) : !detail ? null : (
        <div className="flex min-h-full flex-col gap-5">
          {/* Employee line + tabs stay pinned while the tab body scrolls. */}
          <div
            ref={headerRef}
            className="sticky top-0 z-10 -mx-4 -mt-4 border-b border-line bg-surface px-4 pt-3 sm:-mx-6 sm:-mt-5 sm:px-6 sm:pt-4"
          >
            <p className={cx(text.caption, 'mb-2 truncate')}>
              {[detail.employee.code, detail.employee.designation || detail.employee.role, detail.employee.department].filter(Boolean).join(' · ') || '—'}
            </p>
            <TabBar
              value={tab}
              onChange={setTab}
              counts={{ sites: sites.length, other: editor.otherLocationIds.length }}
              errors={tabErrors}
            />
          </div>

          <div
            ref={panelRef}
            id={`empsite-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`empsite-tab-${tab}`}
            className="flex scroll-mt-24 flex-col gap-6"
          >
            {tab === 'sites' && (
              <>
                {/* Sites */}
                <section>
                  <SectionTitle title="Sites" hint="The primary site is the employee's home site for budgets and reports." />
                  {canAssign && (
                    <div className="mb-2.5">
                      <Combobox
                        options={siteOptions}
                        value={null}
                        onChange={(value) => {
                          const option = editor.siteOptions.find((o) => o.id === Number(value));
                          if (option) editor.addSite(option);
                        }}
                        onSearch={editor.setSiteTerm}
                        loading={editor.siteOptionsLoading}
                        placeholder="Add a site…"
                        searchPlaceholder="Search sites by name, code or city…"
                        emptyLabel="No more sites"
                        clearable={false}
                        invalid={Boolean(fieldErrors.sites)}
                        disabled={editor.isSaving}
                        ariaLabel="Add a site"
                      />
                    </div>
                  )}

                  {sites.length === 0 ? (
                    <div className={cx('rounded-lg border border-dashed px-3 py-4 text-center text-xs text-fg-muted', sitesError ? 'border-[var(--tt-danger)]' : 'border-line')}>
                      No sites assigned
                    </div>
                  ) : (
                    <ul
                      role="radiogroup"
                      aria-label="Primary site"
                      className={cx('divide-y divide-line/60 rounded-lg border', sitesError ? 'border-[var(--tt-danger)]' : 'border-line')}
                    >
                      {sites.map((site) => (
                        <li key={site.siteId} className="flex items-center gap-3 px-3 py-2.5">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={site.isPrimary}
                            aria-label={`Make ${site.name} the primary site`}
                            disabled={!canAssign || editor.isSaving}
                            onClick={() => editor.setPrimary(site.siteId)}
                            className={cx(
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed',
                              site.isPrimary ? 'border-[var(--tt-primary)]' : 'border-line-strong hover:border-fg'
                            )}
                          >
                            {site.isPrimary && <span className="h-2 w-2 rounded-full bg-[var(--tt-primary)]" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-fg">{site.name}</span>
                              {site.isPrimary && (
                                <span className="rounded border border-line px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Primary</span>
                              )}
                              {site.isIncharge && (
                                <span
                                  title="Managed on Sites"
                                  className="rounded border border-fg bg-fg px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-fg-inverted"
                                >
                                  In-charge
                                </span>
                              )}
                              {site.status && site.status !== 'active' && (
                                <span className="rounded border border-dashed border-line-strong px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
                                  {site.status}
                                </span>
                              )}
                            </div>
                            <div className={cx(text.caption, 'mt-0.5 flex items-center gap-1 truncate')}>
                              <MapPin className="h-3 w-3 shrink-0" />
                              {[site.code, site.city].filter(Boolean).join(' · ') || '—'}
                              {site.isIncharge && <span className="text-fg-subtle"> · In-charge is managed on Sites</span>}
                            </div>
                          </div>
                          {canAssign && (
                            <button
                              type="button"
                              onClick={() => editor.removeSite(site.siteId)}
                              disabled={editor.isSaving}
                              aria-label={`Remove ${site.name}`}
                              className="rounded-[var(--tt-radius-sm)] p-1.5 text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg disabled:opacity-40"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <FieldMessage
                    error={sitesError}
                    hint={sites.some((s) => s.isIncharge) && canAssign ? 'Removing a site also removes in-charge for that site.' : undefined}
                  />
                </section>

                {/* Punch location rule */}
                <section>
                  <FieldLabel label="Where can they punch?" />
                  <div className={cx('grid gap-2 rounded-lg', fieldErrors.locationAccess && 'ring-1 ring-[var(--tt-danger)]')}>
                    {detail.locationAccessOptions.map((o) => (
                      <OptionCard
                        key={o.value}
                        selected={editor.locationAccess === o.value}
                        onClick={() => editor.setLocationAccess(o.value)}
                        title={o.label}
                        description={o.description}
                        disabled={!canAssign || editor.isSaving}
                      />
                    ))}
                  </div>
                  <FieldMessage error={fieldErrors.locationAccess} />
                </section>
              </>
            )}

            {tab === 'other' && (
              <section>
                <SectionTitle
                  title="Other locations"
                  hint="Client sites, homes or field spots this employee may also punch at."
                />
                {!otherLocationsApply && (
                  <p className="mb-2.5 rounded-lg border border-dashed border-line-strong px-3 py-2 text-xs text-fg-muted">
                    The current punch rule{currentAccessLabel ? ` (${currentAccessLabel})` : ''} doesn&apos;t use other locations.
                    Picks here are kept and apply only if the rule on the Sites tab allows other locations.
                  </p>
                )}
                {editor.otherLocationChoices.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-fg-muted">
                    No other locations set up for the organization
                  </div>
                ) : (
                  <ul className={cx('divide-y divide-line/60 rounded-lg border', fieldErrors.otherLocations ? 'border-[var(--tt-danger)]' : 'border-line')}>
                    {editor.otherLocationChoices.map((loc) => {
                      const checked = editor.otherLocationIds.includes(loc.id);
                      return (
                        <li key={loc.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            disabled={!canAssign || editor.isSaving}
                            onClick={() => editor.toggleOtherLocation(loc.id)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <span
                              className={cx(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                                checked ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line-strong'
                              )}
                            >
                              {checked && <Check className="h-3 w-3" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-fg">{loc.name}</span>
                              {(loc.type || loc.address) && (
                                <span className={cx(text.caption, 'block truncate')}>{[loc.type, loc.address].filter(Boolean).join(' · ')}</span>
                              )}
                            </span>
                            {loc.status && loc.status !== 'active' && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">{loc.status}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <FieldMessage error={fieldErrors.otherLocations} />
              </section>
            )}
          </div>

          {canAssign && (
            <div className="sticky bottom-0 -mx-4 -mb-4 mt-auto sm:-mb-5 flex justify-end gap-2 border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={editor.save}
                disabled={!editor.isDirty || editor.isSaving}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
              >
                {editor.isSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
