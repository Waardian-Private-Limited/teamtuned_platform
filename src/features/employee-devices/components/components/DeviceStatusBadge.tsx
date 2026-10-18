'use client';

import { cx } from '@/theme/tokens';
import type { EmployeeDevice } from '../../types/employeeDevices.model';

// Registered / Waiting for HR / No phone. Waiting is the only state that asks
// for action, so it is the one drawn solid.
export function DeviceStatusBadge({ employee }: { employee: EmployeeDevice }) {
  if (employee.pendingDevice) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--tt-primary)] px-2 py-0.5 text-[11px] font-semibold text-[var(--tt-on-primary)] sm:text-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--tt-on-primary)]" />
        Waiting for HR
      </span>
    );
  }
  const registered = Boolean(employee.device);
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold sm:text-xs',
        registered ? 'border-line-strong bg-surface text-fg' : 'border-line bg-bg-subtle text-fg-muted'
      )}
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', registered ? 'bg-fg' : 'bg-fg-subtle')} />
      {registered ? 'Registered' : 'No phone'}
    </span>
  );
}

// Whether the employee's policy ties the app to one phone. Applies to the app
// on a phone only; web sign-ins are never limited.
export function PhoneLockTag({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide',
        on ? 'border-line-strong text-fg' : 'border-line text-fg-subtle',
        className
      )}
      title={on ? 'Policy allows the app on one phone only' : 'Policy lets the app sign in on any phone'}
    >
      Phone lock {on ? 'on' : 'off'}
    </span>
  );
}
