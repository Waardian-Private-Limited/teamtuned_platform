'use client';

import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { lookupPincode } from '../../api/sites.api';
import type { Site, SiteFormInput, SiteStatus } from '../../types/sites.model';
import type { FieldError } from '../../hooks/useSiteMutations';

interface SiteFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Site;
  isSaving: boolean;
  fieldError: FieldError | null;
  onClose: () => void;
  onSubmit: (input: SiteFormInput) => void;
}

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] disabled:opacity-50 disabled:cursor-not-allowed';

const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';

const sectionTitleClass = 'text-[11px] font-semibold uppercase tracking-wider text-fg-subtle';

function errFor(fieldError: FieldError | null, field: string): string | null {
  return fieldError?.field === field ? fieldError.message : null;
}

export function SiteFormDialog({
  open,
  mode,
  initial,
  isSaving,
  fieldError,
  onClose,
  onSubmit,
}: SiteFormDialogProps) {
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [status, setStatus] = React.useState<SiteStatus>('active');
  const [address, setAddress] = React.useState('');
  const [pincode, setPincode] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [country, setCountry] = React.useState('India');
  const [isHeadOffice, setIsHeadOffice] = React.useState(false);
  const [hasExpiry, setHasExpiry] = React.useState(false);
  const [expiryDate, setExpiryDate] = React.useState('');
  const [hasBudget, setHasBudget] = React.useState(false);
  const [budgetAmount, setBudgetAmount] = React.useState('');
  const [finalBudgetAllocated, setFinalBudgetAllocated] = React.useState('');
  const [actualBudgetApproved, setActualBudgetApproved] = React.useState('');
  const [latitude, setLatitude] = React.useState('');
  const [longitude, setLongitude] = React.useState('');
  const [radiusMeters, setRadiusMeters] = React.useState('200');
  const [pinLookingUp, setPinLookingUp] = React.useState(false);
  const pinLookupSeq = React.useRef(0);

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setCode(initial?.code ?? '');
    setStatus(initial?.status ?? 'active');
    setAddress(initial?.address ?? '');
    setPincode(initial?.pincode ?? '');
    setCity(initial?.city ?? '');
    setState(initial?.state ?? '');
    setCountry(initial?.country ?? 'India');
    setIsHeadOffice(initial?.isHeadOffice ?? false);
    setHasExpiry(initial?.hasExpiry ?? false);
    setExpiryDate(initial?.expiryDate ?? '');
    setHasBudget(initial?.hasBudget ?? false);
    setBudgetAmount(initial?.budgetAmount != null ? String(initial.budgetAmount) : '');
    setFinalBudgetAllocated(initial?.finalBudgetAllocated != null ? String(initial.finalBudgetAllocated) : '');
    setActualBudgetApproved(initial?.actualBudgetApproved != null ? String(initial.actualBudgetApproved) : '');
    setLatitude(initial?.latitude != null ? String(initial.latitude) : '');
    setLongitude(initial?.longitude != null ? String(initial.longitude) : '');
    setRadiusMeters(initial?.radiusMeters != null ? String(initial.radiusMeters) : '200');
  }, [open, initial]);

  const today = React.useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const handlePincodeChange = (value: string) => {
    setPincode(value);
    if (/^\d{6}$/.test(value)) {
      const seq = ++pinLookupSeq.current;
      setPinLookingUp(true);
      lookupPincode(value).then((lookup) => {
        if (pinLookupSeq.current !== seq) return;
        if (lookup) {
          if (lookup.city) setCity(lookup.city);
          if (lookup.state) setState(lookup.state);
          if (!country.trim()) setCountry('India');
        }
        setPinLookingUp(false);
      });
    }
  };

  const submit = () => {
    if (!name.trim() || !code.trim()) return;
    onSubmit({
      name,
      code,
      status,
      address,
      pincode,
      city,
      state,
      country,
      isHeadOffice,
      hasExpiry,
      expiryDate,
      hasBudget,
      budgetAmount,
      finalBudgetAllocated,
      actualBudgetApproved,
      latitude,
      longitude,
      radiusMeters,
    });
  };

  const titleNode = (
    <div>
      <h2 className="text-sm font-bold text-fg sm:text-base">
        {mode === 'create' ? 'Add Site' : 'Edit Site'}
      </h2>
      <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
        {mode === 'create'
          ? 'Create a work location for attendance, assignments and budgets'
          : `Update details for ${initial?.name ?? 'this site'}`}
      </p>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titleNode}
      maxWidthClassName="max-w-2xl"
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
            disabled={isSaving || !name.trim() || !code.trim()}
            onClick={submit}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>{mode === 'create' ? 'Add Site' : 'Save changes'}</span>
          </button>
        </>
      }
    >
      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <h3 className={sectionTitleClass}>Site Details</h3>
          <div className="mt-2 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Site Name <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Andheri Plant, Pune Warehouse"
                className={inputClass}
                autoFocus
              />
              {errFor(fieldError, 'name') && (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Site Code <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., AND-PLT-01"
                className={inputClass}
              />
              {errFor(fieldError, 'code') ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
              ) : (
                <p className="mt-1 text-[11px] text-fg-muted">Must be unique within your organization.</p>
              )}
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setIsHeadOffice((v) => !v)}
              className={cx(
                'flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
                isHeadOffice
                  ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                  : 'border-line bg-surface hover:bg-bg-subtle'
              )}
            >
              <span
                className={cx(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
                  isHeadOffice ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]' : 'border-line-strong bg-surface'
                )}
              >
                {isHeadOffice && <Check className="h-3 w-3 text-[var(--tt-on-primary)]" />}
              </span>
              <div>
                <div className="text-xs font-semibold text-fg">Head Office</div>
                <div className="text-[11px] text-fg-muted">Mark this as the primary headquarters</div>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={cx(
                  'flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all',
                  status === 'active'
                    ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                    : 'border-line bg-surface hover:bg-bg-subtle'
                )}
              >
                <span className="flex h-2 w-2 shrink-0 rounded-full bg-[var(--tt-success)]" />
                <div className="text-xs font-semibold text-fg">Active</div>
              </button>
              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={cx(
                  'flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all',
                  status === 'inactive'
                    ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                    : 'border-line bg-surface hover:bg-bg-subtle'
                )}
              >
                <span className="flex h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                <div className="text-xs font-semibold text-fg">Inactive</div>
              </button>
            </div>
          </div>
        </div>

        <div>
          <h3 className={sectionTitleClass}>Address</h3>
          <div className="mt-2 grid grid-cols-1 gap-3.5">
            <div>
              <label className={labelClass}>Street Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Building, street, area…"
                rows={2}
                className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-xs text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <div>
                <label className={labelClass}>Pincode</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="400069"
                    className={inputClass}
                  />
                  {pinLookingUp && (
                    <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-fg-subtle" />
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="Maharashtra" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className={sectionTitleClass}>Geofence <span className="normal-case tracking-normal text-fg-subtle">(optional)</span></h3>
          <div className="mt-2 grid grid-cols-3 gap-3.5">
            <div>
              <label className={labelClass}>Latitude</label>
              <input type="text" inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="19.1136" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Longitude</label>
              <input type="text" inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="72.8697" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Radius (m)</label>
              <input type="number" min={1} value={radiusMeters} onChange={(e) => setRadiusMeters(e.target.value)} placeholder="200" className={inputClass} />
            </div>
          </div>
          {errFor(fieldError, 'latitude') && (
            <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
          )}
          <p className="mt-1 text-[11px] text-fg-muted">Employees can only mark attendance within this radius of the site.</p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setHasExpiry((v) => !v)}
            className={cx(
              'flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
              hasExpiry
                ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                : 'border-line bg-surface hover:bg-bg-subtle'
            )}
          >
            <span
              className={cx(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
                hasExpiry ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]' : 'border-line-strong bg-surface'
              )}
            >
              {hasExpiry && <Check className="h-3 w-3 text-[var(--tt-on-primary)]" />}
            </span>
            <div>
              <div className="text-xs font-semibold text-fg">Site has an expiry date</div>
              <div className="text-[11px] text-fg-muted">For leased or temporary locations</div>
            </div>
          </button>
          {hasExpiry && (
            <div className="mt-2.5">
              <label className={labelClass}>
                Expiry Date <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                min={today}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={cx(inputClass, 'sm:max-w-56')}
              />
              {errFor(fieldError, 'expiry_date') ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
              ) : (
                <p className="mt-1 text-[11px] text-fg-muted">Only future dates are allowed.</p>
              )}
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setHasBudget((v) => !v)}
            className={cx(
              'flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
              hasBudget
                ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                : 'border-line bg-surface hover:bg-bg-subtle'
            )}
          >
            <span
              className={cx(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
                hasBudget ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]' : 'border-line-strong bg-surface'
              )}
            >
              {hasBudget && <Check className="h-3 w-3 text-[var(--tt-on-primary)]" />}
            </span>
            <div>
              <div className="text-xs font-semibold text-fg">Track site budget</div>
              <div className="text-[11px] text-fg-muted">Cap spending and track salaries allocated to this site</div>
            </div>
          </button>

          {hasBudget && (
            <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div>
                <label className={labelClass}>
                  Total Budget <span className="text-[var(--tt-danger)]">*</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="e.g., 500000"
                  className={inputClass}
                />
                {errFor(fieldError, 'budget_amount') && (
                  <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Final Allocated</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={finalBudgetAllocated}
                  onChange={(e) => setFinalBudgetAllocated(e.target.value)}
                  placeholder="Optional"
                  className={inputClass}
                />
                {errFor(fieldError, 'final_budget_allocated') && (
                  <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Approved</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={actualBudgetApproved}
                  onChange={(e) => setActualBudgetApproved(e.target.value)}
                  placeholder="Defaults to total budget"
                  className={inputClass}
                />
                {errFor(fieldError, 'actual_budget_approved') && (
                  <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </form>
    </Dialog>
  );
}
