'use client';

import { CalendarClock, ClipboardCheck, FileSignature, GripVertical, MessageSquare, MoreHorizontal } from 'lucide-react';
import { formatDate, formatDayTime, orgDateOf } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import {
  MOVABLE_STAGES, OFFER_STATUS_LABELS, RECOMMENDATION_LABELS, STAGE_LABELS, TEST_RESULT_LABELS, TEST_STATUS_LABELS,
} from '../../../shared/constants/recruitment.constants';
import { ActionMenu, type ActionMenuEntry } from '../../../shared/components/ActionMenu';
import { CandidateAvatar } from '../../../shared/components/CandidateAvatar';
import { RatingStars } from '../../../shared/components/RatingStars';
import type { ApplicationCard, Recommendation, Stage } from '../../../shared/types/recruitment.model';

function Chip({ icon: Icon, children, strong }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; strong?: boolean }) {
  return (
    <span className={cx(
      'inline-flex h-5 max-w-full items-center gap-1 truncate rounded border px-1.5 text-[10px] font-semibold',
      strong ? 'border-fg bg-fg text-fg-inverted' : 'border-line bg-bg-subtle text-fg-muted'
    )}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

interface Props {
  card: ApplicationCard;
  stages: Stage[];
  canManage: boolean;
  dragging: boolean;
  onOpen: (card: ApplicationCard) => void;
  onMove: (card: ApplicationCard, to: Stage) => void;
  onReject: (card: ApplicationCard) => void;
  onDragStart: (card: ApplicationCard) => void;
  onDragEnd: () => void;
}

export function ApplicationCardView({ card, stages, canManage, dragging, onOpen, onMove, onReject, onDragStart, onDragEnd }: Props) {
  const targets = stages.filter((s) => (MOVABLE_STAGES as readonly Stage[]).includes(s));
  const menu: ActionMenuEntry[] = [
    { key: 'h', heading: 'Move to' },
    ...targets.map((s) => ({ key: s, label: STAGE_LABELS[s], checked: s === card.stage, disabled: s === card.stage, onSelect: () => onMove(card, s) })),
    { key: 'd', divider: true },
    { key: 'open', label: 'Open profile', onSelect: () => onOpen(card) },
    { key: 'reject', label: 'Reject…', danger: true, onSelect: () => onReject(card) },
  ];
  const fb = card.feedback;
  const subtitle = [card.candidate.currentTitle, card.candidate.currentCompany].filter(Boolean).join(' · ');

  return (
    <article
      draggable={canManage}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(card.id));
        onDragStart(card);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(card)}
      className={cx(
        'group relative cursor-pointer rounded-lg border border-line bg-surface p-2.5 shadow-xs transition-all hover:border-line-strong',
        canManage && 'active:cursor-grabbing',
        dragging && 'opacity-40'
      )}
    >
      <div className="flex items-start gap-2">
        {canManage && <GripVertical aria-hidden className="mt-1.5 h-3.5 w-3.5 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />}
        <CandidateAvatar name={card.candidate.name} size="sm" />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(card); }}
            className="block max-w-full truncate text-left text-[13px] font-semibold text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]"
          >
            {card.candidate.name}
          </button>
          {subtitle && <p className="truncate text-[11px] text-fg-muted">{subtitle}</p>}
        </div>
        {canManage && (
          <ActionMenu
            label={`Actions for ${card.candidate.name}`}
            items={menu}
            triggerClassName="-mr-1 -mt-0.5 inline-flex rounded p-1 text-fg-subtle hover:bg-bg-subtle hover:text-fg"
          >
            <MoreHorizontal className="h-4 w-4" />
          </ActionMenu>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {card.nextInterview && <Chip icon={CalendarClock}>{formatDayTime(card.nextInterview.at)}{card.nextInterview.roundName ? ` · ${card.nextInterview.roundName}` : ''}</Chip>}
        {card.test && (
          <Chip icon={ClipboardCheck} strong={card.test.result === 'passed'}>
            {card.test.result ? TEST_RESULT_LABELS[card.test.result] || card.test.result : TEST_STATUS_LABELS[card.test.status] || card.test.status}
            {card.test.scorePercent !== null ? ` ${card.test.scorePercent}%` : ''}
          </Chip>
        )}
        {card.offer && <Chip icon={FileSignature} strong={card.offer.status === 'accepted'}>{OFFER_STATUS_LABELS[card.offer.status] || card.offer.status}</Chip>}
        {fb && fb.total > 0 && (
          <Chip icon={MessageSquare}>
            <span className="tabular-nums">{fb.submitted}/{fb.total}</span>
            {fb.recommendation ? ` · ${RECOMMENDATION_LABELS[fb.recommendation as Recommendation] || fb.recommendation}` : ''}
          </Chip>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <RatingStars value={card.rating} size="sm" />
        <span className="text-[10px] text-fg-subtle">{card.appliedAt ? formatDate(orgDateOf(card.appliedAt), 'short') : ''}</span>
      </div>
    </article>
  );
}
