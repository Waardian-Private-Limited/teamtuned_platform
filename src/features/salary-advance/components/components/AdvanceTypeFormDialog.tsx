'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { OptionCard, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';
import type { AdvanceType, AdvanceTypeFieldErrors, AdvanceTypeFormInput, AdvanceKind } from '../../types/salaryAdvance.model';
import { validateAdvanceType } from '../../utils/validators';

interface AdvanceTypeFormDialogProps {
  open: boolean;
  initial: AdvanceType | null;
  isSaving: boolean;
  fieldErrors: AdvanceTypeFieldErrors;
  formError: string;
  onFieldErrors: (errors: AdvanceTypeFieldErrors) => void;
  onClose: () => void;
  onSubmit: (input: AdvanceTypeFormInput) => void;
}

function codeFrom(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
}

export function AdvanceTypeFormDialog({ open, initial, isSaving, fieldErrors, formError, onFieldErrors, onClose, onSubmit }: AdvanceTypeFormDialogProps) {
  const { isOrgAdmin } = usePermission();
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [codeTouched, setCodeTouched] = React.useState(false);
  const [description, setDescription] = React.useState('');
  const [kind, setKind] = React.useState<AdvanceKind>('advance');
  const [status, setStatus] = React.useState<'active' | 'inactive'>('active');
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setCode(initial?.code ?? '');
    setCodeTouched(Boolean(initial));
    setDescription(initial?.description ?? '');
    setKind(initial?.kind ?? 'advance');
    setStatus(initial?.status ?? 'active');
    setSubOrgId(initial?.subOrganizationId ?? null);
  }, [open, initial]);

  const clear = (key: keyof AdvanceTypeFieldErrors) => {
    if (fieldErrors[key]) onFieldErrors({ ...fieldErrors, [key]: undefined });
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const input: AdvanceTypeFormInput = { name, code, description, kind, status, subOrganizationId: subOrgId };
    const errors = validateAdvanceType(input);
    if (Object.keys(errors).length) {
      onFieldErrors(errors);
      return;
    }
    onSubmit(input);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-sm font-bold text-fg sm:text-base">{initial ? 'Edit advance type' : 'New advance type'}</h2>
          <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">Rules for each type, such as limits and instalments, are set in Policies.</p>
        </div>
      }
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={isSaving} onClick={() => submit()}>
            {initial ? 'Save changes' : 'Create type'}
          </Btn>
        </>
      }
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        <TextField
          label="Name"
          required
          autoFocus
          value={name}
          maxLength={100}
          onChange={(v) => {
            setName(v);
            if (!codeTouched) setCode(codeFrom(v));
            clear('name');
            if (!codeTouched) clear('code');
          }}
          placeholder="For example, Festival advance"
          error={fieldErrors.name}
        />
        <TextField
          label="Code"
          required
          value={code}
          maxLength={40}
          disabled={Boolean(initial)}
          onChange={(v) => {
            setCode(v.toUpperCase().replace(/[^A-Z0-9_]/g, ''));
            setCodeTouched(true);
            clear('code');
          }}
          placeholder="FESTIVAL_ADVANCE"
          error={fieldErrors.code}
          hint={initial ? 'The code cannot change once created' : 'Used in reports and the payslip line'}
        />
        <Textarea
          label="Description"
          rows={2}
          maxLength={300}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            clear('description');
          }}
          error={fieldErrors.description}
        />
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">Kind</p>
          <div className="grid grid-cols-2 gap-2">
            <OptionCard selected={kind === 'advance'} onClick={() => setKind('advance')} title="Advance" description="Against salary already earned" />
            <OptionCard selected={kind === 'loan'} onClick={() => setKind('loan')} title="Loan" description="Larger, repaid over months" />
          </div>
        </div>
        <SubOrgPicker value={subOrgId} onChange={setSubOrgId} allowShared={isOrgAdmin} />
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">Status</p>
          <div className="grid grid-cols-2 gap-2">
            <OptionCard selected={status === 'active'} onClick={() => setStatus('active')} title="Active" description="Employees can request it" />
            <OptionCard selected={status === 'inactive'} onClick={() => setStatus('inactive')} title="Inactive" description="Hidden from new requests" />
          </div>
        </div>
        {formError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{formError}</p>}
      </form>
    </Dialog>
  );
}
