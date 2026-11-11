'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightLeft, FileText, Linkedin, Mail, MessageCircle, Phone, PhoneCall, StickyNote, UserPlus, Upload } from 'lucide-react';
import { Combobox } from '@/components/ui/Combobox';
import { Drawer } from '@/components/ui/Drawer';
import { Chip, FieldLabel, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { messageOf } from '@/lib/api/errors';
import { addDays, formatDate, formatDayTime, orgDateOf, orgToday } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../../shared/api/recruitment.api';
import { CandidateAvatar } from '../../shared/components/CandidateAvatar';
import { ResumeViewer } from '../../shared/components/ResumeViewer';
import { SOURCE_LABELS, STAGE_LABELS } from '../../shared/constants/recruitment.constants';
import { useRecruitmentBase } from '../../shared/hooks/useRecruitmentBase';
import { toPaged, toPosition } from '../../shared/types/recruitment.mapper';
import { serverFieldOf } from '../../shared/utils/errors';
import { getPoolPerson, logActivity, moveToPosition } from '../api/pool.api';
import { CALL_OUTCOMES, LEAD_STATUS_LABELS } from '../constants/pool.constants';
import type { LeadStatus, PoolActivity, PoolPerson } from '../types/pool.types';
import { FollowUp, LeadStatusBadge } from './PoolTable';

/** wa.me wants country code + number; a bare 10-digit Indian mobile gets +91. */
const whatsapp = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

const ACTIVITY_ICON = { added: UserPlus, imported: Upload, called: PhoneCall, note: StickyNote, moved: ArrowRightLeft } as const;

function activityText(a: PoolActivity) {
  if (a.kind === 'moved') return `Moved to ${a.position?.name || 'a position'}`;
  if (a.kind === 'imported') return 'Imported';
  if (a.kind === 'added') return a.leadStatus ? `Added as ${LEAD_STATUS_LABELS[a.leadStatus].toLowerCase()}` : 'Added';
  if (a.leadStatus) return LEAD_STATUS_LABELS[a.leadStatus];
  return 'Note';
}

const QUICK_DAYS = [{ label: 'Tomorrow', days: 1 }, { label: 'In 3 days', days: 3 }, { label: 'Next week', days: 7 }];

/** Log a call: an outcome and/or a note, and when to follow up. */
function CallLog({ person, onSaved }: { person: PoolPerson; onSaved: (p: PoolPerson) => void }) {
  const [status, setStatus] = useState<LeadStatus | null>(null);
  const [note, setNote] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [errors, setErrors] = useState<{ note?: string; follow_up_on?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!status && !note.trim()) { setErrors({ note: 'Choose how the call went or write a note' }); return; }
    if (status === 'call_back' && !followUp) { setErrors({ follow_up_on: 'Pick when to call back' }); return; }
    setSaving(true);
    try {
      const res = await logActivity(person.candidate.id, {
        ...(status ? { status } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(followUp ? { follow_up_on: followUp } : {}),
      });
      setStatus(null); setNote(''); setFollowUp(''); setErrors({});
      showSuccess('Saved');
      onSaved(res);
    } catch (err) {
      const f = serverFieldOf(err);
      setErrors(f === 'note' || f === 'follow_up_on' ? { [f]: messageOf(err) } : { form: messageOf(err) });
    } finally {
      setSaving(false);
    }
  };

  const closing = status === 'not_interested';
  return (
    <section className="rounded-xl border border-line p-3 sm:p-4">
      <h3 className="mb-2.5 text-sm font-bold text-fg">Log a call</h3>
      <div className="flex flex-wrap gap-1.5">
        {CALL_OUTCOMES.map((s) => <Chip key={s} active={status === s} onClick={() => { setStatus(status === s ? null : s); setErrors({}); }}>{LEAD_STATUS_LABELS[s]}</Chip>)}
      </div>
      {!closing && (
        <div className="mt-3">
          <FieldLabel label="Follow up on" required={status === 'call_back'} />
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_DAYS.map((q) => {
              const d = addDays(orgToday(), q.days);
              return <Chip key={q.label} active={followUp === d} onClick={() => { setFollowUp(followUp === d ? '' : d); setErrors({}); }}>{q.label}</Chip>;
            })}
            <div className="w-40"><TextField label="" aria-label="Follow-up date" type="date" value={followUp} onChange={(v) => { setFollowUp(v); setErrors({}); }} error={errors.follow_up_on} /></div>
          </div>
        </div>
      )}
      <div className="mt-3">
        <Textarea label="Note" value={note} onChange={(e) => { setNote(e.target.value); setErrors({}); }} error={errors.note} rows={2} maxLength={1000} placeholder="What they said, expected salary, availability…" />
      </div>
      {errors.form && <p role="alert" className="mt-2 text-xs font-medium text-[var(--tt-danger)]">{errors.form}</p>}
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:opacity-50">
          {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          Save
        </button>
      </div>
    </section>
  );
}

/** Picks an open position and puts the person into its pipeline. */
function MoveToPosition({ person, onMoved }: { person: PoolPerson; onMoved: () => void }) {
  const base = useRecruitmentBase();
  const [options, setOptions] = useState<Array<{ value: number; label: string; description?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [moved, setMoved] = useState<{ id: number; title: string } | null>(null);
  const taken = new Set(person.applications.map((a) => a.position?.id));

  const search = useCallback((term: string) => {
    setLoading(true);
    api.listPositions({ search: term, pageSize: 50 })
      .then((dto) => setOptions(toPaged(dto, toPosition).items
        .filter((p) => !['closed', 'filled'].includes(p.status) && !taken.has(p.id))
        .map((p) => ({ value: p.id, label: p.title, description: [p.department?.name, p.status].filter(Boolean).join(' · ') }))))
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person.applications.length]);
  useEffect(() => { search(''); }, [search]);

  const move = async () => {
    if (!positionId) { setError('Choose a position'); return; }
    setMoving(true);
    try {
      const res = await moveToPosition(person.candidate.id, { position_id: positionId });
      setMoved({ id: res.positionId, title: res.positionTitle });
      setPositionId(null);
      showSuccess(`Added to ${res.positionTitle}`);
      onMoved();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setMoving(false);
    }
  };

  return (
    <section className="rounded-xl border border-line p-3 sm:p-4">
      <h3 className="mb-1 text-sm font-bold text-fg">Move to candidates</h3>
      <p className="mb-2.5 text-xs text-fg-muted">Pick a position: they join its pipeline at Applied, show under Candidates, and this lead is marked Moved to candidates.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="min-w-0 flex-1">
          <Combobox options={options} value={positionId} onChange={(v) => { setPositionId(v === null ? null : Number(v)); setError(null); }}
            onSearch={search} loading={loading} placeholder="Choose a position" searchPlaceholder="Search positions…" emptyLabel="No open positions" invalid={Boolean(error)} ariaLabel="Position" />
        </div>
        <button type="button" onClick={move} disabled={moving} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-fg hover:bg-bg-subtle disabled:opacity-50">
          {moving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <ArrowRightLeft className="h-4 w-4" />}
          Move
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      {moved && (
        <p className="mt-2 text-xs text-fg-muted">
          In <Link href={`${base}/positions/${moved.id}`} className="font-semibold text-fg underline">{moved.title}</Link> now.
        </p>
      )}
    </section>
  );
}

/** One pool person: contact, call log, move to a position, applications and history. */
export function PoolDrawer({ candidateId, canManage, onClose, onChanged }: {
  candidateId: number | null;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const base = useRecruitmentBase();
  const [person, setPerson] = useState<PoolPerson | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!candidateId) return;
    getPoolPerson(candidateId).then((p) => { setPerson(p); setError(null); }).catch((e) => setError(messageOf(e)));
  }, [candidateId]);
  useEffect(() => { setPerson(null); setError(null); load(); }, [load]);

  const c = person?.candidate;
  const [showResume, setShowResume] = useState(false);
  useEffect(() => { setShowResume(false); }, [candidateId]);
  const changed = (p?: PoolPerson) => { if (p) setPerson(p); else load(); onChanged(); };

  return (
    <Drawer open={Boolean(candidateId)} onClose={onClose} title={c?.name || 'Talent pool'} maxWidthClassName="sm:max-w-xl">
      {error && <p className="text-sm text-[var(--tt-danger)]">{error}</p>}
      {!person && !error && <div className="space-y-3 animate-pulse"><div className="h-16 rounded-xl bg-bg-subtle" /><div className="h-40 rounded-xl bg-bg-subtle" /></div>}
      {person && c && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <CandidateAvatar name={c.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-fg">{c.name}</p>
              <p className="truncate text-xs text-fg-muted">{[c.currentTitle, c.currentCompany].filter(Boolean).join(' · ') || 'No current role'}</p>
              <p className="mt-0.5 truncate text-xs text-fg-muted">
                {[c.totalExperience !== null ? `${c.totalExperience} yrs` : null, c.city, c.leadSource || SOURCE_LABELS[c.source], c.owner ? `Owner ${c.owner.name}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <LeadStatusBadge status={c.leadStatus} />
              <FollowUp item={{ followUpOn: c.followUpOn, leadStatus: c.leadStatus }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {c.phone && <a href={`tel:${c.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] sm:text-sm"><Phone className="h-3.5 w-3.5" />{c.phone}</a>}
            {c.phone && <a href={whatsapp(c.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>}
            {c.email && <a href={`mailto:${c.email}`} className="inline-flex h-9 min-w-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{c.email}</span></a>}
            {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm"><Linkedin className="h-3.5 w-3.5" />LinkedIn</a>}
          </div>
          {c.skills && (
            <div className="flex flex-wrap gap-1">
              {c.skills.split(',').map((s) => s.trim()).filter(Boolean).map((s) => <span key={s} className="rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-fg-muted">{s}</span>)}
            </div>
          )}

          {c.hasResume && (
            <section className="rounded-xl border border-line">
              <button type="button" onClick={() => setShowResume((x) => !x)} aria-expanded={showResume} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-bold text-fg sm:px-4">
                <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4 text-fg-muted" />Resume</span>
                <span className="text-xs font-semibold text-fg-muted">{showResume ? 'Hide' : 'Show'}</span>
              </button>
              {showResume && <div className="border-t border-line p-2"><ResumeViewer candidateId={c.id} className="h-[60vh]" /></div>}
            </section>
          )}

          {canManage && <CallLog person={person} onSaved={(p) => changed(p)} />}
          {canManage && !c.employeeId && <MoveToPosition person={person} onMoved={() => changed()} />}

          {person.applications.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-bold text-fg">Applications</h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {person.applications.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    {a.position ? <Link href={`${base}/positions/${a.position.id}`} className="min-w-0 truncate text-sm font-semibold text-fg hover:underline">{a.position.name}</Link> : <span className="text-sm text-fg-muted">—</span>}
                    <span className="shrink-0 text-xs capitalize text-fg-muted">{a.status === 'active' ? STAGE_LABELS[a.stage] : a.status}{a.appliedAt ? ` · ${formatDate(orgDateOf(a.appliedAt))}` : ''}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-bold text-fg">History</h3>
            {person.activities.length === 0 ? (
              <p className="text-xs text-fg-muted">Nothing logged yet.</p>
            ) : (
              <ol className="relative ml-2 border-l border-line">
                {person.activities.map((a) => {
                  const Icon = ACTIVITY_ICON[a.kind] || StickyNote;
                  return (
                    <li key={a.id} className="mb-3 ml-4 last:mb-0">
                      <span className="absolute -left-[9px] flex h-[18px] w-[18px] items-center justify-center rounded-full border border-line bg-surface"><Icon className="h-2.5 w-2.5 text-fg-muted" /></span>
                      <p className="text-xs font-semibold text-fg">
                        {activityText(a)}
                        {a.followUpOn && <span className="font-normal text-fg-muted"> · follow up {formatDate(a.followUpOn)}</span>}
                      </p>
                      {a.note && <p className={cx('mt-0.5 whitespace-pre-wrap text-xs text-fg')}>{a.note}</p>}
                      <p className="mt-0.5 text-[11px] text-fg-subtle">{[a.by, a.at ? formatDayTime(a.at) : null].filter(Boolean).join(' · ')}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
