'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Briefcase, FileText, FileUp, Gift, MapPin, Search, X } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldLabel, FieldMessage, TextField } from '@/components/ui/FormControls';
import { Pagination } from '@/components/ui/Pagination';
import { Textarea } from '@/components/ui/Textarea';
import { messageOf } from '@/lib/api/errors';
import { formatDate, orgDateOf } from '@/lib/datetime';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { btn, fieldOf, itemsOf, pageTitle } from '../../interviews/lib/ui';
import * as api from '../api/referrals.api';

type Field = 'positionId' | 'firstName' | 'lastName' | 'email' | 'phone' | 'note' | 'resume';
const SERVER_FIELD: Record<string, Field> = { position_id: 'positionId', first_name: 'firstName', last_name: 'lastName', email: 'email', phone: 'phone', note: 'note', resume: 'resume' };
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS: Record<api.ReferralStatus, { label: string; cls: string }> = {
  in_review: { label: 'In review', cls: 'border-line bg-bg-subtle text-fg-muted' },
  interviewing: { label: 'Interviewing', cls: 'border-line-strong bg-surface text-fg' },
  offered: { label: 'Offered', cls: 'border-fg bg-surface text-fg' },
  hired: { label: 'Hired', cls: 'border-fg bg-fg text-[var(--tt-on-primary)]' },
  not_selected: { label: 'Not selected', cls: 'border-line bg-bg-subtle text-fg-subtle line-through' },
};

const money = (n: number | null | undefined) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (key: string | null) => (key ? `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}` : '');

/** The referrer's own reward, in a few words. */
function rewardLine(w: api.ReferralRewardDto): string {
  const what = w.rewardType === 'cash' ? money(w.amount) : w.description || 'Reward';
  switch (w.status) {
    case 'waiting': return w.eligibleOn ? `${what} due on ${formatDate(w.eligibleOn)}` : `${what} once they join`;
    case 'scheduled': return `${what} with ${monthLabel(w.payoutMonth)} salary`;
    case 'due': return `${what} due now`;
    case 'paid': return `${what} ${w.rewardType === 'cash' ? 'paid' : 'given'}${w.paidOn ? ` on ${formatDate(w.paidOn)}` : ''}`;
    case 'forfeited': return `${what} not payable`;
    default: return `${what} cancelled`;
  }
}

const nameOf = (r: { name?: string } | string | null | undefined) => (typeof r === 'string' ? r : r?.name) || '';

const blank = { firstName: '', lastName: '', email: '', phone: '', note: '' };

