import { Briefcase, CalendarDays, UserRound } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import type { MyProfile } from '../../types/myProfile.model';
import { ProfileAvatar } from './ProfileAvatar';
import { Badge } from './ProfileSection';

function tone(status: string) {
  const s = status.toLowerCase();
  if (s === 'active') return 'active' as const;
  if (s === 'inactive' || s === 'suspended') return 'inactive' as const;
  if (s === 'exited' || s === 'terminated' || s === 'resigned') return 'terminated' as const;
  return 'neutral' as const;
}

function OrgLine({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-5 w-5 shrink-0 rounded-full border border-line object-contain" />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

function Fact({ icon: Icon, label, value, hint }: { icon: typeof Briefcase; label: string; value: string; hint?: string | null }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-fg-muted">{label}</p>
        <p className="truncate text-sm font-bold text-fg sm:text-base">{value}</p>
        {hint && <p className="truncate text-xs text-fg-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function ProfileHeader({ profile }: { profile: MyProfile }) {
  const p = profile;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
          <ProfileAvatar name={p.person.name} initials={p.person.initials} photoUrl={p.person.photoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-extrabold text-fg sm:text-2xl">{p.person.name}</h1>
            {p.designation && <p className="text-sm text-fg-muted">{p.designation}</p>}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {p.code && <Badge>{p.code}</Badge>}
              <StatusPill label={p.status} tone={tone(p.status)} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-medium text-fg-muted sm:justify-start sm:text-sm">
              <OrgLine name={p.organization.name} logoUrl={p.organization.logoUrl} />
              {p.subOrganization && p.subOrganization.name !== p.organization.name && (
                <>
                  <span aria-hidden className="text-fg-subtle">·</span>
                  <OrgLine name={p.subOrganization.name} logoUrl={p.subOrganization.logoUrl} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Fact icon={CalendarDays} label="Joined" value={p.joined?.date ?? '—'} hint={p.joined?.tenure} />
        <Fact icon={Briefcase} label="Department" value={p.department ?? '—'} />
        <Fact icon={UserRound} label="Reporting manager" value={p.manager?.name ?? '—'} hint={p.manager?.designation} />
      </div>
    </div>
  );
}
