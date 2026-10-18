'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cx } from '@/theme/tokens';
import { MOVABLE_STAGES, STAGE_LABELS } from '../../../shared/constants/recruitment.constants';
import type { ApplicationCard, PipelineColumn, Stage } from '../../../shared/types/recruitment.model';
import { ApplicationCardView } from './ApplicationCardView';

interface Props {
  columns: PipelineColumn[];
  canManage: boolean;
  candidatesHref: string;
  onOpen: (card: ApplicationCard) => void;
  onMove: (card: ApplicationCard, to: Stage) => void;
  onReject: (card: ApplicationCard) => void;
}

/**
 * Kanban of active applications. Native HTML5 drag-and-drop between columns;
 * every card also has a "Move to" menu, which is the keyboard and touch path.
 */
export function PipelineBoard({ columns, canManage, candidatesHref, onOpen, onMove, onReject }: Props) {
  const [dragCard, setDragCard] = useState<ApplicationCard | null>(null);
  const [over, setOver] = useState<Stage | null>(null);

  // Always show the fixed stages (assessment only with a test), whatever the payload left out.
  // Assessment is always a column: any test can be sent, not only the position's default one.
  const order = MOVABLE_STAGES;
  const byStage = new Map(columns.map((c) => [c.stage, c]));
  const shown: PipelineColumn[] = order.map((s) => byStage.get(s) || { stage: s, items: [], more: 0 });
  const stages = shown.map((c) => c.stage);

  return (
    <div className="flex h-full min-h-0 gap-3 overflow-x-auto pb-1 tt-scroll-hidden">
      {shown.map((col) => {
        const count = col.items.length + col.more;
        const isOver = over === col.stage && dragCard && dragCard.stage !== col.stage;
        return (
          <section
            key={col.stage}
            aria-label={`${STAGE_LABELS[col.stage]}: ${count}`}
            onDragOver={(e) => {
              if (!dragCard || !canManage) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (over !== col.stage) setOver(col.stage);
            }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === col.stage ? null : o)); }}
            onDrop={(e) => {
              e.preventDefault();
              const card = dragCard;
              setOver(null);
              setDragCard(null);
              if (card && card.stage !== col.stage) onMove(card, col.stage);
            }}
            className={cx(
              'flex min-h-0 w-[272px] shrink-0 flex-col rounded-xl border bg-bg-subtle/60 transition-colors',
              isOver ? 'border-fg border-dashed bg-bg-subtle' : 'border-line'
            )}
          >
            <header className="flex items-center justify-between gap-2 px-3 py-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg">{STAGE_LABELS[col.stage]}</h3>
              <span className="min-w-[22px] rounded-full border border-line bg-surface px-1.5 text-center text-[11px] font-bold tabular-nums text-fg-muted">{count}</span>
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2 tt-scroll-hidden">
              {col.items.length === 0 ? (
                <p className={cx('rounded-lg border border-dashed px-3 py-6 text-center text-[11px]', isOver ? 'border-fg text-fg' : 'border-line text-fg-subtle')}>
                  {isOver ? 'Drop to move here' : 'No candidates'}
                </p>
              ) : (
                col.items.map((card) => (
                  <ApplicationCardView
                    key={card.id}
                    card={card}
                    stages={stages}
                    canManage={canManage}
                    dragging={dragCard?.id === card.id}
                    onOpen={onOpen}
                    onMove={onMove}
                    onReject={onReject}
                    onDragStart={setDragCard}
                    onDragEnd={() => { setDragCard(null); setOver(null); }}
                  />
                ))
              )}
              {col.more > 0 && (
                <Link href={`${candidatesHref}&stage=${col.stage}`} className="block rounded-lg px-2 py-1.5 text-center text-[11px] font-semibold text-fg-muted hover:bg-surface hover:text-fg">
                  +{col.more} more in Candidates
                </Link>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function PipelineSkeleton() {
  return (
    <div className="flex h-full gap-3 overflow-hidden">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="w-[272px] shrink-0 animate-pulse space-y-2 rounded-xl border border-line bg-bg-subtle/60 p-2">
          <div className="h-5 w-24 rounded bg-bg-subtle" />
          {Array.from({ length: 3 - (i % 3) }).map((_, j) => <div key={j} className="h-24 rounded-lg border border-line bg-surface" />)}
        </div>
      ))}
    </div>
  );
}
