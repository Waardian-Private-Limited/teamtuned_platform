'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { FieldLabel, FieldMessage, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { placeErrors } from '@/features/expense-bills/utils/errors';
import { useFilterOptions } from '@/features/payroll-runs/hooks/useFilterOptions';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/petty-cash.api';
import type { Wallet } from '../../types/petty-cash.model';
import { parseDecimal } from '../../utils/format';
import { CustodianPicker, type PickedCustodian } from './CustodianPicker';
import { FormError } from './Primitives';

type Owner = 'site' | 'company';

const KNOWN = ['name', 'code', 'site_id', 'sub_organization_id', 'float_amount', 'low_balance_alert', 'max_per_expense', 'allow_negative', 'negative_limit', 'custodian_ids', 'primary_custodian_id', 'opening_balance'];

const numOrNull = (v: string) => (v === '' ? null : Number(v));

interface WalletFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Called with the saved wallet's id once created or updated. */
  onSaved: (id: number) => void;
  /** Present: edit this wallet (the owner and opening balance are fixed). Absent: create. */
  wallet?: Wallet | null;
}

/** Create a wallet for a site or a company office, or edit one. Field errors from the API show as red borders. */
export function WalletFormDrawer({ open, onClose, onSaved, wallet = null }: WalletFormDrawerProps) {
  const editing = wallet !== null;
  const [owner, setOwner] = React.useState<Owner>('site');
  const [siteId, setSiteId] = React.useState<number | null>(null);
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [custodians, setCustodians] = React.useState<PickedCustodian[]>([]);
  const [primaryId, setPrimaryId] = React.useState<number | null>(null);
  const [floatAmount, setFloatAmount] = React.useState('');
  const [lowAlert, setLowAlert] = React.useState('');
  const [maxPer, setMaxPer] = React.useState('');
  const [negative, setNegative] = React.useState(false);
  const [negLimit, setNegLimit] = React.useState('');
  const [opening, setOpening] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const { sites } = useFilterOptions(owner === 'site' ? null : subOrgId);

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError('');
    if (wallet) {
      setOwner(wallet.site ? 'site' : 'company');
      setSiteId(wallet.site?.id ?? null);
      setSubOrgId(wallet.company?.id ?? null);
      setName(wallet.name);
      setCode(wallet.code ?? '');
      setCustodians(wallet.custodians.map((c) => ({ id: c.employeeId, name: c.name, code: c.code })));
      setPrimaryId(wallet.custodians.find((c) => c.isPrimary)?.employeeId ?? null);
      setFloatAmount(wallet.floatAmount ? String(wallet.floatAmount) : '');
      setLowAlert(wallet.lowBalanceAlert !== null ? String(wallet.lowBalanceAlert) : '');
      setMaxPer(wallet.maxPerExpense !== null ? String(wallet.maxPerExpense) : '');
      setNegative(wallet.negativeAllowed);
      setNegLimit(wallet.negativeLimit !== null ? String(wallet.negativeLimit) : '');
      setOpening('');
    } else {
      setOwner('site');
      setSiteId(null);
      setSubOrgId(null);
      setName('');
      setCode('');
      setCustodians([]);
      setPrimaryId(null);
      setFloatAmount('');
      setLowAlert('');
      setMaxPer('');
      setNegative(false);
      setNegLimit('');
      setOpening('');
    }
  }, [open, wallet]);

  const siteOptions = React.useMemo<ComboboxOption[]>(() => sites.map((s) => ({ value: s.value, label: s.label })), [sites]);
  const clear = (...keys: string[]) => setErrors((e) => (keys.some((k) => e[k]) ? { ...e, ...Object.fromEntries(keys.map((k) => [k, ''])) } : e));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Enter a name';
    if (!editing && owner === 'site' && !siteId) next.site_id = 'Choose the site';
    if (!custodians.length) next.custodian_ids = 'Add at least one custodian';
    if (negative && negLimit !== '' && !(Number(negLimit) > 0)) next.negative_limit = 'Enter a limit above zero, or leave it empty for no limit';
    return next;
  };

  const save = async () => {
    const found = validate();
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const common = {
        name: name.trim(),
        float_amount: floatAmount === '' ? 0 : Number(floatAmount),
        low_balance_alert: numOrNull(lowAlert),
        max_per_expense: numOrNull(maxPer),
        allow_negative: negative,
        negative_limit: negative ? numOrNull(negLimit) : null,
        custodian_ids: custodians.map((c) => c.id),
        primary_custodian_id: primaryId,
      };
      if (wallet) {
        await api.updateWallet(wallet.id, common);
        showSuccess('Wallet updated');
        onSaved(wallet.id);
      } else {
        const dto = await api.createWallet({
          ...common,
          ...(owner === 'site' ? { site_id: siteId } : { sub_organization_id: subOrgId }),
          code: code.trim() || undefined,
          opening_balance: opening === '' ? undefined : Number(opening),
        });
        showSuccess('Wallet created');
        onSaved(dto.wallet.id);
      }
      onClose();
    } catch (err) {
      const placed = placeErrors(err, (k) => KNOWN.includes(k));
      setErrors(placed.fields);
      setFormError(placed.form);
    } finally {
      setBusy(false);
    }
  };

  const money = (label: string, value: string, set: (v: string) => void, key: string, hint?: string, required?: boolean) => (
    <TextField label={label} required={required} inputMode="decimal" prefix="₹" value={value} onChange={(v) => { set(parseDecimal(v)); clear(key); }} placeholder="0" error={errors[key]} hint={hint} />
  );

  return (
    <Drawer open={open} onClose={onClose} title={editing ? 'Edit wallet' : 'New wallet'} maxWidthClassName="sm:max-w-xl">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex min-h-full flex-col gap-4"
      >
        <div className="flex-1 space-y-4">
          {!editing && (
            <div>
              <FieldLabel label="Held by" />
              <SegmentedControl<Owner>
                options={[{ value: 'site', label: 'A site' }, { value: 'company', label: 'Company office' }]}
                value={owner}
                onChange={(v) => { setOwner(v); clear('site_id', 'sub_organization_id'); }}
              />
              <FieldMessage hint={owner === 'site' ? 'Cash kept at one site.' : 'Cash kept at a company’s head office, not tied to a site.'} />
            </div>
          )}
          {!editing && owner === 'site' && (
            <div>
              <FieldLabel label="Site" required />
              <Combobox options={siteOptions} value={siteId} onChange={(v) => { setSiteId(v === null ? null : Number(v)); clear('site_id'); }} placeholder="Choose a site" searchPlaceholder="Search sites…" emptyLabel="No site matches" ariaLabel="Site" clearable={false} invalid={Boolean(errors.site_id)} />
              <FieldMessage error={errors.site_id} />
            </div>
          )}
          {!editing && owner === 'company' && (
            <div>
              <SubOrgPicker value={subOrgId} onChange={(v) => { setSubOrgId(v); clear('sub_organization_id'); }} allowShared />
              <FieldMessage error={errors.sub_organization_id} />
            </div>
          )}
          {editing && <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg sm:text-sm">{wallet?.site?.name || (wallet?.company?.name ? `${wallet.company.name} office` : 'Company office')}. The owner cannot be changed.</p>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField label="Name" required value={name} onChange={(v) => { setName(v); clear('name'); }} placeholder="e.g. Pune site cash" maxLength={120} error={errors.name} />
            {!editing && <TextField label="Code" value={code} onChange={(v) => { setCode(v); clear('code'); }} placeholder="Made for you if empty" maxLength={30} error={errors.code} />}
          </div>

          <CustodianPicker
            value={custodians}
            onChange={(v) => { setCustodians(v); clear('custodian_ids', 'primary_custodian_id'); }}
            primaryId={primaryId}
            onPrimaryChange={(v) => { setPrimaryId(v); clear('primary_custodian_id'); }}
            subOrgId={owner === 'company' ? subOrgId : null}
            error={errors.custodian_ids || errors.primary_custodian_id}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {money('Float', floatAmount, setFloatAmount, 'float_amount', 'Cash the wallet should hold. Leave empty if you do not keep a float.')}
            {money('Low balance alert', lowAlert, setLowAlert, 'low_balance_alert', 'Flags the wallet below this amount.')}
            {money('Max per expense', maxPer, setMaxPer, 'max_per_expense', 'One expense above this is refused. Empty: no limit (the organization default only flags it).')}
            {!editing && money('Opening balance', opening, setOpening, 'opening_balance', 'Cash already in the wallet.')}
          </div>

          <div className="rounded-xl border border-line p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">Allow spending below zero</p>
                <p className="text-[11px] text-fg-muted sm:text-xs">Expenses can take the book balance negative, up to a limit.</p>
              </div>
              <Switch checked={negative} onChange={(v) => { setNegative(v); clear('allow_negative', 'negative_limit'); }} label="Allow spending below zero" />
            </div>
            {negative && (
              <div className="mt-3">
                {money('Limit below zero', negLimit, setNegLimit, 'negative_limit', 'Leave empty for no limit.')}
              </div>
            )}
          </div>
        </div>

        <FormError message={formError} />
        <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:-mb-5 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn type="submit" variant="primary" busy={busy}>
            {editing ? 'Save changes' : 'Create wallet'}
          </Btn>
        </div>
      </form>
    </Drawer>
  );
}
