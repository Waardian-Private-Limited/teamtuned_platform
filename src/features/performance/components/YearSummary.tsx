'use client';

import { Lock } from 'lucide-react';
import { SCORE_BASIS_HINT, SCORE_BASIS_LABEL, SECTION_LABEL } from '../constants/perf.constants';
import { fmt } from '../lib';
import type { Band, ReviewView } from '../types/perf.types';
import { Table, td } from './ui';

const SECTIONS = ['kpi', 'competency', 'feedback'] as const;

/** For the final review: every break of the cycle side by side, then how the breaks and the other sections add up to one year-end score and rating. */
export function YearSummary({ view, bandName }: { view: ReviewView; bandName: (bands: Band[] | undefined, code: string | null) => string }) {
  const card = view.scorecard;
  const bands = view.scale?.bands;
  const note = (periodId: number, kind: 'self' | 'manager') => view.checkins.find((c) => c.period_id === periodId && c.kind === kind);
  const parts = SECTIONS.filter((k) => card.section_weights?.[k]);

  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <div>
        <p className="text-xs font-semibold text-fg sm:text-[13px]">Year summary <span className="font-normal text-fg-muted">· {view.periods.length} breaks · {SCORE_BASIS_LABEL[card.basis]}</span></p>
        <p className="mt-0.5 text-[11px] text-fg-muted">{SCORE_BASIS_HINT[card.basis]}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-line">
        <Table minWidth={620} head={[{ label: 'Break' }, { label: 'Goal score', className: 'w-28' }, { label: 'Filled', className: 'w-20' }, { label: 'Employee check-in', className: 'w-40' }, { label: 'Reviewer check-in', className: 'w-40' }]}>
          {view.periods.map((p) => {
            const b = card.breaks.find((x) => x.period_id === p.id);
            const self = note(p.id, 'self');
            const mgr = note(p.id, 'manager');
            return (
              <tr key={p.id}>
                <td className={td}>
                  <span className="inline-flex items-center gap-1 font-semibold">{p.label}{b?.closed && <Lock className="h-3 w-3 text-fg-muted" aria-label="Closed" />}</span>
                  <span className="block text-[11px] text-fg-muted">{p.period_start} to {p.period_end}{p.weight !== null && p.weight !== undefined ? ` · counts ${p.weight}%` : ''}</span>
                </td>
                <td className={td}><span className="font-semibold">{fmt(b?.score ?? null)}</span></td>
                <td className={`${td} text-fg-muted`}>{b && b.score !== null ? `${b.coverage}%` : '—'}</td>
                <td className={`${td} text-fg-muted`} title={self?.comment || undefined}>{self ? (self.rating_code ? bandName(bands, self.rating_code) : 'Note only') : '—'}</td>
                <td className={`${td} text-fg-muted`} title={mgr?.comment || undefined}>{mgr ? (mgr.rating_code ? bandName(bands, mgr.rating_code) : 'Note only') : '—'}</td>
              </tr>
            );
          })}
        </Table>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg">
        {parts.map((k, i) => (
          <span key={k}>{i > 0 && <span className="mr-2 text-fg-muted">+</span>}{SECTION_LABEL[k]} <span className="font-semibold">{fmt(card.sections[k]?.score ?? null)}</span><span className="text-fg-muted"> × {card.section_weights[k]}%</span></span>
        ))}
        <span><span className="mr-2 text-fg-muted">=</span>Year score <span className="font-semibold">{fmt(card.overall.score)}</span>{card.band && <span className="text-fg-muted"> · {card.band.label}</span>}</span>
      </div>
      <p className="text-[11px] text-fg-muted">Check-in ratings are notes for the conversation; they do not change the score. Goal scores per break come from the values entered for that break.</p>
    </div>
  );
}
