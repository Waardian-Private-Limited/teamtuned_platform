import { CalendarPlus, MapPin, Phone, Video } from 'lucide-react';
import { formatDateTime } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import {
  INTERVIEW_MODE_LABELS, INTERVIEW_STATUS_LABELS, RECOMMENDATION_LABELS,
} from '../../constants/recruitment.constants';
import type { ApplicationInterview } from '../../types/recruitment.model';
import { RatingStars } from '../RatingStars';
import { CriteriaAverages, CriteriaRatingsList } from '../CriteriaRatings';
import { Chip, EmptyTab, SmallButton } from './parts';

const MODE_ICON = { in_person: MapPin, video: Video, phone: Phone } as const;

function InterviewItem({ interview }: { interview: ApplicationInterview }) {
  const Icon = MODE_ICON[interview.mode];
  const submitted = interview.panel.filter((p) => p.submitted).length;
  const cancelled = interview.status === 'cancelled';
  return (
    <li className={cx('rounded-lg border border-line p-3', cancelled && 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cx('text-sm font-semibold text-fg', cancelled && 'line-through')}>{interview.roundName}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
            <span>{formatDateTime(interview.scheduledAt)}</span>
            <span>·</span>
            <span className="tabular-nums">{interview.durationMinutes} min</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><Icon className="h-3 w-3" />{INTERVIEW_MODE_LABELS[interview.mode]}</span>
          </p>
          {(interview.location || interview.meetingUrl) && (
            <p className="mt-0.5 truncate text-xs text-fg-muted">{interview.location || interview.meetingUrl}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Chip strong={interview.status === 'completed'}>{INTERVIEW_STATUS_LABELS[interview.status] || interview.status}</Chip>
          {interview.panel.length > 0 && (
            <span className="text-[11px] tabular-nums text-fg-muted">{submitted}/{interview.panel.length} scorecards</span>
          )}
        </div>
      </div>
      {cancelled && interview.cancelReason && <p className="mt-2 text-xs text-fg-muted">Reason: {interview.cancelReason}</p>}
      {interview.panel.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-line pt-3">
          {interview.panel.map((p) => (
            <li key={p.employeeId} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-fg">{p.name}</span>
                {p.submitted ? (
                  <span className="flex items-center gap-2">
                    {p.recommendation && (
                      <Chip strong={p.recommendation === 'strong_yes' || p.recommendation === 'yes'}>{RECOMMENDATION_LABELS[p.recommendation]}</Chip>
                    )}
                    {p.rating !== null && <RatingStars value={p.rating} size="sm" />}
                  </span>
                ) : (
                  <span className="text-fg-subtle">Pending</span>
                )}
              </div>
              {p.submitted && <CriteriaRatingsList ratings={p.criteriaRatings} criteria={interview.criteria} className="mt-1.5 pl-0.5" />}
              {p.notes && <p className="mt-1 whitespace-pre-wrap break-words text-fg-muted">{p.notes}</p>}
            </li>
          ))}
        </ul>
      )}
      {interview.criteriaAverages.length > 0 && <CriteriaAverages averages={interview.criteriaAverages} className="mt-3" />}
      {interview.criteria.length > 0 && (
        <p className="mt-2 text-[11px] text-fg-subtle">Rated on {interview.criteria.join(', ')}</p>
      )}
    </li>
  );
}

export function InterviewsTab({ interviews, onSchedule }: { interviews: ApplicationInterview[]; onSchedule?: () => void }) {
  const sorted = [...interviews].sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt));
  const action = onSchedule ? <SmallButton primary icon={CalendarPlus} onClick={onSchedule}>Schedule interview</SmallButton> : undefined;
  if (!sorted.length) return <EmptyTab title="No interviews yet" description="Scheduled rounds and panel scorecards show up here." action={action} />;
  return (
    <div className="space-y-3">
      {action && <div className="flex justify-end">{action}</div>}
      <ul className="space-y-2.5">{sorted.map((i) => <InterviewItem key={i.id} interview={i} />)}</ul>
    </div>
  );
}
