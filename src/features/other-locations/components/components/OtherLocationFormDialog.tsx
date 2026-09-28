'use client';

import React from 'react';
import { Check, MapPin } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { showError } from '@/lib/toast';
import type { OtherLocation, OtherLocationFormInput, OtherLocationStatus, OtherLocationType } from '../../types/otherLocations.model';
import { OTHER_LOCATION_TYPE_OPTIONS } from '../../constants/otherLocations.constants';
import type { FieldError } from '../../hooks/useOtherLocationMutations';

interface OtherLocationFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: OtherLocation;
  isSaving: boolean;
  fieldError: FieldError | null;
  onClose: () => void;
  onSubmit: (input: OtherLocationFormInput) => void;
}

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] disabled:opacity-50 disabled:cursor-not-allowed';
const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';
const sectionTitleClass = 'text-[11px] font-semibold uppercase tracking-wider text-fg-subtle';

function errFor(fieldError: FieldError | null, field: string): boolean {
  return fieldError?.field === field;
}

export function OtherLocationFormDialog({
  open,
  mode,
  initial,
  isSaving,
  fieldError,
  onClose,
  onSubmit,
}: OtherLocationFormDialogProps) {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<OtherLocationType>('other');
  const [status, setStatus] = React.useState<OtherLocationStatus>('active');
  const [address, setAddress] = React.useState('');
  const [latitude, setLatitude] = React.useState('');
  const [longitude, setLongitude] = React.useState('');
  const [radius, setRadius] = React.useState('100');

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setType(initial?.type ?? 'other');
    setStatus(initial?.status ?? 'active');
    setAddress(initial?.address ?? '');
    setLatitude(initial?.latitude != null ? String(initial.latitude) : '');
    setLongitude(initial?.longitude != null ? String(initial.longitude) : '');
    setRadius(initial?.radius != null ? String(initial.radius) : '100');
  }, [open, initial]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      showError('Geolocation not supported on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude));
        setLongitude(String(pos.coords.longitude));
      },
      () => showError('Failed to get current location')
    );
  };

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({ name, type, status, address, latitude, longitude, radius });
  };

  const titleNode = (
    <div>
      <h2 className="text-sm font-bold text-fg sm:text-base">{mode === 'create' ? 'Add Location' : 'Edit Location'}</h2>
      <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
        {mode === 'create'
          ? 'Create a non-site work location with a geofence for attendance'
          : `Update details for ${initial?.name ?? 'this location'}`}
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
            disabled={isSaving || !name.trim()}
            onClick={submit}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>{mode === 'create' ? 'Add Location' : 'Save changes'}</span>
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
          <h3 className={sectionTitleClass}>Location Details</h3>
          <div className="mt-2 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Location Name <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Driver Home - Mumbai"
                className={inputClass}
                autoFocus
              />
              {errFor(fieldError, 'location_name') && (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Location Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as OtherLocationType)} className={inputClass}>
                {OTHER_LOCATION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2 sm:max-w-xs">
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

        <div>
          <h3 className={sectionTitleClass}>Address</h3>
          <div className="mt-2">
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Building, street, area…"
              rows={2}
              className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-xs text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className={sectionTitleClass}>Geofence</h3>
            <button
              type="button"
              onClick={useCurrentLocation}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--tt-primary)] transition-colors hover:text-[var(--tt-primary-hover)]"
            >
              <MapPin className="h-3.5 w-3.5" />
              Use current location
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3.5">
            <div>
              <label className={labelClass}>
                Latitude <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <input type="text" inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="19.1136" className={inputClass} />
              {errFor(fieldError, 'latitude') && (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Longitude <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <input type="text" inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="72.8697" className={inputClass} />
              {errFor(fieldError, 'longitude') && (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError?.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Radius (m)</label>
              <input type="number" min={10} max={5000} value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="100" className={inputClass} />
            </div>
          </div>
          <p className="mt-1 text-[11px] text-fg-muted">Employees can only mark attendance within this radius of the location.</p>
        </div>
      </form>
    </Dialog>
  );
}
