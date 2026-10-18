import {
  ArrowRight, CalendarCheck, CalendarClock, CalendarX, CircleDot, ClipboardCheck, FileSignature, FileText, Mail,
  MessageSquare, RotateCcw, Send, Star, UserCheck, UserPlus, UserRound, XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatDateTime } from '@/lib/datetime';
import {
  INTERVIEW_MODE_LABELS, OFFER_STATUS_LABELS, RECOMMENDATION_LABELS, STAGE_LABELS, TEST_RESULT_LABELS,
} from '../../constants/recruitment.constants';
import type { InterviewMode, Recommendation, Stage, TimelineEvent } from '../../types/recruitment.model';
import { EmptyTab } from './parts';

const EMAIL_LABELS: Record<string, string> = {
  rejected: 'rejection',
  application_received: 'application received',
  applicationReceived: 'application received',
  testInvite: 'test invite',
  offerSent: 'offer letter',
  onboardingInvite: 'onboarding invite',
  interviewScheduled: 'interview invite',
  interviewUpdated: 'interview update',
  interviewCancelled: 'interview cancelled',
};

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const stage = (v: unknown) => STAGE_LABELS[v as Stage] || s(v);

function describe(e: TimelineEvent): { icon: LucideIcon; title: string; body?: string } {
  const d = e.data;
  switch (e.type) {
    case 'applied':
    case 'created':
      return { icon: UserPlus, title: d.source === 'manual' ? 'Added by recruiter' : 'Applied' };
    case 'stage_changed':
    case 'stage':
      return { icon: ArrowRight, title: `Moved ${d.from ? `from ${stage(d.from)} ` : ''}to ${stage(d.to ?? d.stage)}` };
    case 'rejected':
      return { icon: XCircle, title: 'Rejected', body: s(d.reason) };
    case 'reopened':
      return { icon: RotateCcw, title: 'Reopened' };
    case 'withdrawn':
      return { icon: XCircle, title: 'Withdrawn' };
    case 'note':
      return { icon: MessageSquare, title: 'Note', body: s(d.text) };
    case 'rating':
    case 'rated':
    case 'rating_changed': {
      const r = d.to ?? d.rating;
      return { icon: Star, title: r ? `Rated ${s(r)} / 5` : 'Rating cleared' };
    }
    case 'owner':
    case 'owner_changed': {
      const name = d.ownerName ?? d.toName ?? d.name;
      return { icon: UserRound, title: name ? `Owner set to ${s(name)}` : d.to ? 'Owner changed' : 'Owner cleared' };
    }
    case 'referrer_changed':
      return { icon: UserRound, title: d.toName ? `Referred by ${s(d.toName)}` : 'Referrer removed' };
    case 'email_sent':
    case 'email':
      return { icon: Mail, title: `Email sent${d.template || d.kind ? ` · ${EMAIL_LABELS[s(d.template ?? d.kind)] || s(d.template ?? d.kind).replace(/_/g, ' ')}` : ''}`, body: d.to ? s(d.to) : undefined };
    case 'test_sent':
      return { icon: Send, title: `Assessment sent${d.testName ? ` · ${s(d.testName)}` : ''}` };
    case 'test_started':
      return { icon: ClipboardCheck, title: 'Assessment started' };
    case 'test_submitted':
      return { icon: ClipboardCheck, title: 'Assessment submitted' };
    case 'test_reviewed':
    case 'test_result':
      return { icon: ClipboardCheck, title: `Assessment ${TEST_RESULT_LABELS[s(d.result)]?.toLowerCase() || 'reviewed'}${d.scorePercent !== undefined ? ` · ${s(d.scorePercent)}%` : ''}` };
    case 'test_cancelled':
      return { icon: XCircle, title: 'Assessment cancelled' };
    case 'interview_scheduled':
      return {
        icon: CalendarClock,
        title: `Interview scheduled${d.roundName ? ` · ${s(d.roundName)}` : ''}`,
        body: [d.scheduledAt ? formatDateTime(s(d.scheduledAt)) : '', INTERVIEW_MODE_LABELS[d.mode as InterviewMode] || ''].filter(Boolean).join(' · '),
      };
    case 'interview_updated':
    case 'interview_rescheduled':
      return { icon: CalendarClock, title: `Interview updated${d.roundName ? ` · ${s(d.roundName)}` : ''}`, body: d.scheduledAt ? formatDateTime(s(d.scheduledAt)) : undefined };
    case 'interview_cancelled':
      return { icon: CalendarX, title: `Interview cancelled${d.roundName ? ` · ${s(d.roundName)}` : ''}`, body: s(d.reason) };
    case 'interview_completed':
      return { icon: CalendarCheck, title: `Interview ${d.status === 'no_show' ? 'marked no-show' : 'completed'}${d.roundName ? ` · ${s(d.roundName)}` : ''}` };
    case 'scorecard_submitted':
    case 'scorecard':
      return {
        icon: ClipboardCheck,
        title: `Scorecard${d.name || d.employeeName ? ` from ${s(d.name ?? d.employeeName)}` : ''}`,
        body: [RECOMMENDATION_LABELS[d.recommendation as Recommendation], d.rating ? `${s(d.rating)}/5` : ''].filter(Boolean).join(' · '),
      };
    case 'offer_created':
    case 'offer_drafted':
      return { icon: FileSignature, title: 'Offer drafted' };
    case 'offer_status':
    case 'offer_updated':
      return { icon: FileSignature, title: `Offer ${(OFFER_STATUS_LABELS[s(d.status)] || s(d.status)).toLowerCase()}` };
    case 'offer_submitted':
      return { icon: FileSignature, title: 'Offer submitted for approval' };
    case 'offer_approved':
      return { icon: FileSignature, title: 'Offer approved' };
    case 'offer_expired':
      return { icon: FileSignature, title: 'Offer expired' };
    case 'interview_feedback_complete':
      return { icon: ClipboardCheck, title: `All scorecards in${d.roundName ? ` · ${s(d.roundName)}` : ''}` };
    case 'offer_sent':
      return { icon: Send, title: d.offline ? 'Offer shared outside TeamTuned' : d.resent ? 'Offer emailed again' : 'Offer emailed', body: d.reference ? s(d.reference) : undefined };
    case 'offer_accepted':
      return { icon: FileSignature, title: d.offline ? 'Offer accepted (recorded by HR)' : 'Offer accepted', body: d.signatureName ? `Signed as ${s(d.signatureName)}` : [d.signedCopy ? `Signed copy: ${s(d.signedCopy)}` : '', s(d.note)].filter(Boolean).join(' · ') };
    case 'review_requested': {
      const names = Array.isArray(d.reviewers) ? (d.reviewers as Array<{ name?: string }>).map((r) => r.name).filter(Boolean).join(', ') : '';
      return { icon: UserCheck, title: `Review requested${names ? ` from ${names}` : ''}`, body: s(d.message) };
    }
    case 'review_decided':
      return {
        icon: UserCheck,
        title: `${s(d.reviewer) || 'Reviewer'}: ${({ offer: 'make an offer', reject: 'do not hire', hold: 'hold' } as Record<string, string>)[s(d.decision)] || s(d.decision)}${d.offline ? ' (outside TeamTuned)' : ''}`,
        body: s(d.note),
      };
    case 'review_cancelled':
      return { icon: XCircle, title: `Review request cancelled${d.reviewer ? ` · ${s(d.reviewer)}` : ''}` };
    case 'offer_signed_copy':
      return { icon: FileSignature, title: d.replaced ? 'Signed copy replaced' : 'Signed copy uploaded', body: s(d.name) };
    case 'offer_declined':
      return { icon: FileSignature, title: d.offline ? 'Offer declined (recorded by HR)' : 'Offer declined', body: s(d.note) };
    case 'offer_withdrawn':
      return { icon: FileSignature, title: 'Offer withdrawn' };
    case 'hired':
      return { icon: UserCheck, title: 'Hired', body: d.employeeCode ? `Employee ${s(d.employeeCode)}` : undefined };
    case 'resume':
    case 'resume_uploaded':
      return { icon: FileText, title: 'Resume updated' };
    default:
      return { icon: CircleDot, title: e.type.replace(/_/g, ' ').replace(/^\w/, (m) => m.toUpperCase()) };
  }
}

export function TimelineTab({ events }: { events: TimelineEvent[] }) {
  if (!events.length) return <EmptyTab title="No activity yet" />;
  const sorted = [...events].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <ol className="relative space-y-4 pl-1">
      {sorted.map((e, i) => {
        const { icon: Icon, title, body } = describe(e);
        return (
          <li key={e.id} className="relative flex gap-3">
            {i < sorted.length - 1 && <span aria-hidden className="absolute left-[13px] top-7 h-[calc(100%-4px)] w-px bg-line" />}
            <span className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
              <Icon className="h-3.5 w-3.5 text-fg" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-fg">{title}</p>
              {body && <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-fg-muted">{body}</p>}
              <p className="mt-0.5 text-[11px] text-fg-subtle">
                {e.actorName ? `${e.actorName} · ` : ''}{formatDateTime(e.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
