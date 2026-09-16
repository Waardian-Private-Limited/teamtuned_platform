'use client';

import React from 'react';
import { CheckSquare, Square, ArrowRight, ArrowLeft, Layers } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Tooltip } from '@/components/ui/Tooltip';
import { cx, text } from '@/theme/tokens';
import type { Role, PermissionSet, PermissionCategory, BulkAction, BulkPreviewResult } from '../../types/roles.model';
import { BULK_ACTION_OPTIONS } from '../../constants/roles.constants';
import { PermissionTree } from './PermissionTree';

interface BulkPermissionsDrawerProps {
  open: boolean;
  roles: Role[];
  sets: PermissionSet[];
  categories: PermissionCategory[];
  categoriesLoading: boolean;
  isPreviewing: boolean;
  isApplying: boolean;
  preview: BulkPreviewResult | null;
  onPreview: (roleIds: number[], setIds: number[], extraCodes: string[], action: BulkAction) => void;
  onApply: (roleIds: number[], setIds: number[], extraCodes: string[], action: BulkAction) => void;
  onManageSets: () => void;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

export function BulkPermissionsDrawer({
  open,
  roles,
  sets,
  categories,
  categoriesLoading,
  isPreviewing,
  isApplying,
  preview,
  onPreview,
  onApply,
  onManageSets,
  onClose,
}: BulkPermissionsDrawerProps) {
  const [step, setStep] = React.useState<Step>(1);
  const [roleFilter, setRoleFilter] = React.useState('');
  const [selectedRoleIds, setSelectedRoleIds] = React.useState<Set<number>>(new Set());
  const [selectedSetIds, setSelectedSetIds] = React.useState<Set<number>>(new Set());
  const [extraCodes, setExtraCodes] = React.useState<Set<string>>(new Set());
  const [action, setAction] = React.useState<BulkAction>('grant');

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setRoleFilter('');
    setSelectedRoleIds(new Set());
    setSelectedSetIds(new Set());
    setExtraCodes(new Set());
    setAction('grant');
  }, [open]);

  const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(roleFilter.trim().toLowerCase()));

  const toggleRole = (id: number) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSet = (id: number) => {
    setSelectedSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canGoStep2 = selectedRoleIds.size > 0;
  const canGoStep3 = selectedSetIds.size > 0 || extraCodes.size > 0;

  const goPreview = () => {
    setStep(3);
    onPreview(Array.from(selectedRoleIds), Array.from(selectedSetIds), Array.from(extraCodes), action);
  };

  const apply = () => {
    onApply(Array.from(selectedRoleIds), Array.from(selectedSetIds), Array.from(extraCodes), action);
  };

  return (
    <Drawer open={open} onClose={onClose} title="Bulk Permissions">
      <div className="space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={cx(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  step >= s ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'bg-bg-subtle text-fg-muted'
                )}
              >
                {s}
              </div>
              {s < 3 && <div className={cx('h-0.5 flex-1', step > s ? 'bg-[var(--tt-primary)]' : 'bg-bg-subtle')} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className={text.overline}>Step 1 · Choose roles</p>
            <input
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              placeholder="Filter roles…"
              className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]"
            />
            <ul className="max-h-80 divide-y divide-line/60 overflow-y-auto tt-scroll-hidden rounded-lg border border-line">
              {filteredRoles.map((role) => {
                const checked = selectedRoleIds.has(role.id);
                return (
                  <li key={role.id}>
                    <button
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className={cx('flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-bg-subtle', checked && 'bg-[var(--tt-primary)]/5')}
                    >
                      {checked ? <CheckSquare className="h-4 w-4 shrink-0 text-[var(--tt-primary)]" /> : <Square className="h-4 w-4 shrink-0 text-fg-subtle" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{role.name}</span>
                        <span className="block truncate text-xs text-fg-muted">{role.employeeCount} employee{role.employeeCount === 1 ? '' : 's'}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {filteredRoles.length === 0 && <li className="px-3 py-3 text-sm text-fg-muted">No roles match.</li>}
            </ul>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!canGoStep2}
                onClick={() => setStep(2)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
              >
                Next ({selectedRoleIds.size} role{selectedRoleIds.size === 1 ? '' : 's'})
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className={text.overline}>Step 2 · Choose permission sets or individual permissions</p>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-semibold text-fg sm:text-[13px]">Permission sets</p>
                <button type="button" onClick={onManageSets} className="text-[11px] font-semibold text-[var(--tt-primary)] hover:underline sm:text-xs">
                  Manage sets
                </button>
              </div>
              {sets.length === 0 ? (
                <p className="text-xs text-fg-muted">No permission sets yet. Create one to reuse it here.</p>
              ) : (
                <div className="space-y-1.5">
                  {sets.map((set) => {
                    const checked = selectedSetIds.has(set.id);
                    return (
                      <button
                        key={set.id}
                        type="button"
                        onClick={() => toggleSet(set.id)}
                        className={cx(
                          'flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
                          checked ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5' : 'border-line hover:bg-bg-subtle'
                        )}
                      >
                        {checked ? <CheckSquare className="h-4 w-4 shrink-0 text-[var(--tt-primary)]" /> : <Square className="h-4 w-4 shrink-0 text-fg-subtle" />}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-fg">{set.name}</span>
                          <span className="block truncate text-xs text-fg-muted">{set.permissions.length} permission{set.permissions.length === 1 ? '' : 's'}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">Individual permissions</p>
              <PermissionTree categories={categories} selected={extraCodes} onChange={setExtraCodes} isLoading={categoriesLoading} />
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                type="button"
                disabled={!canGoStep3}
                onClick={goPreview}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
              >
                Next: Choose action
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className={text.overline}>Step 3 · Choose an action and review</p>

            <div className="space-y-1.5">
              {BULK_ACTION_OPTIONS.map((opt) => (
                <Tooltip key={opt.value} content={opt.description}>
                  <button
                    type="button"
                    onClick={() => { setAction(opt.value); onPreview(Array.from(selectedRoleIds), Array.from(selectedSetIds), Array.from(extraCodes), opt.value); }}
                    className={cx(
                      'flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
                      action === opt.value ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5' : 'border-line hover:bg-bg-subtle'
                    )}
                  >
                    <Layers className="h-4 w-4 shrink-0 text-fg-muted" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-fg">{opt.label}</span>
                      <span className="block truncate text-xs text-fg-muted">{opt.description}</span>
                    </span>
                  </button>
                </Tooltip>
              ))}
            </div>

            <div className="rounded-lg border border-line">
              <div className="flex items-center justify-between bg-bg-subtle px-3 py-2">
                <span className="text-xs font-semibold text-fg sm:text-sm">Preview</span>
                {preview && (
                  <span className="text-[11px] text-fg-muted sm:text-xs">
                    +{preview.totals.adds} grant{preview.totals.adds === 1 ? '' : 's'} · -{preview.totals.removes} revoke{preview.totals.removes === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {isPreviewing ? (
                <p className="px-3 py-3 text-sm text-fg-muted">Calculating…</p>
              ) : !preview ? (
                <p className="px-3 py-3 text-sm text-fg-muted">No changes to preview.</p>
              ) : (
                <ul className="max-h-64 divide-y divide-line/60 overflow-y-auto tt-scroll-hidden">
                  {preview.roles.map((r) => (
                    <li key={r.id} className="px-3 py-2.5">
                      <p className="text-xs font-semibold text-fg sm:text-sm">{r.name}</p>
                      {r.adds.length > 0 && (
                        <p className="mt-0.5 truncate text-[11px] text-[var(--tt-success)] sm:text-xs">+ {r.adds.join(', ')}</p>
                      )}
                      {r.removes.length > 0 && (
                        <p className="mt-0.5 truncate text-[11px] text-[var(--tt-danger)] sm:text-xs">- {r.removes.join(', ')}</p>
                      )}
                      {r.adds.length === 0 && r.removes.length === 0 && (
                        <p className="mt-0.5 text-[11px] text-fg-subtle sm:text-xs">No change</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                type="button"
                disabled={isApplying || !preview || (preview.totals.adds === 0 && preview.totals.removes === 0)}
                onClick={apply}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
              >
                {isApplying && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                Apply to {selectedRoleIds.size} role{selectedRoleIds.size === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
