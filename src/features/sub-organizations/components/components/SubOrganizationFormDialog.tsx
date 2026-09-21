'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import type { SubOrganization, SubOrganizationFormInput } from '../../types/sub-organizations.model';
import type { SubOrgFieldError } from '../../hooks/useSubOrganizationMutations';
import { GST_LENGTH } from '../../constants/sub-organizations.constants';

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';
const errorInputClass =
  'w-full min-w-0 rounded-lg border border-[var(--tt-danger)] bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-danger)] focus:ring-1 focus:ring-[var(--tt-danger)]';
const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';
const errorClass = 'mt-1 text-[11px] font-medium text-[var(--tt-danger)]';
const hintClass = 'mt-1 text-[11px] text-fg-muted';

function initialState(initial?: SubOrganization): SubOrganizationFormInput {
  return {
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    address: initial?.address ?? '',
    gstNumber: initial?.gstNumber ?? '',
    logoUrl: initial?.logoUrl ?? '',
    status: initial?.status ?? 'active',
  };
}

export function SubOrganizationFormDialog({
  open,
  mode,
  initial,
  isSaving,
  fieldError,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: SubOrganization;
  isSaving: boolean;
  fieldError: SubOrgFieldError | null;
  onClose: () => void;
  onSubmit: (input: SubOrganizationFormInput) => void;
}) {
  const [form, setForm] = React.useState<SubOrganizationFormInput>(initialState());

  React.useEffect(() => {
    if (!open) return;
    setForm(initialState(initial));
  }, [open, initial]);

  const titleNode = (
    <div>
      <h2 className="text-sm font-bold text-fg sm:text-base">
        {mode === 'create' ? 'Add Sub-Organization' : 'Edit Sub-Organization'}
      </h2>
      <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
        A separate billing entity within your organization, with its own GST and TDS identity.
      </p>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titleNode}
      maxWidthClassName="max-w-xl"
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
            onClick={() => onSubmit(form)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>{mode === 'create' ? 'Create' : 'Save changes'}</span>
          </button>
        </>
      }
    >
      <form
        noValidate
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              Name <span className="text-[var(--tt-danger)]">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Acme Industries Pvt Ltd"
              maxLength={150}
              className={fieldError?.field === 'name' ? errorInputClass : inputClass}
              autoFocus
            />
            {fieldError?.field === 'name' && <p className={errorClass}>{fieldError.message}</p>}
          </div>
          <div>
            <label className={labelClass}>
              Code <span className="text-[var(--tt-danger)]">*</span>
            </label>
            <input
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="e.g., ACME-PVT"
              maxLength={50}
              className={fieldError?.field === 'code' ? errorInputClass : inputClass}
            />
            {fieldError?.field === 'code' ? (
              <p className={errorClass}>{fieldError.message}</p>
            ) : (
              <p className={hintClass}>Letters, numbers, hyphens and underscores. Unique within your organization.</p>
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>Address</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            placeholder="Registered address printed on invoices and Form 16"
            rows={2}
            className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-xs text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>GST number</label>
            <input
              value={form.gstNumber}
              onChange={(e) => setForm((p) => ({ ...p, gstNumber: e.target.value.toUpperCase() }))}
              placeholder="27AAAAA0000A1Z5"
              maxLength={GST_LENGTH}
              className={fieldError?.field === 'gst_number' ? errorInputClass : inputClass}
            />
            {fieldError?.field === 'gst_number' ? (
              <p className={errorClass}>{fieldError.message}</p>
            ) : (
              <p className={hintClass}>{GST_LENGTH} characters, if this entity is registered.</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as SubOrganizationFormInput['status'] }))}
              className={inputClass}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
