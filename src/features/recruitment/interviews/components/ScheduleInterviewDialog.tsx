'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { FieldLabel, FieldMessage, SelectField, TextField } from '@/components/ui/FormControls';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { orgToday, useOrgTimezone } from '@/lib/datetime';
import * as api from '../api/interviews.api';
import type { InterviewMode, InterviewPanelistDto } from '../types/interviews.dto';
import { DURATION_OPTIONS, INTERVIEW_MODE_OPTIONS } from '../constants/interviews.constants';
import { orgWallToUtcIso, utcToOrgWall } from '../lib/orgTime';
import { btn, fieldOf } from '../lib/ui';
import { EmployeeMultiPicker, type EmployeeLite } from '../lib/EmployeePickers';
import { CriteriaChips } from '../../shared/components/CriteriaChips';
import { useScorecardSetup } from '../../shared/hooks/useScorecardSetup';
import type { ScorecardSetupDto } from '../../shared/types/recruitment.dto';

/** The interview being rescheduled (any object carrying these fields works: list item, drawer interview, …). */
export interface ReschedulableInterview {
  id: number;
  roundKey?: string | null;
  roundName: string;
  mode: string;
  scheduledAt: string;
  durationMinutes: number;
  location?: string | null;
  meetingUrl?: string | null;
  panel?: Array<Pick<InterviewPanelistDto, 'employeeId' | 'name'>>;
  /** §10 — absent on objects that do not carry them; then an edit leaves them unchanged. */
  criteria?: string[];
  shareTests?: boolean;
  shareRounds?: boolean;
}

/** One round of a position's interview plan (wire DTO or the shared InterviewRound model both fit). */
export interface PlanRound {
  key?: string;
  name: string;
  mode?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  interviewers?: Array<{ id: number | null; name: string }>;
  /** §10 rating criteria of the round. */
  criteria?: string[] | null;
}

export interface ScheduleInterviewDialogProps {
  open: boolean;
  onClose: () => void;
  applicationId: number;
  /** The position's interview plan. When omitted and `positionId` is given, the plan is fetched. */
  rounds?: PlanRound[] | null;
  positionId?: number | null;
  /** Pass to reschedule / edit instead of creating. */
  interview?: ReschedulableInterview | null;
  candidateName?: string;
  onDone?: () => void;
  /** Set when opened by moving the candidate to Interview: adds "Move without scheduling". */
  onSkip?: () => void;
}

type FieldKey = 'round' | 'mode' | 'date' | 'time' | 'duration' | 'location' | 'meetingUrl' | 'panel' | 'criteria';
const CUSTOM = '__custom__';

const SERVER_FIELD: Record<string, FieldKey> = {
  round_name: 'round',
  round_key: 'round',
  mode: 'mode',
  scheduled_at: 'date',
  duration_minutes: 'duration',
  location: 'location',
  meeting_url: 'meetingUrl',
  panel_employee_ids: 'panel',
  criteria: 'criteria',
};

function roundKeyOf(r: PlanRound, i: number) {
  return r.key || `round-${i}`;
}

