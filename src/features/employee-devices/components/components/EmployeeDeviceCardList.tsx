'use client';

import { cx, text } from '@/theme/tokens';
import { formatDateTime } from '@/lib/datetime';
import type { EmployeeDevice } from '../../types/employeeDevices.model';
import { timeAgo, webSessionsLabel } from '../../utils/deviceFormat';
import { PlatformLabel } from './PlatformLabel';
import { DeviceStatusBadge, PhoneLockTag } from './DeviceStatusBadge';

export function EmployeeDeviceCardList({ employees, onOpen }: { employees: EmployeeDevice[]; onOpen: (employee: EmployeeDevice) => void }) {
  return (
    <>
      {employees.map((employee) => (
        <button
          key={employee.userId}
          type="button"
          onClick={() => onOpen(employee)}
          className="block w-full p-4 text-left transition-colors hover:bg-bg-subtle/50"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-fg">{employee.name}</span>
                <PhoneLockTag on={employee.singleDevice} />
              </div>
              <div className={cx(text.caption, 'mt-0.5 truncate text-fg-muted')}>
                {[employee.code, employee.department].filter(Boolean).join(' · ') || employee.phone || '—'}
              </div>
            </div>
            <DeviceStatusBadge employee={employee} />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {employee.device ? (
              <>
                <span className="font-medium text-fg">{employee.device.name}</span>
                <PlatformLabel platform={employee.device.platform} />
              </>
            ) : (
              <span className="text-fg-subtle">No registered phone</span>
            )}
          </div>

          {employee.pendingDevice && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-fg">
              <span className="text-fg-muted">Waiting:</span>
              <span className="truncate font-medium">{employee.pendingDevice.name}</span>
              <PlatformLabel platform={employee.pendingDevice.platform} />
            </div>
          )}

          <div className="mt-1.5 text-[11px] text-fg-subtle">
            Last seen in app {timeAgo(employee.lastSeenAt) ?? (employee.lastSeenAt ? formatDateTime(employee.lastSeenAt) : 'never')} · {webSessionsLabel(employee.webSessions)}
          </div>
        </button>
      ))}
    </>
  );
}
