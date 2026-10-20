'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { useTaxWindows, type WindowDates } from '../../hooks/useTaxWindows';
import { TdsCard } from './TdsCard';
import { errorInputClass, fieldErrorClass, inputClass, labelClass, primaryButton } from './fields';

const FIELDS: Array<{ key: keyof WindowDates; label: string }> = [
  { key: 'declarationOpensOn', label: 'Declarations open' },
  { key: 'declarationClosesOn', label: 'Declarations close' },
  { key: 'proofOpensOn', label: 'Proof upload opens' },
  { key: 'proofClosesOn', label: 'Proof upload closes' },
];

export function TaxWindowsCard({ canEdit }: { canEdit: boolean }) {
  const w = useTaxWindows();
  return (
    <TdsCard
      title="Declaration windows"
      intent="When employees can change their tax declaration and upload proofs on their own Income tax page."
    >
      {w.isLoading ? (
        <div className="h-24 animate-pulse rounded-lg bg-bg-subtle" />
      ) : (
        <form
          noValidate
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            w.save();
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className={labelClass}>{f.label}</label>
                <input
                  type="date"
                  value={w.dates[f.key]}
                  onChange={(e) => w.change(f.key, e.target.value)}
                  disabled={!canEdit}
                  className={w.fieldErrors[f.key] ? errorInputClass : inputClass}
                />
                {w.fieldErrors[f.key] && <p className={fieldErrorClass}>{w.fieldErrors[f.key]}</p>}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-fg-muted">Leave empty to keep it always open.</p>
          {w.error && <p className={fieldErrorClass}>{w.error}</p>}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={w.isSaving} className={primaryButton}>
                {w.isSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                <span>Save dates</span>
              </button>
              {w.saved && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-fg">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>
          )}
        </form>
      )}
    </TdsCard>
  );
}
