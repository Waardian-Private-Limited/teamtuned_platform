'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, FileText, Mail, Search } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldLabel, FieldMessage, SelectField, TextField } from '@/components/ui/FormControls';
import { formatDateTime } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { btn, fieldOf } from '@/features/recruitment/interviews/lib/ui';
import * as api from '../../api/documents.api';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { GenerateBody, GenerateFormDto, IssueDto, SubjectDto, SubjectType } from '../../types/documents.dto';
import { saveBlob, safeFileName } from '../../lib/files';
import { PdfFrame } from '../PdfFrame';

const STAGE: Record<string, string> = { applied: 'Applied', screening: 'Screening', assessment: 'Assessment', interview: 'Interview', offer: 'Offer', hired: 'Hired' };

/** Generate a letter for a candidate: pick → template → fill prompts and signatories → download or email. */
export function GeneratePanel({ initialCandidateId = null }: { initialCandidateId?: number | null }) {
  const [type, setType] = useState<SubjectType>(initialCandidateId ? 'candidate' : 'employee');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectId, setSubjectId] = useState<number | null>(initialCandidateId);
  const [picked, setPicked] = useState<SubjectDto | null>(null);
  const [form, setForm] = useState<GenerateFormDto | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [signers, setSigners] = useState<Record<string, number>>({});
  const [stampId, setStampId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issues, setIssues] = useState<IssueDto[]>([]);
  const [busy, setBusy] = useState<'preview' | 'download' | 'email' | null>(null);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [message, setMessage] = useState('');
  const seq = useRef(0);

  // People list: server-side search (debounced) and paging, limited to the caller's companies.
  useEffect(() => {
    const mine = ++seq.current;
    setLoadingSubjects(true);
    const t = setTimeout(() => {
      api.searchSubjects(type, search.trim(), page)
        .then((r) => { if (mine === seq.current) { setSubjects(r.items); setTotal(r.total); setPages(r.pages); } })
        .catch((err) => showError(messageOf(err)))
        .finally(() => { if (mine === seq.current) setLoadingSubjects(false); });
    }, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [type, search, page]);

  const loadIssues = useCallback((id: number) => {
    api.listIssues(type, id).then((r) => setIssues(r.items)).catch(() => setIssues([]));
  }, [type]);

  // Subject chosen: templates; template chosen: its prompts and signatories.
  useEffect(() => {
    if (!subjectId) { setForm(null); setIssues([]); return; }
    let alive = true;
    api.getForm(type, subjectId, templateId)
      .then((f) => {
        if (!alive) return;
        setForm(f);
        if (!templateId) {
          const first = f.templates.find((t) => t.isDefault) || f.templates[0];
          if (first) setTemplateId(first.id);
        }
        setValues(Object.fromEntries((f.inputs || []).map((i) => [i.key, i.value || ''])));
        setSigners(Object.fromEntries((f.slots || []).filter((s) => s.open && f.signatories?.length === 1).map((s) => [s.key, f.signatories![0].id])));
        setStampId(f.stamps?.[0]?.id ?? null);
        setEmailTo(f.subject.email || '');
        setErrors({});
      })
      .catch((err) => showError(messageOf(err)));
    loadIssues(subjectId);
    return () => { alive = false; };
  }, [type, subjectId, templateId, loadIssues]);

  const subject = subjects.find((s) => s.id === subjectId) || picked;
  const typeGroups = useMemo(() => (form?.templates || []).map((t) => ({ value: t.id, label: `${t.docTypeLabel} · ${t.name}${t.isDefault ? ' (default)' : ''}` })), [form]);

  function body(delivery: 'download' | 'email', extra: Partial<GenerateBody> = {}): GenerateBody {
    return { template_id: templateId as number, subject: { type, id: subjectId as number }, inputs: values, signatories: signers, stamp_id: stampId, delivery, ...extra };
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    (form?.inputs || []).forEach((i) => { if (i.required && !String(values[i.key] || '').trim()) e[`inputs.${i.key}`] = `${i.label} is required`; });
    (form?.slots || []).forEach((s) => { if (s.open && !signers[s.key]) e[`signatories.${s.key}`] = 'Pick who signs'; });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onError(err: unknown) {
    const f = fieldOf(err);
    if (f) setErrors((x) => ({ ...x, [f]: messageOf(err) }));
    else showError(messageOf(err));
  }

  async function doPreview() {
    setBusy('preview');
    try { setPreview(await api.generatePdf(body('download', { preview: true }))); } catch (err) { onError(err); } finally { setBusy(null); }
  }

  async function doDownload() {
    if (!validate()) return;
    setBusy('download');
    try {
      const blob = await api.generatePdf(body('download'));
      saveBlob(blob, safeFileName(form?.template?.name, form?.subject.name));
      showSuccess('Letter downloaded');
      loadIssues(subjectId as number);
    } catch (err) { onError(err); } finally { setBusy(null); }
  }

  async function doEmail() {
    if (!validate()) { setEmailOpen(false); return; }
    setBusy('email');
    try {
      const r = await api.generateEmail(body('email', { email_to: emailTo.trim(), message: message.trim() }));
      showSuccess(`Emailed to ${r.to}`);
      setEmailOpen(false);
      setMessage('');
      loadIssues(subjectId as number);
    } catch (err) { onError(err); } finally { setBusy(null); }
  }

  return (
    <div className="grid min-h-0 gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex min-h-[420px] flex-col rounded-xl border border-line bg-surface lg:sticky lg:top-0 lg:max-h-[calc(100dvh-14rem)]">
        <div className="space-y-2.5 border-b border-line p-3">
          <SegmentedControl
            options={[{ value: 'employee', label: 'Employees' }, { value: 'candidate', label: 'Candidates' }] as const}
            value={type}
            onChange={(v) => { setType(v); setPage(1); setSearch(''); setSubjectId(null); setPicked(null); setTemplateId(null); setPreview(null); }}
          />
          <label className="flex h-9 items-center gap-2 rounded-lg border border-line px-2.5 focus-within:border-[var(--tt-primary)]">
            <Search className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={type === 'employee' ? 'Search name, code, email, phone' : 'Search name, email, position'}
              aria-label={type === 'employee' ? 'Search employees' : 'Search candidates'}
              className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
            />
          </label>
        </div>
        <ul className={cx('min-h-0 flex-1 divide-y divide-line/70 overflow-y-auto tt-scroll-hidden', loadingSubjects && 'opacity-70')}>
          {subjects.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => { setSubjectId(s.id); setPicked(s); setTemplateId(null); setPreview(null); }}
                aria-pressed={s.id === subjectId}
                className={cx('flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-bg-subtle', s.id === subjectId && 'bg-bg-subtle')}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-fg">{s.name}</span>
                  {s.type === 'employee' && s.status && s.status !== 'Active' && <span className="shrink-0 rounded border border-line px-1.5 text-[10px] font-semibold text-fg-muted">{s.status}</span>}
                </span>
                <span className="w-full truncate text-xs text-fg-muted">
                  {s.type === 'employee'
                    ? [s.code, s.designation, s.department].filter(Boolean).join(' · ') || s.email || '—'
                    : `${s.positionTitle} · ${STAGE[s.stage || ''] || s.stage}${s.offerStatus ? ` · offer ${s.offerStatus.replace('_', ' ')}` : ''}`}
                </span>
              </button>
            </li>
          ))}
          {!loadingSubjects && subjects.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-fg-muted">
              {search.trim() ? `No ${type} matches “${search.trim()}”.` : `No ${type}s in your companies yet.`}
            </li>
          )}
        </ul>
        {pages > 1 && (
          <div className="border-t border-line px-2 py-1.5">
            <Pagination currentPage={page} totalPages={pages} totalItems={total} pageSize={20} onPageChange={setPage} />
          </div>
        )}
        {pages <= 1 && total > 0 && <p className="border-t border-line px-3 py-2 text-[11px] text-fg-subtle">{total} {type}{total === 1 ? '' : 's'}</p>}
      </aside>

      <section className="min-w-0 rounded-xl border border-line bg-surface p-4">
        {!subjectId || !form ? (
          <EmptyState illustration={{ src: '/vectors/review.svg', width: 200, height: 150, alt: '' }} title="Pick a person" description="Choose an employee or candidate, then the letter, then download or email it." />
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-fg">{form.subject.name}</h2>
              <p className="text-xs text-fg-muted">{[subject?.type === 'employee' ? [subject.code, subject.designation].filter(Boolean).join(' · ') : subject?.positionTitle, form.subject.email].filter(Boolean).join(' · ')}</p>
            </div>

            <SelectField<number> label="Letter" numeric value={templateId} options={typeGroups} onChange={(v) => { setTemplateId(v); setPreview(null); }} placeholder="Choose a letter" />

            {form.inputs && form.inputs.length > 0 && (
              <div>
                <FieldLabel label="Details for this letter" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {form.inputs.map((i) => (
                    <TextField
                      key={i.key}
                      label={i.label}
                      required={i.required}
                      type={i.type === 'date' ? 'date' : i.type === 'number' || i.type === 'money' ? 'number' : 'text'}
                      value={values[i.key] ?? ''}
                      onChange={(v) => { setValues((x) => ({ ...x, [i.key]: v })); setErrors((e) => ({ ...e, [`inputs.${i.key}`]: '' })); }}
                      error={errors[`inputs.${i.key}`] || undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {(form.slots || []).some((s) => s.open) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {(form.slots || []).filter((s) => s.open).map((s) => (
                  <div key={s.key}>
                    <SelectField<number>
                      label={`Signed by (${s.label})`}
                      required
                      numeric
                      value={signers[s.key] ?? null}
                      onChange={(v) => { setSigners((x) => { const n = { ...x }; if (v) n[s.key] = v; else delete n[s.key]; return n; }); setErrors((e) => ({ ...e, [`signatories.${s.key}`]: '' })); }}
                      options={(form.signatories || []).map((p) => ({ value: p.id, label: p.designation ? `${p.name}, ${p.designation}` : p.name }))}
                      placeholder={form.signatories?.length ? 'Choose a signatory' : 'Add one in Signatures & stamps'}
                      error={errors[`signatories.${s.key}`] || undefined}
                    />
                  </div>
                ))}
              </div>
            )}

            {form.usesStamp && (
              <SelectField<number>
                label="Stamp"
                numeric
                value={stampId}
                onChange={setStampId}
                options={(form.stamps || []).map((s) => ({ value: s.id, label: s.name }))}
                placeholder={form.stamps?.length ? 'No stamp' : 'No stamp uploaded'}
              />
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <button type="button" onClick={doPreview} disabled={!templateId || Boolean(busy)} className={btn.secondary}><Eye className="h-4 w-4" /> Preview</button>
              <button type="button" onClick={() => setEmailOpen(true)} disabled={!templateId || Boolean(busy)} className={btn.secondary}><Mail className="h-4 w-4" /> Email</button>
              <button type="button" onClick={doDownload} disabled={!templateId || Boolean(busy)} className={btn.primary}>
                {busy === 'download' ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Download className="h-4 w-4" />} Download
              </button>
            </div>

            {(preview || busy === 'preview') && <PdfFrame blob={preview} loading={busy === 'preview'} title="Letter preview" className="h-[70vh]" />}

            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Letters issued</h3>
              {issues.length === 0 ? (
                <p className="text-xs text-fg-muted">None yet.</p>
              ) : (
                <ul className="divide-y divide-line/70 rounded-lg border border-line">
                  {issues.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-xs">
                      <span className="flex min-w-0 items-center gap-2 font-semibold text-fg"><FileText className="h-3.5 w-3.5 shrink-0 text-fg-muted" />{i.docTypeLabel}{i.reference ? ` · ${i.reference}` : ''}</span>
                      <span className="text-fg-muted">{i.delivery === 'email' ? `Emailed to ${i.emailedTo}` : 'Downloaded'} · {i.issuedBy || 'HR'} · {formatDateTime(i.issuedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={emailOpen}
        onClose={() => busy !== 'email' && setEmailOpen(false)}
        title="Email this letter"
        maxWidthClassName="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setEmailOpen(false)} className={btn.secondary}>Cancel</button>
            <button type="button" onClick={doEmail} disabled={busy === 'email' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo.trim())} className={btn.primary}>
              {busy === 'email' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />} Send
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <TextField label="To" type="email" value={emailTo} onChange={setEmailTo} error={errors.email_to || undefined} />
          <div>
            <FieldLabel label="Message (optional)" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={1000} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tt-primary)]" />
            <FieldMessage hint="The letter is attached as a PDF." />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
