'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { StatusPill } from '@/components/ui/StatusPill';
import type { useTdsAdmin } from '../../hooks/useTdsAdmin';
import type { TdsReadinessDto } from '../../types/payroll-setup.dto';
import type { TdsSettings } from '../../types/payroll-setup.model';
import { FY_MONTHS } from '../../constants/payroll-setup.constants';
import { validateTdsSettings } from '../../utils/validators';
import { EMPTY_SETTINGS, FULL_MONTH_NAMES, IDENTITY_TARGETS } from './tdsShared';
import { errorInputClass, fieldErrorClass, inputClass, labelClass, primaryButton } from './fields';

/** Employer TAN, PAN and signatory per company, plus the proof cutoff month (old TDS step 1). */
export function EmployerIdentitySection({
  tds,
  readiness,
  canEdit,
  onSaved,
}: {
  tds: ReturnType<typeof useTdsAdmin>;
  readiness: TdsReadinessDto | null;
  canEdit: boolean;
  /** Saving changes the readiness of the other steps. */
  onSaved: () => void;
}) {
  const [localSettingsErrors, setSettingsErrors] = React.useState<Record<string, string>>({});
  // Client checks first; a value the server rejects is marked on the same input.
  const settingsErrors = { ...tds.settingsFieldErrors, ...localSettingsErrors };

  // The employer may not have saved settings yet, and the load can fail. Either way the
  // form stays editable instead of silently swallowing every keystroke.
  const settings = tds.settings ?? EMPTY_SETTINGS;
  const patchSettings = (patch: Partial<TdsSettings>) =>
    tds.setSettings((prev) => ({ ...(prev ?? EMPTY_SETTINGS), ...patch }));

  const submitSettings = async () => {
    const errors = validateTdsSettings(settings);
    setSettingsErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const ok = await tds.saveSettings({
      ...settings,
      employerTan: settings.employerTan.trim().toUpperCase(),
      employerPan: settings.employerPan.trim().toUpperCase(),
    });
    // Completing a step changes the badges on the others.
    if (ok) onSaved();
  };

  const entities = readiness?.employerIdentity.entities ?? [];
  const selectedEntity = entities.find((entity) => entity.subOrganizationId === tds.subOrganizationId);
  const editingLabel = selectedEntity ? selectedEntity.name : 'the organization default';
  const orgDefaultIdentity = {
    complete: (readiness?.employerIdentity.missing.length ?? 1) === 0,
    employerTan: tds.subOrganizationId === 0 ? settings.employerTan || null : null,
  };

  return (
    <>
      {entities.length > 0 ? (
        <div className="mb-3.5">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              Deducting entity
            </span>
            <span className="text-[11px] text-fg-muted">
              {entities.length - (readiness?.employerIdentity.incompleteCount ?? 0)} of {entities.length} set
            </span>
          </div>

          <div className="space-y-1.5">
            {IDENTITY_TARGETS(entities, orgDefaultIdentity).map((target) => {
              const isSelected = tds.subOrganizationId === target.id;
              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => tds.setSubOrganizationId(target.id)}
                  className={cx(
                    'flex w-full items-center justify-between gap-2 rounded-lg border p-2.5 text-left transition-all',
                    isSelected
                      ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                      : 'border-line bg-surface hover:bg-bg-subtle'
                  )}
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-fg">{target.name}</span>
                      {target.isPrimary && (
                        <span className="rounded-full bg-[var(--tt-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--tt-primary)]">
                          Primary
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] tabular-nums text-fg-muted">
                      {target.employerTan ? `TAN ${target.employerTan}` : 'No TAN set'}
                    </span>
                  </span>
                  <StatusPill label={target.complete ? 'Set' : 'Missing'} tone={target.complete ? 'active' : 'inactive'} />
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
            Each sub-organization deducts under its own TAN, so each keeps its own details here. An employee assigned
            to an entity with nothing set falls back to the organization default.
          </p>
        </div>
      ) : (
        <div className="mb-3.5 rounded-lg border border-line bg-bg-subtle/50 p-3">
          <p className="text-[11px] leading-relaxed text-fg-muted">
            These details apply to the whole organization. If you operate more than one legal entity, each with its
            own TAN and PAN, add them under <span className="font-semibold text-fg">Sub Organizations</span> and this
            step will let you set the TDS identity for each one separately.
          </p>
        </div>
      )}

      {entities.length > 0 && (
        <p className="mb-2 text-xs font-semibold text-fg">
          Editing <span className="text-[var(--tt-primary)]">{editingLabel}</span>
        </p>
      )}

      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        noValidate
        onSubmit={(e) => { e.preventDefault(); submitSettings(); }}
      >
        <div>
          <label className={labelClass}>
            Employer TAN <span className="text-[var(--tt-danger)]">*</span>
          </label>
          <input
            value={settings.employerTan}
            onChange={(e) => patchSettings({ employerTan: e.target.value.toUpperCase() })}
            placeholder="MUMT12345E"
            maxLength={10}
            className={settingsErrors.employerTan ? errorInputClass : inputClass}
          />
          {settingsErrors.employerTan
            ? <p className={fieldErrorClass}>{settingsErrors.employerTan}</p>
            : <p className="mt-1 text-[11px] text-fg-muted">4 letters, 5 digits, 1 letter.</p>}
        </div>
        <div>
          <label className={labelClass}>Employer PAN</label>
          <input
            value={settings.employerPan}
            onChange={(e) => patchSettings({ employerPan: e.target.value.toUpperCase() })}
            placeholder="AAACA1234Z"
            maxLength={10}
            className={settingsErrors.employerPan ? errorInputClass : inputClass}
          />
          {settingsErrors.employerPan && <p className={fieldErrorClass}>{settingsErrors.employerPan}</p>}
        </div>
        <div>
          <label className={labelClass}>
            Signatory name <span className="text-[var(--tt-danger)]">*</span>
          </label>
          <input
            value={settings.signatoryName}
            onChange={(e) => patchSettings({ signatoryName: e.target.value })}
            placeholder="Authorized signatory"
            maxLength={150}
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-fg-muted">The person who certifies the Form 16.</p>
        </div>
        <div>
          <label className={labelClass}>Designation</label>
          <input
            value={settings.signatoryDesignation}
            onChange={(e) => patchSettings({ signatoryDesignation: e.target.value })}
            placeholder="Finance Manager"
            maxLength={100}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Place</label>
          <input
            value={settings.place}
            onChange={(e) => patchSettings({ place: e.target.value })}
            placeholder="Mumbai"
            maxLength={100}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Use verified proofs only from</label>
          <select
            value={settings.proofCutoffMonth ?? ''}
            onChange={(e) => {
              setSettingsErrors((prev) => ({ ...prev, proofCutoffMonth: '' }));
              patchSettings({ proofCutoffMonth: e.target.value ? Number(e.target.value) : null });
            }}
            className={settingsErrors.proofCutoffMonth ? errorInputClass : inputClass}
          >
            <option value="">Never (always use declarations)</option>
            {FY_MONTHS.map((m) => (
              <option key={m} value={m}>{FULL_MONTH_NAMES[m - 1]}</option>
            ))}
          </select>
          {settingsErrors.proofCutoffMonth ? (
            <p className={fieldErrorClass}>{settingsErrors.proofCutoffMonth}</p>
          ) : (
            <p className="mt-1 text-[11px] text-fg-muted">
              From this month, TDS ignores declarations that HR has not verified.
            </p>
          )}
        </div>
        {canEdit && (
          <div className="sm:col-span-2">
            <button type="submit" disabled={tds.isSaving} className={primaryButton}>
              {tds.isSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              <span>{entities.length > 0 ? `Save details for ${editingLabel}` : 'Save employer details'}</span>
            </button>
          </div>
        )}
      </form>
    </>
  );
}
