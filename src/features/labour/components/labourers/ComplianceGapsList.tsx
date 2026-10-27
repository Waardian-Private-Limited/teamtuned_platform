'use client';

import React from 'react';
import type { ComplianceGaps } from '../../types/labour.types';

const clientOf = (g: ComplianceGaps) => g.pack.clientLabel || g.pack.name;

/** "VTP Realty forms need 4 more details" and the missing fields grouped by section. */
export function ComplianceGapsList({ gaps, action }: { gaps: ComplianceGaps; action?: React.ReactNode }) {
  const sections = new Map<string, string[]>();
  for (const m of gaps.missing) sections.set(m.section || 'Other', [...(sections.get(m.section || 'Other') || []), m.label]);
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-fg">{clientOf(gaps)} forms need {gaps.missing.length} more {gaps.missing.length === 1 ? 'detail' : 'details'}</p>
          <p className="mt-0.5 text-xs text-fg-muted">Everything already filled is kept. These print blank until filled.</p>
        </div>
        {action}
      </div>
      <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
        {[...sections].map(([title, labels]) => (
          <div key={title}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-fg-muted">{title}</p>
            <p className="text-xs text-fg">{labels.join(' · ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
