'use client';

import Link from 'next/link';
import { Clock3, DoorOpen, FileClock, Hourglass, Inbox, TreePalm } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/datetime';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { KIND_TEXT } from '@/features/my-attendance/constants/regularization.constants';
import * as api from '../api/selfDashboard.api';
import { DashCard, EmptyLine } from './DashCard';

interface Pending {
  key: string;
  icon: LucideIcon;
  kind: string;
  title: string;
  when: string;
  /** The date the request is about, for ordering (soonest first). */
  date: string;
  href: string;
}

const SHOWN = 6;

const range = (from: string, to: string) => (from === to ? formatDate(from, 'medium') : `${formatDate(from, 'medium')} – ${formatDate(to, 'medium')}`);

/**
 * Everything I asked for that is still waiting on someone: leave, attendance corrections and short
 * permissions / gate passes. Each source loads in parallel; one failing still shows the others.
 */
async function loadPending(today: string, tz?: string | null): Promise<{ items: Pending[]; failed: number }> {
  const [leave, regs, perms] = await Promise.allSettled([api.pendingLeave(), api.pendingRegularizations(), api.permissionsAround(today)]);
  const items: Pending[] = [];
  if (leave.status === 'fulfilled') {
    for (const r of leave.value.requests) {
      items.push({ key: `leave-${r.id}`, icon: TreePalm, kind: 'Leave', title: r.leave_type.name, when: `${range(r.start_date, r.end_date)} · ${r.charged_days}d`, date: r.start_date, href: `/employee/leave?request=${r.id}` });
    }
  }
  if (regs.status === 'fulfilled') {
    for (const r of regs.value.regularizations) {
      const what = (r.kinds || []).map((k) => (KIND_TEXT as Record<string, string>)[k] || k.replace(/_/g, ' ')).join(', ');
      items.push({ key: `reg-${r.id}`, icon: FileClock, kind: 'Correction', title: what || 'Attendance correction', when: formatDate(r.date, 'medium'), date: r.date, href: `/employee/my-attendance?date=${r.date}` });
    }
  }
  if (perms.status === 'fulfilled') {
    for (const p of perms.value.permissions.filter((x) => x.state === 'pending')) {
      items.push({
        key: `perm-${p.id}`, icon: p.kind === 'gate_pass' ? DoorOpen : Clock3, kind: p.kind === 'gate_pass' ? 'Gate pass' : 'Permission',
        title: `${formatTime(p.from_at, tz)} – ${formatTime(p.to_at, tz)}`, when: formatDate(p.date, 'medium'), date: p.date, href: `/employee/my-attendance?date=${p.date}`,
      });
    }
  }
  const failed = [leave, regs, perms].filter((r) => r.status === 'rejected').length;
  if (failed === 3) throw (leave as PromiseRejectedResult).reason;
  return { items: items.sort((a, b) => a.date.localeCompare(b.date)), failed };
}

export function RequestsCard({ today, tz }: { today: string; tz?: string | null }) {
  const q = useAsync(() => loadPending(today, tz), [today, tz]);
  const data = q.data;

  return (
    <DashCard
      title="Pending requests"
      subtitle={data ? (data.items.length ? `${data.items.length} waiting for approval` : 'Nothing waiting') : null}
      icon={Hourglass}
      href="/employee/leave"
      hrefLabel="My leave"
      loading={q.loading && !data}
      error={!data ? q.error : ''}
      onRetry={() => void q.refetch()}
    >
      {data && (
        <div className="flex flex-col gap-2">
          {data.items.length === 0 ? (
            <EmptyLine icon={Inbox} title="No pending requests" hint="Leave, corrections and permissions you ask for show here until decided" />
          ) : (
            <ul className="divide-y divide-line">
              {data.items.slice(0, SHOWN).map(({ key, icon: Icon, kind, title, when, href }) => (
                <li key={key}>
                  <Link href={href} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-bg-subtle">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-subtle text-fg"><Icon className="h-4 w-4" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-fg">{title}</span>
                      <span className="block truncate text-xs text-fg-muted">{kind} · {when}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-[var(--tt-warning)]/30 bg-[color-mix(in_srgb,var(--tt-warning)_14%,var(--tt-surface))] px-2 py-0.5 text-[11px] font-semibold text-[var(--tt-warning)]">Pending</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {data.items.length > SHOWN && <p className="text-xs text-fg-muted">+ {data.items.length - SHOWN} more</p>}
          {data.failed > 0 && <p className="text-xs text-[var(--tt-danger)]">Some requests could not be loaded. Refresh to try again.</p>}
        </div>
      )}
    </DashCard>
  );
}
