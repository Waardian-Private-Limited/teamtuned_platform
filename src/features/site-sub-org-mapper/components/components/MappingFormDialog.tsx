'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { loadSiteOptions, loadSubOrgOptions } from '../../api/pickerLoaders';
import type { MappingFieldName } from '../../constants/siteSubOrgMapper.constants';
import type { MappingFormInput, PickerOption } from '../../types/siteSubOrgMapper.model';
import type { FieldErrors } from '../../hooks/useMappingMutations';
import { RemoteSearchSelect } from './RemoteSearchSelect';

interface MappingFormDialogProps {
  open: boolean;
  // The sub-orgs the user may map into; when there is exactly one it is
  // preselected so a single-company admin never has to pick it.
  subOrgOptions: PickerOption[];
  isSaving: boolean;
  fieldErrors: FieldErrors;
  onClearFieldError: (field: MappingFieldName) => void;
  onClose: () => void;
  onSubmit: (input: MappingFormInput) => void;
}

const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';

function ReadOnlyValue({ label, hint }: { label: string; hint?: string | null }) {
  return (
    <div className="flex h-10 w-full items-center rounded-lg border border-line bg-bg-subtle px-3 text-sm text-fg">
      <span className="truncate">{label}</span>
      {hint && <span className="ml-2 shrink-0 text-[11px] text-fg-muted">{hint}</span>}
    </div>
  );
}

export function MappingFormDialog({
  open,
  subOrgOptions,
  isSaving,
  fieldErrors,
  onClearFieldError,
  onClose,
  onSubmit,
}: MappingFormDialogProps) {
  const [site, setSite] = React.useState<PickerOption | null>(null);
  const [subOrg, setSubOrg] = React.useState<PickerOption | null>(null);
  const onlySubOrg = subOrgOptions.length === 1 ? subOrgOptions[0] : null;

  React.useEffect(() => {
    if (!open) return;
    setSite(null);
    setSubOrg(null);
  }, [open]);

  const submit = () => {
    onSubmit({
      siteId: site?.value ?? null,
      subOrgId: (onlySubOrg ?? subOrg)?.value ?? null,
    });
  };

  const titleNode = (
    <div>
      <h2 className="text-sm font-bold text-fg sm:text-base">New Mapping</h2>
      <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">Link a site to the sub-organization it belongs to</p>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titleNode}
      maxWidthClassName="max-w-lg"
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
            disabled={isSaving}
            onClick={submit}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>Create Mapping</span>
          </button>
        </>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <label className={labelClass}>
            Site <span className="text-[var(--tt-danger)]">*</span>
          </label>
          <RemoteSearchSelect
            label="Sites"
            placeholder="Select a site…"
            value={site}
            onChange={(next) => {
              setSite(next);
              onClearFieldError('siteId');
            }}
            load={loadSiteOptions}
            invalid={Boolean(fieldErrors.siteId)}
          />
          {fieldErrors.siteId && <p className={cx(text.error, 'mt-1.5')}>{fieldErrors.siteId}</p>}
        </div>

        <div>
          <label className={labelClass}>
            Sub-organization <span className="text-[var(--tt-danger)]">*</span>
          </label>
          {onlySubOrg ? (
            <ReadOnlyValue label={onlySubOrg.label} hint={onlySubOrg.hint} />
          ) : (
            <RemoteSearchSelect
              label="Sub-organizations"
              placeholder="Select a sub-organization…"
              value={subOrg}
              onChange={(next) => {
                setSubOrg(next);
                onClearFieldError('subOrgId');
              }}
              load={loadSubOrgOptions}
              invalid={Boolean(fieldErrors.subOrgId)}
            />
          )}
          {fieldErrors.subOrgId && <p className={cx(text.error, 'mt-1.5')}>{fieldErrors.subOrgId}</p>}
        </div>

      </form>
    </Dialog>
  );
}
