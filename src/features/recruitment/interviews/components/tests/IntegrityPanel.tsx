'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { formatDateTime } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import type { IntegrityDto, RiskLevel, TestQuestionDto } from '../../types/interviews.dto';
import { RISK_META, SEVERITY_COLOR, eventDetail, eventLabel, formatMs, formatOffset, riskOf, toNum, EVENT_TONE } from './attemptFormat';

/** Low / Medium / High with a tone dot and border; monochrome text. */
export function RiskBadge({ risk, score, size = 'md' }: { risk: RiskLevel; score?: number | null; size?: 'sm' | 'md' }) {
  const meta = RISK_META[risk];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md border font-semibold text-fg',
        size === 'sm' ? 'h-5 px-1.5 text-[10px]' : 'h-7 px-2.5 text-xs'
      )}
      style={{ borderColor: meta.color }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
      {meta.label} risk
      {score !== null && score !== undefined && <span className="font-normal tabular-nums text-fg-muted">· {Math.round(score)}/100</span>}
    </span>
  );
}

const SEVERITY_ICON = { info: Info, warn: AlertTriangle, high: ShieldAlert } as const;

const COUNTERS: Array<{ key: keyof NonNullable<IntegrityDto['counters']>; label: string; ms?: boolean; bool?: boolean }> = [
  { key: 'tabSwitches', label: 'Tab switches' },
  { key: 'awayMs', label: 'Time away', ms: true },
  { key: 'blurs', label: 'Window blurs' },
  { key: 'fullscreenExits', label: 'Full screen exits' },
  { key: 'copies', label: 'Copy' },
  { key: 'pastes', label: 'Paste' },
  { key: 'contextMenus', label: 'Right-clicks' },
  { key: 'prints', label: 'Prints' },
  { key: 'shortcutsBlocked', label: 'Blocked shortcuts' },
  { key: 'resumes', label: 'Resumes' },
  { key: 'ipChanges', label: 'IP changes' },
  { key: 'deviceChanges', label: 'Device changes' },
  { key: 'multiScreen', label: 'Multi-screen', bool: true },
  { key: 'devtools', label: 'Dev tools' },
  { key: 'offline', label: 'Offline' },
];

const EVENTS_PREVIEW = 40;

