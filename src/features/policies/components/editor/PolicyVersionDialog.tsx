'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { usePolicySchema } from '../../hooks/usePolicySchema';
import { POLICY_SECTIONS, type PolicySectionKey } from '../../constants/policies.constants';
import type { PolicyVersion } from '../../types/policies.model';
import { ConfigSummary, formatValue } from './form/ConfigSummary';
import { diffConfig } from './form/schemaDefaults';

interface PolicyVersionDialogProps {
  open: boolean;
  version: PolicyVersion | null;
  compareTo: PolicyVersion | null;
  onClose: () => void;
}

const SECTION_TAB_OPTIONS = POLICY_SECTIONS.map((s) => ({ value: s.value, label: s.label }));

/**
 * What a version actually contains, read-only — the missing half of version
 * history, which otherwise only let an admin roll back to a version they
 * could not inspect. When a live version exists to compare against, the
 * differences are listed first so "what changed in v4" is one glance.
 */
export function PolicyVersionDialog({ open, version, compareTo, onClose }: PolicyVersionDialogProps) {
  const { schema } = usePolicySchema();
  const [tab, setTab] = React.useState<PolicySectionKey>('workRules');

  React.useEffect(() => {
    if (open) setTab('workRules');
  }, [open]);

  const changes = React.useMemo(() => {
    if (!version || !compareTo || compareTo.id === version.id) return null;
    return POLICY_SECTIONS.flatMap((section) =>
      diffConfig(compareTo.config?.[section.value], version.config?.[section.value], [section.label])
    );
  }, [version, compareTo]);

  return (
    <Dialog
      open={open && Boolean(version)}
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
      title={
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-fg sm:text-base">Version {version ? `v${version.versionNo}` : ''}</h2>
          <p className="mt-0.5 truncate text-[11px] text-fg-muted sm:text-xs">
            {version?.status} · effective {version?.effectiveFrom} · {version?.changeNote || 'No change note'}
          </p>
        </div>
      }
      footer={
        <button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm">
          Close
        </button>
      }
    >
      {!version ? null : !schema ? (
        <p className="text-sm text-fg-muted">Loading policy fields…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {changes && (
            <div className="rounded-lg border border-line p-3">
              <div className="mb-2 text-xs font-semibold text-fg sm:text-[13px]">
                Differences from live v{compareTo?.versionNo} <span className="font-normal text-fg-subtle">({changes.length})</span>
              </div>
              {changes.length === 0 ? (
                <p className="text-[11px] text-fg-muted sm:text-xs">Identical to the live version.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto tt-scroll-hidden">
                  {changes.map((change) => (
                    <div key={change.path.join('.')} className="flex items-baseline justify-between gap-3 border-b border-line/50 py-1.5 last:border-b-0">
                      <span className="min-w-0 truncate text-[11px] text-fg-muted sm:text-xs">{change.label}</span>
                      <span className="shrink-0 text-right text-[11px] sm:text-xs">
                        <span className="text-fg-subtle line-through">{formatValue(change.from)}</span>{' '}
                        <span className="font-semibold text-fg">{formatValue(change.to)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <SegmentedControl options={SECTION_TAB_OPTIONS} value={tab} onChange={setTab} />
          <ConfigSummary schema={schema[tab]} config={version.config?.[tab]} />
        </div>
      )}
    </Dialog>
  );
}
