'use client';

import { Check, LogOut, RotateCcw } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Alert } from '@/components/ui/Alert';
import { cx, text } from '@/theme/tokens';
import { formatDateTime } from '@/lib/datetime';
import type { DeviceSession, EmployeeDeviceDetail } from '../../types/employeeDevices.model';
import { EVENT_LABELS, platformLabel, timeAgo, webSessionsLabel } from '../../utils/deviceFormat';
import { PlatformIcon, PlatformLabel } from './PlatformLabel';
import { DeviceStatusBadge, PhoneLockTag } from './DeviceStatusBadge';

interface EmployeeDeviceDrawerProps {
  open: boolean;
  detail: EmployeeDeviceDetail | null;
  isLoading: boolean;
  error: string;
  canManage: boolean;
  allowing: boolean;
  loggingOutId: number | null;
  onAllow: () => void;
  onReset: () => void;
  onLogout: (sessionId: number) => void;
  onClose: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{children}</h3>;
}

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

interface SessionListProps {
  sessions: DeviceSession[];
  emptyText: string;
  canManage: boolean;
  loggingOutId: number | null;
  onLogout: (sessionId: number) => void;
}

function SessionList({ sessions, emptyText, canManage, loggingOutId, onLogout }: SessionListProps) {
  if (sessions.length === 0) return <p className="text-xs text-fg-muted">{emptyText}</p>;
  return (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {sessions.map((s) => (
        <li key={s.id} className="flex items-center gap-3 p-3">
          <PlatformIcon platform={s.type === 'web' ? 'web' : 'unknown'} className="h-4 w-4 text-fg-muted" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-fg sm:text-sm">{s.name}</span>
              {s.isRegisteredPhone && (
                <span className="rounded border border-line px-1 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Registered</span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-fg-subtle">
              {s.type === 'web' ? 'Browser' : 'App'}
              {s.ip ? ` · ${s.ip}` : ''} · active {timeAgo(s.lastSeenAt) ?? (s.lastSeenAt ? formatDateTime(s.lastSeenAt) : '—')}
            </div>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => onLogout(s.id)}
              disabled={loggingOutId === s.id}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-50"
            >
              {loggingOutId === s.id ? <Spinner /> : <LogOut className="h-3.5 w-3.5" />}
              Log out
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function DrawerSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-5 w-40 rounded bg-bg-subtle" />
      <div className="h-24 rounded-lg bg-bg-subtle" />
      <div className="h-16 rounded-lg bg-bg-subtle" />
      <div className="h-32 rounded-lg bg-bg-subtle" />
    </div>
  );
}

export function EmployeeDeviceDrawer({
  open,
  detail,
  isLoading,
  error,
  canManage,
  allowing,
  loggingOutId,
  onAllow,
  onReset,
  onLogout,
  onClose,
}: EmployeeDeviceDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Employee device" maxWidthClassName="sm:max-w-lg">
      {error && <Alert message={error} tone="error" />}
      {!detail && isLoading && <DrawerSkeleton />}
      {detail && (
        <div className={cx('space-y-5 transition-opacity', isLoading ? 'opacity-70' : 'opacity-100')}>
          {/* Who */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-bold text-fg">{detail.name}</div>
              <div className={cx(text.caption, 'mt-0.5 text-fg-muted')}>
                {[detail.code, detail.department, detail.phone].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
            <DeviceStatusBadge employee={detail} />
          </div>

          {/* Phone: the only thing the policy limits */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
              <h3 className="text-sm font-bold text-fg">Phone</h3>
              <PhoneLockTag on={detail.singleDevice} />
            </div>

            <p className="text-xs text-fg-muted">
              {detail.singleDevice
                ? 'Their policy allows the app on one phone only. Another phone waits here until you allow it.'
                : 'Their policy lets the app sign in on any phone. The latest phone they used is shown as registered.'}
            </p>

            {/* Waiting phone */}
            {detail.pendingDevice && (
              <div className="rounded-lg border-2 border-fg p-3.5">
                <SectionTitle>Waiting phone</SectionTitle>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-fg text-fg-inverted">
                    <PlatformIcon platform={detail.pendingDevice.platform} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-fg">{detail.pendingDevice.name}</div>
                    <div className="mt-0.5 text-xs text-fg-muted">
                      {platformLabel(detail.pendingDevice.platform)} · tried {timeAgo(detail.pendingDevice.at) ?? formatDateTime(detail.pendingDevice.at)}
                    </div>
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-fg-muted">
                  Allowing it makes this the registered phone and signs {detail.name.split(' ')[0]} out of the app on the old phone. Web sign-ins stay as they are.
                </p>
                {canManage && (
                  <button
                    type="button"
                    onClick={onAllow}
                    disabled={allowing}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:opacity-50 sm:text-sm"
                  >
                    {allowing ? <Spinner /> : <Check className="h-3.5 w-3.5" />}
                    <span>Allow this phone</span>
                  </button>
                )}
              </div>
            )}

            {/* Registered phone */}
            <div>
              <SectionTitle>Registered phone</SectionTitle>
              {detail.device ? (
                <div className="flex items-center gap-3 rounded-lg border border-line p-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-bg-subtle text-fg">
                    <PlatformIcon platform={detail.device.platform} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-fg">{detail.device.name}</div>
                    <div className="mt-0.5 text-xs text-fg-muted">
                      {platformLabel(detail.device.platform)}
                      {detail.device.boundAt ? ` · since ${formatDateTime(detail.device.boundAt)}` : ''}
                    </div>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={onReset}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:border-[var(--tt-danger)] hover:text-[var(--tt-danger)]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </button>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line p-3 text-xs text-fg-muted">
                  No phone registered. The next phone {detail.name.split(' ')[0]} signs in on in the app will be registered.
                </p>
              )}
            </div>

            {/* App sessions on a phone */}
            <div>
              <SectionTitle>Signed in on a phone ({detail.sessions.phone.length})</SectionTitle>
              <SessionList
                sessions={detail.sessions.phone}
                emptyText="Not signed in to the app on any phone."
                canManage={canManage}
                loggingOutId={loggingOutId}
                onLogout={onLogout}
              />
            </div>
          </section>

          {/* Web: never limited, listed so a browser can be signed out */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
              <h3 className="text-sm font-bold text-fg">Web sessions</h3>
              <span className="text-xs text-fg-muted">{webSessionsLabel(detail.sessions.web.length)}</span>
            </div>
            <p className="text-xs text-fg-muted">Web sign-ins are not limited. Log out a browser here if needed.</p>
            <SessionList
              sessions={detail.sessions.web}
              emptyText="Not signed in on any browser."
              canManage={canManage}
              loggingOutId={loggingOutId}
              onLogout={onLogout}
            />
          </section>

          {/* History */}
          <section>
            <SectionTitle>History</SectionTitle>
            {detail.events.length === 0 ? (
              <p className="text-xs text-fg-muted">Nothing yet.</p>
            ) : (
              <ol className="relative space-y-3 border-l border-line pl-4">
                {detail.events.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span
                      className={cx(
                        'absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface',
                        ev.event === 'blocked' ? 'bg-fg-muted' : ev.event === 'registered' || ev.event === 'allowed' ? 'bg-fg' : 'bg-fg-subtle'
                      )}
                    />
                    <div className="text-xs font-semibold text-fg">{EVENT_LABELS[ev.event]}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-fg-muted">
                      {ev.deviceName && <span>{ev.deviceName}</span>}
                      {ev.platform !== 'unknown' && <PlatformLabel platform={ev.platform} className="text-[11px]" />}
                      {ev.actorName && <span>by {ev.actorName}</span>}
                      <span className="text-fg-subtle">{formatDateTime(ev.at)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