export function ReferPage() {
  const [positions, setPositions] = useState<api.ReferralPositionDto[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [positionId, setPositionId] = useState<number | null>(null);
  const [form, setForm] = useState(blank);
  const [resume, setResume] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [program, setProgram] = useState<api.ReferralProgramSummaryDto | null>(null);
  const [mine, setMine] = useState<api.ReferralDto[]>([]);
  const [mineLoading, setMineLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    api.getReferralProgram().then(setProgram).catch(() => setProgram(null));
  }, []);

  async function openTerms() {
    try {
      const { url } = await api.getReferralTermsUrl();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showError(messageOf(err));
    }
  }

  useEffect(() => {
    api.listReferralPositions()
      .then((res) => setPositions(itemsOf(res)))
      .catch((err) => showError(messageOf(err)))
      .finally(() => setPositionsLoading(false));
  }, []);

  const loadMine = useCallback(async () => {
    setMineLoading(true);
    try {
      const res = await api.listMyReferrals(page, 10);
      const list = itemsOf(res);
      setMine(list);
      setTotal(Array.isArray(res) ? list.length : res.total ?? list.length);
      setPages(Array.isArray(res) ? 1 : res.pages ?? 1);
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setMineLoading(false);
    }
  }, [page]);

  useEffect(() => { loadMine(); }, [loadMine]);

  const set = (k: keyof typeof blank, v: string) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  function pickFile(f: File | null) {
    setErrors((e) => ({ ...e, resume: undefined }));
    if (!f) { setResume(null); return; }
    if (!/\.(pdf|docx?)$/i.test(f.name)) { setErrors((e) => ({ ...e, resume: 'Upload a PDF, DOC or DOCX file' })); return; }
    if (f.size > MAX_BYTES) { setErrors((e) => ({ ...e, resume: 'The file is larger than 5 MB' })); return; }
    setResume(f);
  }

  async function submit() {
    const e: Partial<Record<Field, string>> = {};
    if (!positionId) e.positionId = 'Choose a position';
    if (!form.firstName.trim()) e.firstName = 'Enter the first name';
    if (!form.lastName.trim()) e.lastName = 'Enter the last name';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email';
    if (form.phone.trim() && !/^[+\d][\d\s-]{6,19}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await api.createReferral({ positionId: positionId as number, ...form, resume });
      showSuccess('Thanks! Your referral was sent to the hiring team.');
      setForm(blank);
      setResume(null);
      if (fileRef.current) fileRef.current.value = '';
      setPage(1);
      loadMine();
    } catch (err) {
      const f = fieldOf(err);
      const key = f ? SERVER_FIELD[f] : undefined;
      if (key) setErrors({ [key]: messageOf(err) });
      else showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  const q = query.trim().toLowerCase();
  const shown = q ? positions.filter((p) => `${p.title} ${nameOf(p.department)} ${nameOf(p.location)}`.toLowerCase().includes(q)) : positions;
  const selected = positions.find((p) => p.id === positionId) || null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto tt-scroll-hidden">
      <div className="rounded-xl border border-line bg-surface p-3.5 sm:p-4">
        <h1 className={pageTitle}>Refer a candidate</h1>
        <p className="mt-0.5 text-xs text-fg-muted sm:text-sm">Know someone great for an open role? Send them our way — you can follow their progress below.</p>
      </div>

      {program?.enabled && (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-surface p-3.5 sm:p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-bg-subtle text-fg"><Gift className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">
              Earn {program.reward_type === 'cash' ? money(program.amount) : program.description} for every hire you refer
            </p>
            <p className="text-xs text-fg-muted">
              Paid {program.payable_after_days} days after they join{program.reward_type === 'cash' ? (program.payout_mode === 'payroll' ? ', with your salary' : ', by Accounts') : ''}. Some positions pay more.
            </p>
            {program.terms && <p className="mt-2 whitespace-pre-wrap text-xs text-fg-muted">{program.terms}</p>}
          </div>
          {program.has_terms_file && (
            <button type="button" onClick={openTerms} className={btn.secondary}><FileText className="h-3.5 w-3.5" /> Terms</button>
          )}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="flex min-h-0 flex-col rounded-xl border border-line bg-surface">
          <div className="border-b border-line p-3.5">
            <FieldLabel label="Open positions" required />
            <div className={cx('flex h-9 items-center rounded-lg border bg-surface px-2.5 focus-within:ring-1', errors.positionId ? 'border-[var(--tt-danger)] focus-within:ring-[var(--tt-danger)]' : 'border-line focus-within:border-[var(--tt-primary)] focus-within:ring-[var(--tt-primary)]')}>
              <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search positions…" aria-label="Search positions" className="ml-2 w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle focus:ring-0" />
            </div>
            <FieldMessage error={errors.positionId} />
          </div>
          <div role="radiogroup" aria-label="Position" className="max-h-[420px] min-h-[160px] flex-1 overflow-y-auto p-2 tt-scroll-hidden">
            {positionsLoading ? (
              <div className="space-y-2 p-1">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-bg-subtle" />)}</div>
            ) : shown.length === 0 ? (
              positions.length
                ? <EmptyState compact title="No positions match" description="Try another search." />
                : <EmptyState illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }} title="No open positions right now" description="Open roles show here when HR posts them." />
            ) : (
              shown.map((p) => {
                const active = p.id === positionId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => { setPositionId(p.id); setErrors((e) => ({ ...e, positionId: undefined })); }}
                    className={cx('mb-1 flex w-full flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors', active ? 'border-fg bg-bg-subtle ring-1 ring-fg' : 'border-transparent hover:bg-bg-subtle')}
                  >
                    <span className="text-sm font-semibold text-fg">{p.title}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-fg-muted">
                      {nameOf(p.department) && <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{nameOf(p.department)}</span>}
                      {nameOf(p.location) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{nameOf(p.location)}</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-3.5 sm:p-4">
          <h2 className="text-sm font-bold text-fg sm:text-base">Candidate</h2>
          <p className="mb-4 text-xs text-fg-muted">{selected ? <>For <span className="font-semibold text-fg">{selected.title}</span></> : 'Choose a position on the left.'}</p>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="First name" required value={form.firstName} onChange={(v) => set('firstName', v)} error={errors.firstName} maxLength={80} autoComplete="off" />
              <TextField label="Last name" required value={form.lastName} onChange={(v) => set('lastName', v)} error={errors.lastName} maxLength={80} autoComplete="off" />
              <TextField label="Email" required type="email" value={form.email} onChange={(v) => set('email', v)} error={errors.email} maxLength={160} autoComplete="off" />
              <TextField label="Phone" type="tel" value={form.phone} onChange={(v) => set('phone', v)} error={errors.phone} maxLength={20} autoComplete="off" />
            </div>
            <Textarea label="Why are they a good fit?" rows={3} value={form.note} onChange={(e) => set('note', e.target.value)} error={errors.note} maxLength={1000} placeholder="How you know them, what they are great at" />
            <div>
              <FieldLabel label="Resume" />
              <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" id="referral-resume" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
              {resume ? (
                <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                  <FileUp className="h-4 w-4 shrink-0 text-fg-muted" />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{resume.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-fg-muted">{(resume.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button type="button" aria-label="Remove file" onClick={() => { pickFile(null); if (fileRef.current) fileRef.current.value = ''; }} className={btn.icon}><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <label
                  htmlFor="referral-resume"
                  className={cx('flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-fg-muted transition-colors hover:bg-bg-subtle', errors.resume ? 'border-[var(--tt-danger)]' : 'border-line-strong')}
                >
                  <FileUp className="h-4 w-4" /> Upload PDF, DOC or DOCX (max 5 MB)
                </label>
              )}
              <FieldMessage error={errors.resume} />
            </div>
            <div className="flex justify-end pt-1">
              <button type="button" onClick={submit} disabled={saving} className={btn.primary}>
                {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                Send referral
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-3.5 py-3 sm:px-4">
          <h2 className="text-sm font-bold text-fg sm:text-base">My referrals</h2>
          <span className="text-xs tabular-nums text-fg-muted">{total}</span>
        </div>
        {mineLoading && mine.length === 0 ? (
          <div className="space-y-2 p-4">{[0, 1].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-bg-subtle" />)}</div>
        ) : mine.length === 0 ? (
          <EmptyState illustration={{ src: '/vectors/employees.svg', width: 220, height: 160, alt: '' }} title="No referrals yet" description="People you refer appear here with where they are in the process." />
        ) : (
          <>
            <ul className={cx('divide-y divide-line/60', mineLoading && 'opacity-70')}>
              {mine.map((r) => {
                const s = STATUS[r.status] || { label: r.status, cls: 'border-line bg-bg-subtle text-fg-muted' };
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3.5 py-3 sm:px-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg">{r.candidateName}</p>
                      <p className="truncate text-xs text-fg-muted">{r.positionTitle} · <span className="tabular-nums">{formatDate(orgDateOf(r.referredAt))}</span></p>
                      {r.reward && (
                        <p className={cx('mt-0.5 inline-flex items-center gap-1 text-xs font-semibold', ['forfeited', 'cancelled'].includes(r.reward.status) ? 'text-fg-subtle line-through' : 'text-fg')}>
                          <Gift className="h-3 w-3" /> {rewardLine(r.reward)}
                        </p>
                      )}
                    </div>
                    <span className={cx('inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold', s.cls)}>{s.label}</span>
                  </li>
                );
              })}
            </ul>
            {pages > 1 && (
              <div className="border-t border-line px-4 py-2.5">
                <Pagination currentPage={page} totalPages={pages} totalItems={total} pageSize={10} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
