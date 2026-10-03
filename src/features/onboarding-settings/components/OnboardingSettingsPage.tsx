'use client';

import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { messageOf } from '@/lib/api/errors';
import { showSuccess, showError } from '@/lib/toast';
import * as api from '../api/onboarding-settings.api';
import type { OnboardingCatalogResponseDto, OnboardingConfigDto } from '../types/onboarding-settings.dto';
import { StepsTab } from './StepsTab';
import { DocumentsTab } from './DocumentsTab';
import { LivePreview } from './LivePreview';

const TABS = [
  { value: 'steps', label: 'Steps & fields' },
  { value: 'documents', label: 'Documents' },
  { value: 'preview', label: 'Preview' },
] as const;

type Tab = (typeof TABS)[number]['value'];

export function OnboardingSettingsPage() {
  const [tab, setTab] = React.useState<Tab>('steps');
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  const [catalog, setCatalog] = React.useState<OnboardingCatalogResponseDto | null>(null);
  const [config, setConfig] = React.useState<OnboardingConfigDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.getCatalog().then(setCatalog).catch((e) => setError(messageOf(e)));
  }, []);

  React.useEffect(() => {
    setLoading(true);
    api
      .getConfig(subOrgId)
      .then((d) => {
        setConfig(d.config);
        setDirty(false);
      })
      .catch((e) => setError(messageOf(e)))
      .finally(() => setLoading(false));
  }, [subOrgId]);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const d = await api.updateConfig(subOrgId, config);
      setConfig(d.config);
      setDirty(false);
      showSuccess('Onboarding settings saved');
    } catch (e) {
      const message = messageOf(e);
      setError(message);
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubOrgChange = (id: number | null) => {
    if (dirty && !window.confirm('You have unsaved changes. Switch sub-organization and discard them?')) {
      return;
    }
    setSubOrgId(id);
  };

  const updateConfig = (patch: Partial<OnboardingConfigDto>) => {
    setConfig((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 2xl:p-4">
        {/* Top row on mobile / Left section on tablet & desktop */}
        <div className="flex items-center justify-between gap-3 lg:justify-start">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Onboarding Settings</h1>
              {dirty && (
                <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 2xl:text-xs">
                  Unsaved changes
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-fg-muted">
              Choose which fields and documents an invited employee fills in.
            </p>
          </div>

          {/* Mobile-only compact Save button */}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || loading || saving}
            className="inline-flex h-8.5 shrink-0 items-center justify-center gap-1 rounded-lg bg-[var(--tt-primary)] px-2.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:hidden"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>{saving ? 'Saving…' : 'Save'}</span>
          </button>
        </div>

        {/* Controls: SegmentedControl Tabs, Sub-organization Filter, Desktop Save button */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5 lg:flex-nowrap">
          <div className="w-full sm:w-auto">
            <SegmentedControl options={TABS} value={tab} onChange={(v) => setTab(v as Tab)} fitText />
          </div>

          <SubOrgFilter value={subOrgId} onChange={handleSubOrgChange} />

          {/* Tablet & Desktop Save button */}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || loading || saving}
            className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex sm:text-sm 2xl:h-10 2xl:px-4 2xl:text-base"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin 2xl:h-4 2xl:w-4" />
            ) : (
              <Check className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
            )}
            <span>{saving ? 'Saving…' : 'Save changes'}</span>
          </button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-[var(--tt-danger)] bg-[var(--tt-danger)]/5 px-3 py-2 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}

      {loading || !config || !catalog ? (
        <div className="h-64 animate-pulse rounded-xl bg-bg-subtle" />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === 'steps' && (
            <StepsTab steps={config.steps} onChange={(steps) => updateConfig({ steps })} fieldTypes={catalog.field_types} />
          )}
          {tab === 'documents' && (
            <DocumentsTab
              documents={config.documents}
              onChange={(documents) => updateConfig({ documents })}
              numberPatterns={catalog.number_patterns}
              acceptTypes={catalog.accept_types}
            />
          )}
          {tab === 'preview' && <LivePreview config={config} />}
        </div>
      )}
    </div>
  );
}
