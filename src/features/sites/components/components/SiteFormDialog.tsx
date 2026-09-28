'use client';

import React from 'react';
import { Check, Loader2, MapPin, Search } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { lookupPincode } from '../../api/sites.api';
import { SubOrgMultiPicker } from '@/features/sub-organizations/components/SubOrgMultiPicker';
import { usePermission } from '@/lib/hooks/usePermission';
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
  const [subOrgIds, setSubOrgIds] = React.useState<number[]>([]);
  const [pinLookingUp, setPinLookingUp] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [clientErrors, setClientErrors] = React.useState<Record<string, string>>({});
  const { isOrgAdmin } = usePermission();
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
    setSubOrgIds(initial?.subOrgIds ?? []);
    setLocationError(null);
    setClientErrors({});
    setLocating(false);
  }, [open, initial]);

  const today = React.useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const triggerPincodeLookup = (pinToLookup?: string) => {
    const pin = (pinToLookup ?? pincode).trim();
    if (!/^\d{6}$/.test(pin)) return;
    const seq = ++pinLookupSeq.current;
    setPinLookingUp(true);
    lookupPincode(pin)
      .then((lookup) => {
        if (pinLookupSeq.current !== seq) return;
        if (lookup) {
          if (lookup.city) setCity(lookup.city);
          if (lookup.state) setState(lookup.state);
          if (!country.trim()) setCountry('India');
        }
      })
      .finally(() => {
        if (pinLookupSeq.current === seq) {
          setPinLookingUp(false);
        }
      });
  };

  const handlePincodeChange = (value: string) => {
    setPincode(value);
    if (/^\d{6}$/.test(value)) {
      triggerPincodeLookup(value);
    }
  };

  const handleGetCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        if (!radiusMeters || Number(radiusMeters) <= 0) {
          setRadiusMeters('200');
        }
        setLocating(false);
        setClientErrors((prev) => {
          const next = { ...prev };
          delete next.latitude;
          delete next.longitude;
          delete next.radiusMeters;
          return next;
        });
      },
      (err) => {
        setLocating(false);
        let msg = 'Unable to retrieve location';
        if (err.code === 1) {
          msg = 'Location permission denied. Please allow location access in your browser settings.';
        } else if (err.code === 2) {
          msg = 'Location position is unavailable. Please check device GPS or network.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please try again.';
        }
        setLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const submit = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Site name is required';
    if (!code.trim()) errors.code = 'Site code is required';

    const latTrimmed = latitude.trim();
    if (!latTrimmed) {
      errors.latitude = 'Latitude is required';
    } else {
      const latNum = Number(latTrimmed);
      if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
        errors.latitude = 'Must be between -90 and 90';
      }
    }

    const lngTrimmed = longitude.trim();
    if (!lngTrimmed) {
      errors.longitude = 'Longitude is required';
    } else {
      const lngNum = Number(lngTrimmed);
      if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
        errors.longitude = 'Must be between -180 and 180';
      }
    }

    const radTrimmed = radiusMeters.trim();
    if (!radTrimmed) {
      errors.radiusMeters = 'Radius is required';
    } else {
      const radNum = Number(radTrimmed);
      if (!Number.isFinite(radNum) || radNum <= 0) {
        errors.radiusMeters = 'Radius must be a positive number';
      }
    }

    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }
    setClientErrors({});

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
      subOrgIds,
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
            disabled={isSaving || !name.trim() || !code.trim() || !latitude.trim() || !longitude.trim()}
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
                onChange={(e) => {
                  setName(e.target.value);
                  if (clientErrors.name) {
                    setClientErrors((p) => { const n = { ...p }; delete n.name; return n; });
                  }
                }}
                placeholder="e.g., Andheri Plant, Pune Warehouse"
                className={cx(inputClass, clientErrors.name && 'border-[var(--tt-danger)]')}
                autoFocus
              />
              {clientErrors.name ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{clientErrors.name}</p>
              ) : errFor(fieldError, 'name') ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
              ) : null}
            </div>
            <div>
              <label className={labelClass}>
                Site Code <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (clientErrors.code) {
                    setClientErrors((p) => { const n = { ...p }; delete n.code; return n; });
                  }
                }}
                placeholder="e.g., AND-PLT-01"
                className={cx(inputClass, clientErrors.code && 'border-[var(--tt-danger)]')}
              />
              {clientErrors.code ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{clientErrors.code}</p>
              ) : errFor(fieldError, 'code') ? (
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
          <h3 className={sectionTitleClass}>Sub-organizations</h3>
          <div className="mt-2">
            <SubOrgMultiPicker value={subOrgIds} onChange={setSubOrgIds} allowShared={isOrgAdmin} />
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-fg sm:text-[13px]">Pincode</label>
                  {pincode.length === 6 && !pinLookingUp && (
                    <button
                      type="button"
                      onClick={() => triggerPincodeLookup()}
                      className="text-[11px] font-semibold text-[var(--tt-primary)] hover:underline"
                    >
                      Lookup
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onBlur={() => {
                      if (pincode.length === 6 && (!city || !state)) {
                        triggerPincodeLookup();
                      }
                    }}
                    placeholder="400069"
                    className={cx(inputClass, 'pr-8')}
                  />
                  {pinLookingUp ? (
                    <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-fg-subtle" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerPincodeLookup()}
                      disabled={pincode.length !== 6}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg disabled:opacity-30"
                      title="Lookup pincode"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </button>
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
          <div className="flex items-center justify-between">
            <h3 className={sectionTitleClass}>Geofence</h3>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--tt-primary)]/30 bg-[var(--tt-primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--tt-primary)] transition-all hover:bg-[var(--tt-primary)]/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              title="Auto-fill latitude & longitude from device GPS"
            >
              {locating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MapPin className="h-3.5 w-3.5" />
              )}
              <span>{locating ? 'Locating...' : 'Get Current Location'}</span>
            </button>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div>
              <label className={labelClass}>
                Latitude <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value);
                  if (clientErrors.latitude) {
                    setClientErrors((p) => { const n = { ...p }; delete n.latitude; return n; });
                  }
                }}
                placeholder="19.1136"
                className={cx(inputClass, (clientErrors.latitude || errFor(fieldError, 'latitude')) && 'border-[var(--tt-danger)]')}
              />
              {clientErrors.latitude ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{clientErrors.latitude}</p>
              ) : errFor(fieldError, 'latitude') ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
              ) : null}
            </div>
            <div>
              <label className={labelClass}>
                Longitude <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value);
                  if (clientErrors.longitude) {
                    setClientErrors((p) => { const n = { ...p }; delete n.longitude; return n; });
                  }
                }}
                placeholder="72.8697"
                className={cx(inputClass, (clientErrors.longitude || errFor(fieldError, 'longitude')) && 'border-[var(--tt-danger)]')}
              />
              {clientErrors.longitude ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{clientErrors.longitude}</p>
              ) : errFor(fieldError, 'longitude') ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
              ) : null}
            </div>
            <div>
              <label className={labelClass}>
                Radius (m) <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={radiusMeters}
                onChange={(e) => {
                  setRadiusMeters(e.target.value);
                  if (clientErrors.radiusMeters) {
                    setClientErrors((p) => { const n = { ...p }; delete n.radiusMeters; return n; });
                  }
                }}
                placeholder="200"
                className={cx(inputClass, clientErrors.radiusMeters && 'border-[var(--tt-danger)]')}
              />
              {clientErrors.radiusMeters && (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{clientErrors.radiusMeters}</p>
              )}
            </div>
          </div>
          {locationError && (
            <p className="mt-1.5 text-xs text-[var(--tt-danger)]">{locationError}</p>
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
