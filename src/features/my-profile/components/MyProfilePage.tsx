'use client';

import { Briefcase, CalendarClock, Clock, Contact, Landmark, MapPin, Phone, UserRound, UsersRound, Info } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMyProfile } from '../hooks/useMyProfile';
import type { MyProfile, RosterDay } from '../types/myProfile.model';
import { ProfileAvatar } from './components/ProfileAvatar';
import { ProfileHeader } from './components/ProfileHeader';
import { Badge, ProfileRows, ProfileSection } from './components/ProfileSection';
import { ProfileSkeleton } from './components/ProfileSkeleton';

function RosterWeek({ days }: { days: RosterDay[] }) {
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Next 7 days</p>
      {days.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-bg px-3 py-2.5">
          <CalendarClock className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Not scheduled yet</p>
            <p className="text-xs text-fg-muted">Your manager hasn&apos;t published this week&apos;s roster.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {days.map((d, i) => (
            <li key={`${d.date}-${i}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div
                className={`flex w-11 shrink-0 flex-col items-center rounded-xl border py-1 ${d.isToday ? 'border-fg bg-fg text-fg-inverted' : 'border-line bg-bg text-fg'}`}
              >
                <span className={`text-[10px] font-bold uppercase ${d.isToday ? '' : 'text-fg-muted'}`}>{d.weekday}</span>
                <span className="text-base font-extrabold leading-tight tabular-nums">{d.day}</span>
              </div>
              <div className="min-w-0">
                <p className={`truncate text-sm font-bold text-fg ${d.isShift ? 'tabular-nums' : ''}`}>{d.title}</p>
                <p className="truncate text-xs text-fg-muted">{[d.when, d.detail].filter(Boolean).join(' · ')}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LeftColumn({ p }: { p: MyProfile }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {p.work.length > 0 && (
        <ProfileSection title="Work" icon={Briefcase}>
          <ProfileRows rows={p.work} />
        </ProfileSection>
      )}
      {p.manager && (
        <ProfileSection title="Reporting manager" icon={UserRound}>
          <div className="flex min-w-0 items-center gap-3">
            <ProfileAvatar name={p.manager.name} initials={p.manager.initials} photoUrl={p.manager.photoUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-fg">{p.manager.name}</p>
              {p.manager.designation && <p className="truncate text-xs text-fg-muted">{p.manager.designation}</p>}
            </div>
            {p.manager.code && <span className="ml-auto"><Badge>{p.manager.code}</Badge></span>}
          </div>
        </ProfileSection>
      )}
      {p.sites.length > 0 && (
        <ProfileSection title="Work locations" icon={MapPin}>
          <ul className="divide-y divide-line">
            {p.sites.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{s.name}</p>
                  {s.place && <p className="truncate text-xs text-fg-muted">{s.place}</p>}
                </div>
                {s.primary && <Badge>Primary</Badge>}
              </li>
            ))}
          </ul>
        </ProfileSection>
      )}
      {p.shift && (
        <ProfileSection title="Shift" icon={Clock}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-sm font-bold text-fg">{p.shift.title || p.shift.type}</p>
            {p.shift.hours && <p className="text-sm font-semibold tabular-nums text-fg">{p.shift.hours}</p>}
          </div>
          {(p.shift.title || p.shift.breakLabel) && (
            <p className="mt-1 text-xs text-fg-muted">{[p.shift.title ? p.shift.type : null, p.shift.breakLabel].filter(Boolean).join(' · ')}</p>
          )}
          {p.shift.roster && <RosterWeek days={p.shift.roster} />}
        </ProfileSection>
      )}
    </div>
  );
}

function RightColumn({ p }: { p: MyProfile }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {p.personal.length > 0 && (
        <ProfileSection title="Personal" icon={Contact}>
          <ProfileRows rows={p.personal} />
        </ProfileSection>
      )}
      {(p.contact.length > 0 || p.addresses.length > 0) && (
        <ProfileSection title="Contact" icon={Phone}>
          <ProfileRows rows={p.contact} />
          {p.addresses.length > 0 && (
            <div className={p.contact.length > 0 ? 'mt-2.5 flex flex-col gap-2.5 border-t border-line pt-2.5' : 'flex flex-col gap-2.5'}>
              {p.addresses.map((a) => (
                <div key={a.label}>
                  <p className="text-xs font-medium text-fg-muted sm:text-sm">{a.label}</p>
                  <p className="break-words text-sm font-semibold text-fg">{a.text}</p>
                </div>
              ))}
            </div>
          )}
        </ProfileSection>
      )}
      {p.emergencyContacts.length > 0 && (
        <ProfileSection title="Emergency contacts" icon={UsersRound}>
          <ul className="divide-y divide-line">
            {p.emergencyContacts.map((c, i) => (
              <li key={`${c.name}-${i}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{c.name}</p>
                  <p className="truncate text-xs text-fg-muted">{[c.relation, c.phone].filter(Boolean).join(' · ')}</p>
                </div>
                {c.primary && <Badge>Primary</Badge>}
              </li>
            ))}
          </ul>
        </ProfileSection>
      )}
      {p.bank.length > 0 && (
        <ProfileSection title="Bank & IDs" icon={Landmark}>
          <ProfileRows rows={p.bank} />
        </ProfileSection>
      )}
    </div>
  );
}

export function MyProfilePage() {
  const { profile, loading, error, retry } = useMyProfile();

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 pb-8">
      {loading && !profile ? (
        <ProfileSkeleton />
      ) : error && !profile ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState
            illustration={{ src: '/vectors/employees.svg', width: 220, height: 160, alt: 'Profile unavailable' }}
            title="Couldn't load your profile"
            description={error}
            action={{ label: 'Try again', onClick: retry }}
          />
        </div>
      ) : profile ? (
        <div className="flex flex-col gap-4 tt-fade-in">
          <ProfileHeader profile={profile} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <LeftColumn p={profile} />
            <RightColumn p={profile} />
          </div>
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-fg-muted">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Something wrong here? Ask HR to update it.
          </p>
        </div>
      ) : null}
    </div>
  );
}
