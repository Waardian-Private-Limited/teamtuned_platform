'use client';

import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { StatusPill } from '@/components/ui/StatusPill';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { useDebitVersions } from '../../hooks/useDebitVersions';
import type { DebitRule, DebitRuleVersion } from '../../types/payroll-setup.model';
import { ruleValueText } from '../../utils/debitSummary';
import { formatDate } from '../../utils/validators';

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';
const errorInputClass =
  'w-full min-w-0 rounded-lg border border-[var(--tt-danger)] bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-danger)] focus:ring-1 focus:ring-[var(--tt-danger)]';
const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';

/** A rule's dated versions, newest first. Unpaid versions can be removed. */
export function DebitHistoryDrawer({
  open,
  rule,
  components,
  canEdit,
  onChanged,
  onClose,
}: {
  open: boolean;
  rule: DebitRule | null;
  components: Array<{ id: number; name: string }>;
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
  onClose: () => void;
}) {
  const versions = useDebitVersions(open && rule ? rule.id : null);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const componentName = (id: number | null) => (id ? components.find((c) => c.id === id)?.name : undefined);

  const summary = (version: DebitRuleVersion) =>
    rule
      ? ruleValueText(
          {
            isStatutory: rule.isStatutory,
            category: rule.category,
            config: version.config,
            debitType: version.debitType,
            fixedAmount: version.fixedAmount,
            percentageValue: version.percentageValue,
            referenceAmount: version.referenceAmount,
            breakdownItemName: componentName(version.breakdownItemId) ?? null,
          },
          componentName
        )
      : '';

  const askRemove = (version: DebitRuleVersion) =>
    setConfirm({
      title: 'Remove this change?',
      body: `The rule goes back to the settings it had before ${version.effectiveFrom ? formatDate(version.effectiveFrom) : 'this change'}.`,
      cta: 'Remove',
      danger: true,
      run: async () => {
        const ok = await versions.remove(version.id);
        if (ok) await onChanged();
      },
    });

  return (
    <Drawer open={open} onClose={onClose} title={rule ? `History — ${rule.name}` : 'History'}>
      <div className="space-y-3">
        <p className={text.body}>
          Each change applies from its date. Pay periods before it keep the earlier settings.
        </p>
        {versions.history?.lastFinalizedDay && (
          <p className={cx(text.caption, 'text-[11px]')}>
            Payroll is finalized up to {formatDate(versions.history.lastFinalizedDay)}. Changes already paid cannot be
            removed.
          </p>
        )}

        {versions.error && <Alert message={versions.error} tone="error" />}

        {versions.isLoading && !versions.history ? (
          [1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-subtle" />)
        ) : !versions.history || versions.history.versions.length === 0 ? (
          <p className={cx(text.caption, 'py-4 text-center')}>No changes recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {versions.history.versions.map((version) => (
              <div key={version.id} className="rounded-lg border border-line px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-fg sm:text-sm">
                        {version.effectiveFrom ? `From ${formatDate(version.effectiveFrom)}` : 'Since the start'}
                      </span>
                      <StatusPill
                        label={version.active ? 'Active' : 'Inactive'}
                        tone={version.active ? 'active' : 'inactive'}
                      />
                    </div>
                    <div className="mt-0.5 text-xs text-fg">{summary(version)}</div>
                    {version.reason && <div className="mt-0.5 text-[11px] text-fg-muted">{version.reason}</div>}
                    <div className={cx(text.caption, 'mt-0.5 text-[11px]')}>
                      {[version.createdByName, version.createdAt ? formatDate(version.createdAt) : null]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </div>
                  </div>
                  {canEdit && version.canDelete && (
                    <button
                      type="button"
                      disabled={versions.removingId === version.id}
                      onClick={() => askRemove(version)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)] disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </Drawer>
  );
}

/** Activating or deactivating a rule from a date, prefilled with the first unfrozen day. */
export function DebitStatusDialog({
  rule,
  isSaving,
  error,
  onClose,
  onConfirm,
}: {
  rule: DebitRule | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (effectiveFrom: string) => void;
}) {
  const versions = useDebitVersions(rule ? rule.id : null);
  const [date, setDate] = React.useState('');

  React.useEffect(() => {
    setDate(versions.defaultEffectiveFrom);
  }, [rule, versions.defaultEffectiveFrom]);

  const deactivating = rule?.status === 'active';

  return (
    <Dialog
      open={Boolean(rule)}
      onClose={onClose}
      title={deactivating ? 'Deactivate Deduction Rule' : 'Activate Deduction Rule'}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || versions.isLoading}
            onClick={() => onConfirm(date)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>{deactivating ? 'Deactivate' : 'Activate'}</span>
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        <p className={text.body}>
          {deactivating ? (
            <>
              Stop deducting <span className="font-semibold text-fg">{rule?.name}</span> from this date. Pay periods
              before it keep the deduction.
            </>
          ) : (
            <>
              Start deducting <span className="font-semibold text-fg">{rule?.name}</span> again from this date.
            </>
          )}
        </p>
        <div>
          <label className={labelClass}>From date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={error ? errorInputClass : inputClass}
          />
          {error ? (
            <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{error}</p>
          ) : (
            <p className="mt-1 text-[11px] text-fg-muted">
              A date inside a finalized month is settled as arrears in the next payroll.
            </p>
          )}
          {versions.error && (
            <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">
              Could not load the default date. {versions.error}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