export function IntegrityPanel({
  integrity,
  questions,
  startedAt,
  qKey,
}: {
  integrity: IntegrityDto | null | undefined;
  questions: TestQuestionDto[];
  startedAt: string | null | undefined;
  qKey: (q: TestQuestionDto, i: number) => string;
}) {
  const [showViews, setShowViews] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const qNumber = useMemo(() => {
    const m = new Map<string, number>();
    questions.forEach((q, i) => m.set(qKey(q, i), i + 1));
    return m;
  }, [questions, qKey]);

  const startMs = useMemo(() => {
    const t = new Date(integrity?.timing?.startedAt || startedAt || '').getTime();
    return Number.isNaN(t) ? null : t;
  }, [integrity?.timing?.startedAt, startedAt]);

  const events = useMemo(() => {
    const list = (integrity?.events || []).filter((e) => e && typeof e.type === 'string');
    return list
      .map((e) => {
        const at = new Date(e.at || e.receivedAt || '').getTime();
        return { ...e, ms: Number.isNaN(at) ? null : at };
      })
      .sort((a, b) => (a.ms ?? 0) - (b.ms ?? 0));
  }, [integrity?.events]);

  if (!integrity) {
    return (
      <div className="rounded-xl border border-dashed border-line p-6 text-center">
        <p className="text-sm font-semibold text-fg">No integrity data</p>
        <p className="mt-1 text-xs text-fg-muted">This attempt was taken before monitoring was turned on, or has not started yet.</p>
      </div>
    );
  }

  const risk = riskOf(integrity.risk);
  const score = toNum(integrity.score);
  const reasons = integrity.reasons || [];
  const c = integrity.counters || {};
  const net = integrity.network || {};
  const timing = integrity.timing || {};
  const visible = events.filter((e) => showViews || e.type !== 'question_view');
  const shown = showAll ? visible : visible.slice(0, EVENTS_PREVIEW);
  const hiddenViews = events.length - events.filter((e) => e.type !== 'question_view').length;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Integrity</p>
            <div className="mt-1.5">{risk ? <RiskBadge risk={risk} score={score} /> : <span className="text-sm text-fg-muted">Not scored yet</span>}</div>
          </div>
          {score !== null && (
            <div className="w-full max-w-[220px] flex-1">
              <div className="flex items-baseline justify-between text-xs text-fg-muted">
                <span>Clean score</span>
                <span className="text-lg font-bold tabular-nums text-fg">{Math.round(score)}<span className="text-xs font-normal text-fg-muted">/100</span></span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-subtle" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: risk ? RISK_META[risk].color : 'var(--tt-fg)' }} />
              </div>
            </div>
          )}
        </div>
        {integrity.autoSubmitted && (
          <p className="mt-3 rounded-lg border border-line bg-bg-subtle px-3 py-2 text-xs text-fg">
            {integrity.autoSubmitted === 'tab_switches'
              ? 'Submitted automatically: the candidate left the test more times than allowed.'
              : integrity.autoSubmitted === 'deadline'
                ? 'Submitted automatically when time ran out.'
                : `Submitted automatically (${integrity.autoSubmitted}).`}
          </p>
        )}
        {reasons.length > 0 ? (
          <ul className="mt-3 space-y-1.5" aria-label="Why this risk">
            {reasons.map((r, i) => {
              const sev = r.severity === 'high' || r.severity === 'warn' ? r.severity : 'info';
              const Icon = SEVERITY_ICON[sev];
              return (
                <li key={`${r.code}-${i}`} className="flex items-start gap-2 text-sm text-fg">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: SEVERITY_COLOR[sev] }} aria-hidden="true" />
                  <span className="min-w-0">
                    {r.label || r.code}
                    <span className="sr-only"> ({sev === 'high' ? 'high' : sev === 'warn' ? 'warning' : 'info'})</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          risk && <p className="mt-3 text-xs text-fg-muted">Nothing unusual was recorded.</p>
        )}
        <p className="mt-3 text-[11px] text-fg-subtle">Browser signals can be faked or caused innocently; treat them as evidence to look into, not proof.</p>
      </section>

      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Activity</h4>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          {COUNTERS.map(({ key, label, ms, bool }) => {
            const raw = c[key];
            let value: string;
            let flagged = false;
            if (bool) {
              const n = typeof raw === 'boolean' ? (raw ? 1 : 0) : toNum(raw);
              value = n === null ? '—' : n > 0 ? 'Yes' : 'No';
              flagged = Boolean(n && n > 0);
            } else if (ms) {
              value = formatMs(toNum(raw));
              flagged = (toNum(raw) ?? 0) > 0;
            } else {
              const n = toNum(raw);
              value = n === null ? '—' : String(n);
              flagged = (n ?? 0) > 0;
            }
            if (key === 'pastes') {
              const blocked = toNum(c.pasteBlocked);
              if (blocked) value = `${value} · ${blocked} blocked`;
            }
            return (
              <div key={key} className="bg-surface px-3 py-2.5">
                <dt className="text-[11px] text-fg-muted">{label}</dt>
                <dd className={cx('mt-0.5 text-sm font-semibold tabular-nums', flagged ? 'text-fg' : 'text-fg-subtle')}>{value}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-3.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Network & device</h4>
          <dl className="mt-2 space-y-1.5 text-xs">
            <Row label="Start IP" value={net.startIp} />
            <Row label="Last IP" value={net.lastIp} changed={Boolean(net.startIp && net.lastIp && net.startIp !== net.lastIp)} />
            <Row label="Start device" value={net.startDevice} />
            <Row label="Last device" value={net.lastDevice} changed={Boolean(net.startDevice && net.lastDevice && net.startDevice !== net.lastDevice)} />
          </dl>
        </div>
        <div className="rounded-xl border border-line p-3.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Timing</h4>
          <dl className="mt-2 space-y-1.5 text-xs">
            <Row label="Started" value={timing.startedAt ? formatDateTime(timing.startedAt) : null} />
            <Row label="Submitted" value={timing.submittedAt ? formatDateTime(timing.submittedAt) : null} />
            <Row label="Duration" value={toNum(timing.durationMs) !== null ? formatMs(timing.durationMs) : null} />
            <Row label="Answered too fast" value={toNum(timing.fastAnswers) !== null ? String(timing.fastAnswers) : null} changed={(toNum(timing.fastAnswers) ?? 0) > 0} />
          </dl>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Timeline</h4>
          {hiddenViews > 0 && (
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-fg-muted">
              <input type="checkbox" checked={showViews} onChange={(e) => setShowViews(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--tt-primary)]" />
              Show question views ({hiddenViews})
            </label>
          )}
        </div>
        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-fg-muted">No events recorded.</p>
        ) : (
          <ol className="divide-y divide-line/70 rounded-xl border border-line">
            {shown.map((e, i) => {
              const qn = e.questionId !== null && e.questionId !== undefined ? qNumber.get(String(e.questionId)) : undefined;
              const detail = eventDetail(e.type, e.data);
              const tone = EVENT_TONE[e.type];
              return (
                <li key={i} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                  <span className="w-14 shrink-0 font-mono tabular-nums text-fg-muted">
                    {startMs !== null && e.ms !== null ? `+${formatOffset(e.ms - startMs)}` : '—'}
                  </span>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone ?? 'var(--tt-fg-subtle)' }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-fg">
                    {eventLabel(e.type)}
                    {detail && <span className="text-fg-muted"> · {detail}</span>}
                  </span>
                  {qn !== undefined && <span className="shrink-0 rounded border border-line px-1 text-[10px] font-semibold tabular-nums text-fg-muted">Q{qn}</span>}
                </li>
              );
            })}
          </ol>
        )}
        {visible.length > EVENTS_PREVIEW && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 text-xs font-semibold text-fg underline-offset-4 hover:underline">
            {showAll ? 'Show fewer' : `Show all ${visible.length} events`}
          </button>
        )}
      </section>
    </div>
  );
}

function Row({ label, value, changed }: { label: string; value: string | null | undefined; changed?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-fg-muted">{label}</dt>
      <dd className={cx('min-w-0 truncate text-right tabular-nums', changed ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg')} title={value || undefined}>
        {value || '—'}
        {changed && <span className="sr-only"> (changed)</span>}
      </dd>
    </div>
  );
}