export function ScheduleInterviewDialog({
  open,
  onClose,
  applicationId,
  rounds,
  positionId,
  interview,
  candidateName,
  onDone,
  onSkip,
}: ScheduleInterviewDialogProps) {
  const tz = useOrgTimezone();
  const [plan, setPlan] = useState<PlanRound[]>(rounds || []);
  const [roundChoice, setRoundChoice] = useState<string>(CUSTOM);
  const [customName, setCustomName] = useState('');
  const [mode, setMode] = useState<InterviewMode>('in_person');
  // `now`: the candidate is here (walk-in), the interview starts as it is saved.
  const [when, setWhen] = useState<'now' | 'later'>('later');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(45);
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [panel, setPanel] = useState<EmployeeLite[]>([]);
  const [notify, setNotify] = useState(true);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [shareTests, setShareTests] = useState(false);
  const [shareRounds, setShareRounds] = useState(true);
  // On an edit, criteria / share flags are sent only when known or changed, so a caller object
  // without them never wipes what is stored.
  const [touched, setTouched] = useState({ criteria: false, shareTests: false, shareRounds: false });
  // Criteria library and show / hide / ask for test results and earlier rounds (Recruitment settings).
  const setup = useScorecardSetup(open ? { applicationId } : null);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(interview);

  // Plan: given by the caller, else fetched from the position.
  // Keyed on content, not identity, so a caller passing a fresh array each render does not reset the form.
  const roundsKey = rounds ? JSON.stringify(rounds.map((r) => [r.key, r.name])) : '';
  const roundsRef = useRef(rounds);
  roundsRef.current = rounds;
  useEffect(() => {
    if (!open) return;
    if (roundsRef.current) { setPlan(roundsRef.current); return; }
    if (!positionId) { setPlan([]); return; }
    let alive = true;
    api.getPosition(positionId).then((p) => { if (alive) setPlan((p.interviewPlan || []) as PlanRound[]); }).catch(() => {});
    return () => { alive = false; };
  }, [open, roundsKey, positionId]);

  // Reset the form every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setNotify(true);
    setTouched({ criteria: false, shareTests: false, shareRounds: false });
    if (interview) {
      setCriteria([...(interview.criteria || [])]);
      setShareTests(Boolean(interview.shareTests));
      setShareRounds(interview.shareRounds !== false);
      const wall = utcToOrgWall(interview.scheduledAt, tz);
      setDate(wall.date);
      setTime(wall.time);
      setMode((interview.mode as InterviewMode) || 'video');
      setDuration(interview.durationMinutes || 45);
      setLocation(interview.location || '');
      setMeetingUrl(interview.meetingUrl || '');
      setPanel((interview.panel || []).map((p) => ({ id: p.employeeId, name: p.name })));
      setCustomName(interview.roundName);
      setRoundChoice(CUSTOM);
    } else {
      setDate(orgToday(tz));
      setTime('10:00');
      setWhen('later');
      setMode('in_person');
      setDuration(45);
      setLocation('');
      setMeetingUrl('');
      setPanel([]);
      setCustomName('');
      setRoundChoice(CUSTOM);
      setCriteria([]);
      setShareTests(false);
      setShareRounds(true);
    }
    // Re-run per interview, not per object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, interview?.id, tz]);

  // Once the plan is known, point the round select at the matching (or first) round.
  useEffect(() => {
    if (!open || plan.length === 0) return;
    if (interview) {
      const idx = plan.findIndex((r, i) => (interview.roundKey && roundKeyOf(r, i) === interview.roundKey) || r.name === interview.roundName);
      if (idx >= 0) setRoundChoice(roundKeyOf(plan[idx], idx));
      return;
    }
    applyRound(roundKeyOf(plan[0], 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan]);

  function applyRound(key: string) {
    setRoundChoice(key);
    setErrors((e) => ({ ...e, round: undefined }));
    if (key === CUSTOM) return;
    const idx = plan.findIndex((r, i) => roundKeyOf(r, i) === key);
    const r = plan[idx];
    if (!r || interview) return;
    if (r.mode && ['video', 'in_person', 'phone'].includes(r.mode)) setMode(r.mode as InterviewMode);
    const d = r.durationMinutes ?? r.duration_minutes;
    if (d) setDuration(Number(d));
    const named = (r.interviewers || []).filter((p): p is { id: number; name: string } => typeof p.id === 'number');
    if (named.length) setPanel(named.map((p) => ({ id: p.id, name: p.name })));
    setCriteria(Array.isArray(r.criteria) ? [...r.criteria] : []);
    setErrors((e) => ({ ...e, criteria: undefined }));
  }

  // A custom round (no plan) starts with every criterion from settings, until HR edits the list.
  useEffect(() => {
    if (!open || interview || !setup || touched.criteria || roundChoice !== CUSTOM) return;
    setCriteria(setup.criteria.slice(0, 8).map((c) => c.name));
  }, [open, interview, setup, touched.criteria, roundChoice]);

  const roundOptions = useMemo(
    () => [...plan.map((r, i) => ({ value: roundKeyOf(r, i), label: r.name })), { value: CUSTOM, label: 'Custom round…' }],
    [plan]
  );

  const selectedRound = roundChoice === CUSTOM ? null : plan.find((r, i) => roundKeyOf(r, i) === roundChoice) || null;
  const roundName = selectedRound ? selectedRound.name : customName.trim();

  function validate() {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!roundName) next.round = 'Enter a round name';
    const now = when === 'now' && !isEdit;
    if (!now && !date) next.date = 'Pick a date';
    if (!now && !time) next.time = 'Pick a time';
    if (!duration || duration < 5) next.duration = 'Enter a duration';
    if (mode === 'in_person' && !location.trim()) next.location = 'Enter where the interview happens';
    if (mode === 'video' && meetingUrl.trim() && !/^https?:\/\/\S+$/i.test(meetingUrl.trim())) next.meetingUrl = 'Enter a full link starting with https://';
    if (panel.length === 0) next.panel = 'Add at least one interviewer';
    const iso = now ? new Date().toISOString() : date && time ? orgWallToUtcIso(date, time, tz) : null;
    if (!now && date && time && !iso) next.date = 'Invalid date or time';
    if (!now && !isEdit && iso && Date.parse(iso) < Date.now() - 60000) next.time = 'This time has already passed';
    setErrors(next);
    return Object.keys(next).length === 0 ? iso : null;
  }

  async function submit() {
    const iso = validate();
    if (!iso) return;
    setSaving(true);
    const body = {
      round_key: selectedRound ? roundChoice : null,
      round_name: roundName,
      mode,
      scheduled_at: iso,
      duration_minutes: duration,
      location: mode === 'video' ? null : location.trim() || null,
      meeting_url: mode === 'video' ? meetingUrl.trim() || null : null,
      panel_employee_ids: panel.map((p) => p.id),
      notify_candidate: notify,
      ...(!interview || touched.criteria || interview.criteria !== undefined ? { criteria } : {}),
      ...(!interview || touched.shareTests || interview.shareTests !== undefined ? { share_tests: shareTests } : {}),
      ...(!interview || touched.shareRounds || interview.shareRounds !== undefined ? { share_rounds: shareRounds } : {}),
    };
    try {
      if (interview) await api.updateInterview(interview.id, body);
      else await api.scheduleInterview(applicationId, body);
      showSuccess(isEdit ? 'Interview updated' : when === 'now' ? 'Interview started. The panel can fill the scorecard now.' : 'Interview scheduled');
      onDone?.();
      onClose();
    } catch (err) {
      const f = fieldOf(err);
      const key = f ? SERVER_FIELD[f] : undefined;
      if (key) setErrors({ [key]: messageOf(err) });
      else showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      title={
        <div>
          <h2 className="text-base font-semibold text-fg sm:text-lg">{isEdit ? 'Reschedule interview' : 'Schedule interview'}</h2>
          {candidateName && <p className="text-xs text-fg-muted">{candidateName}</p>}
        </div>
      }
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
          {onSkip && !isEdit && (
            <button type="button" onClick={() => { onSkip(); onClose(); }} disabled={saving} className={btn.secondary}>Move without scheduling</button>
          )}
          <button type="button" onClick={submit} disabled={saving} className={btn.primary}>
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {isEdit ? 'Save changes' : when === 'now' ? 'Start interview' : 'Schedule'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField<string>
            label="Round"
            required
            value={roundChoice}
            options={roundOptions}
            onChange={(v) => applyRound(v ?? CUSTOM)}
            error={roundChoice !== CUSTOM ? errors.round : undefined}
            placeholder="Choose a round"
          />
          {roundChoice === CUSTOM && (
            <TextField
              label="Round name"
              required
              value={customName}
              onChange={(v) => { setCustomName(v); setErrors((e) => ({ ...e, round: undefined })); }}
              error={errors.round}
              placeholder="e.g. Culture fit"
              maxLength={120}
            />
          )}
        </div>

        <div>
          <FieldLabel label="Mode" required />
          <SegmentedControl options={INTERVIEW_MODE_OPTIONS} value={mode} onChange={setMode} />
          <FieldMessage error={errors.mode} />
        </div>

        {!isEdit && (
          <div>
            <FieldLabel label="When" required />
            <SegmentedControl
              options={[{ value: 'later', label: 'Schedule' }, { value: 'now', label: 'Right now (walk-in)' }] as const}
              value={when}
              onChange={(v) => { setWhen(v); setErrors((e) => ({ ...e, date: undefined, time: undefined })); if (v === 'now') setNotify(false); }}
            />
          </div>
        )}

        <div className={cx('grid gap-3', when === 'now' && !isEdit ? 'sm:grid-cols-1' : 'sm:grid-cols-3')}>
          {(when === 'later' || isEdit) && (
          <TextField label="Date" type="date" required value={date} onChange={(v) => { setDate(v); setErrors((e) => ({ ...e, date: undefined })); }} error={errors.date} />
          )}
          {(when === 'later' || isEdit) && (
          <TextField label="Time" type="time" required value={time} onChange={(v) => { setTime(v); setErrors((e) => ({ ...e, time: undefined })); }} error={errors.time} hint={tz} />
          )}
          <SelectField<number>
            label="Duration"
            required
            numeric
            value={duration}
            onChange={(v) => setDuration(v ?? 45)}
            options={Array.from(new Set([...DURATION_OPTIONS, duration])).sort((a, b) => a - b).map((m) => ({ value: m, label: `${m} min` }))}
            error={errors.duration}
          />
        </div>

        {mode === 'video' && (
          <TextField
            label="Meeting link"
            value={meetingUrl}
            onChange={(v) => { setMeetingUrl(v); setErrors((e) => ({ ...e, meetingUrl: undefined })); }}
            error={errors.meetingUrl}
            placeholder="https://meet.google.com/…"
            hint="Shared with the candidate and the panel."
            inputMode="url"
          />
        )}
        {mode !== 'video' && (
          <TextField
            label={mode === 'phone' ? 'Call details' : 'Location'}
            required={mode === 'in_person'}
            value={location}
            onChange={(v) => { setLocation(v); setErrors((e) => ({ ...e, location: undefined })); }}
            error={errors.location}
            placeholder={mode === 'phone' ? 'Optional, e.g. we will call on your registered number' : 'Office address, floor, room'}
            maxLength={255}
          />
        )}

        <div>
          <FieldLabel label="Panel" required />
          <EmployeeMultiPicker value={panel} onChange={(v) => { setPanel(v); setErrors((e) => ({ ...e, panel: undefined })); }} invalid={Boolean(errors.panel)} />
          <FieldMessage error={errors.panel} hint="Interviewers see this in My interviews and submit a scorecard." />
        </div>

        <div>
          <FieldLabel label="Rating criteria" />
          <CriteriaChips
            value={criteria}
            options={setup?.criteria}
            onChange={(v) => { setCriteria(v); setTouched((t) => ({ ...t, criteria: true })); setErrors((e) => ({ ...e, criteria: undefined })); }}
            invalid={Boolean(errors.criteria)}
            ariaLabel="Add a rating criterion"
          />
          <FieldMessage error={errors.criteria} hint="Each interviewer rates these 1–5; optional ones may be skipped. Manage the list in Recruitment settings → Scorecards." />
        </div>

        <PanelShare
          mode={setup?.testsMode}
          subject="the candidate's test results"
          hint="Test name, score and result only. Answers and integrity details stay with HR."
          checked={shareTests}
          onChange={(v) => { setShareTests(v); setTouched((t) => ({ ...t, shareTests: true })); }}
        />
        <PanelShare
          mode={setup?.roundsMode}
          subject="earlier rounds' feedback"
          hint="Other interviewers' recommendations, ratings and notes from earlier rounds."
          checked={shareRounds}
          onChange={(v) => { setShareRounds(v); setTouched((t) => ({ ...t, shareRounds: true })); }}
        />

        <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
          <div>
            <p className="text-xs font-semibold text-fg sm:text-sm">Email the candidate</p>
            <p className="text-[11px] text-fg-muted sm:text-xs">{isEdit ? 'Send the updated time and details.' : 'Send the time and how to join.'}</p>
          </div>
          <Switch checked={notify} onChange={setNotify} label="Email the candidate" />
        </div>
      </div>
    </Dialog>
  );
}

/**
 * One "what the panel sees" choice. The settings decide: show / hide are fixed and only explained;
 * ask (or settings not readable) lets HR switch it for this interview.
 */
function PanelShare({ mode, subject, hint, checked, onChange }: {
  mode: ScorecardSetupDto['testsMode'] | undefined;
  subject: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const title = `Show ${subject} to the panel`;
  if (mode === 'show' || mode === 'hide') {
    return (
      <div className="rounded-lg border border-dashed border-line px-3 py-2.5">
        <p className="text-xs font-semibold text-fg sm:text-sm">The panel {mode === 'show' ? 'always sees' : 'never sees'} {subject}</p>
        <p className="text-[11px] text-fg-muted sm:text-xs">Set in Recruitment settings → Scorecards.</p>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
      <div>
        <p className="text-xs font-semibold text-fg sm:text-sm">{title}</p>
        <p className="text-[11px] text-fg-muted sm:text-xs">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
