'use client';

import { SquarePen } from 'lucide-react';
import { formatDate } from '@/lib/datetime';
import {
  FIELD_RULE_OPTIONS, INTERVIEW_MODE_LABELS, QUESTION_TYPE_LABELS, STANDARD_FIELDS,
} from '../../shared/constants/recruitment.constants';
import { Markdown } from '../../shared/components/Markdown';
import type { PositionDetail } from '../../shared/types/recruitment.model';
import { formatMoneyShort, formatRange, openingsText, positionLocation } from '../../shared/utils/format';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-fg-muted">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-fg-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-fg">{value || <span className="text-fg-subtle">—</span>}</dd>
    </div>
  );
}

const ruleLabel = (r: string) => FIELD_RULE_OPTIONS.find((o) => o.value === r)?.label || r;

export function PositionDetailsView({ position: p, canEdit, onEdit }: { position: PositionDetail; canEdit: boolean; onEdit: () => void }) {
  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg hover:bg-bg-subtle">
            <SquarePen className="h-3.5 w-3.5" />Edit position
          </button>
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Block title="Description"><Markdown source={p.description} emptyLabel="No description yet." /></Block>
          <Block title="Interview plan">
            {p.interviewPlan.length === 0 ? <p className="text-xs text-fg-muted">No rounds defined.</p> : (
              <ol className="space-y-2">
                {p.interviewPlan.map((r, i) => (
                  <li key={r.key} className="flex items-start gap-3 rounded-lg border border-line px-3 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-bold tabular-nums">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg">{r.name}</p>
                      <p className="text-xs text-fg-muted">
                        {INTERVIEW_MODE_LABELS[r.mode]} · <span className="tabular-nums">{r.durationMinutes}</span> min
                        {r.interviewers.length > 0 && ` · ${r.interviewers.map((x) => x.name).join(', ')}`}
                      </p>
                      {r.criteria.length > 0 && <p className="mt-0.5 text-[11px] text-fg-subtle">Rated on {r.criteria.join(', ')}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Block>
          <Block title="Application form">
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_FIELDS.filter((f) => p.form.standard[f.key] !== 'off').map((f) => (
                <span key={f.key} className="inline-flex h-6 items-center rounded-md border border-line bg-bg-subtle px-2 text-[11px] font-medium text-fg">
                  {f.label}<span className="ml-1 text-fg-muted">· {ruleLabel(p.form.standard[f.key])}</span>
                </span>
              ))}
            </div>
            {p.form.questions.length > 0 && (
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-fg">
                {p.form.questions.map((q) => (
                  <li key={q.key}>
                    {q.label} <span className="text-xs text-fg-muted">({QUESTION_TYPE_LABELS[q.type]}{q.required ? ', required' : ''}{q.type === 'choice' && q.options.length ? `: ${q.options.join(' / ')}` : ''})</span>
                  </li>
                ))}
              </ol>
            )}
          </Block>
        </div>
        <div className="space-y-3">
          <Block title="Summary">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-1 xl:grid-cols-2">
              <Row label="Department" value={p.department?.name} />
              <Row label="Role" value={p.role?.name} />
              <Row label="Employment type" value={p.employmentType?.name} />
              <Row label="Location" value={positionLocation(p)} />
              <Row label="Openings" value={<span className="tabular-nums">{openingsText(p.hiredCount, p.openings)}</span>} />
              <Row label="Closes on" value={p.closesOn ? formatDate(p.closesOn) : ''} />
              <Row label="Hiring manager" value={p.hiringManager?.name} />
              <Row label="Recruiter" value={p.recruiter?.name} />
              <Row label="Experience" value={formatRange(p.experienceMin, p.experienceMax, (n) => String(n), ' yrs')} />
              <Row label="Salary (annual)" value={<span className="tabular-nums">{formatRange(p.salaryMin, p.salaryMax, formatMoneyShort)}{p.salaryVisible ? '' : ' · hidden'}</span>} />
              <Row label="Assessment" value={p.test?.name || (p.testId ? `Test #${p.testId}` : 'None')} />
            </dl>
          </Block>
          {p.skills.length > 0 && (
            <Block title="Skills">
              <div className="flex flex-wrap gap-1.5">
                {p.skills.map((s) => <span key={s} className="inline-flex h-6 items-center rounded-md border border-line bg-bg-subtle px-2 text-xs font-medium text-fg">{s}</span>)}
              </div>
            </Block>
          )}
        </div>
      </div>
    </div>
  );
}
