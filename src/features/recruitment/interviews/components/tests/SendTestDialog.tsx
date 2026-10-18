'use client';

import { useEffect, useState } from 'react';
import { Clock, FileCheck2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../../api/interviews.api';
import type { TestListItemDto } from '../../types/interviews.dto';
import { btn, fieldOf, itemsOf } from '../../lib/ui';
import { TestLinkShare } from './TestLinkShare';

export interface SendTestDialogProps {
  open: boolean;
  onClose: () => void;
  applicationId: number;
  candidateName?: string;
  /** For sharing the link by hand (WhatsApp / mail) once sent. */
  candidatePhone?: string | null;
  candidateEmail?: string | null;
  /** Preselects the position's assessment test. */
  defaultTestId?: number | null;
  /** When `defaultTestId` is not given, the position's test is looked up from here. */
  positionId?: number | null;
  onDone?: () => void;
  /** Set when the dialog opens from moving a candidate to Assessment: adds "Move without a test". */
  onSkip?: () => void;
}

export function SendTestDialog({ open, onClose, applicationId, candidateName, candidatePhone, candidateEmail, defaultTestId: givenTestId, positionId, onDone, onSkip }: SendTestDialogProps) {
  const [positionTestId, setPositionTestId] = useState<number | null>(null);
  const defaultTestId = givenTestId ?? positionTestId;

  useEffect(() => {
    if (!open || givenTestId !== undefined || !positionId) return;
    let alive = true;
    api.getPosition(positionId).then((p) => { if (alive) setPositionTestId(p.testId ?? null); }).catch(() => {});
    return () => { alive = false; };
  }, [open, givenTestId, positionId]);

  const [tests, setTests] = useState<TestListItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  // After sending: the link to hand over directly, in case the email does not reach them.
  const [sent, setSent] = useState<{ link: string; expiresAt: string | null; testName: string } | null>(null);

  useEffect(() => { if (open) setSent(null); }, [open]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError('');
    setLoading(true);
    api.listTests({ status: 'active' })
      .then((res) => {
        if (!alive) return;
        const list = itemsOf(res).filter((t) => t.status !== 'archived');
        setTests(list);
        setSelected(list.some((t) => t.id === defaultTestId) ? (defaultTestId as number) : list[0]?.id ?? null);
      })
      .catch((err) => { if (alive) showError(messageOf(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, defaultTestId]);

  async function send() {
    if (!selected) { setError('Choose a test'); return; }
    setSending(true);
    try {
      const res = await api.sendTest(applicationId, selected);
      showSuccess('Test sent. The candidate has 72 hours to take it.');
      onDone?.();
      if (res?.link) setSent({ link: res.link, expiresAt: res.expiresAt ?? null, testName: tests.find((t) => t.id === selected)?.name || '' });
      else onClose();
    } catch (err) {
      if (fieldOf(err) === 'test_id') setError(messageOf(err));
      else showError(messageOf(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-base font-semibold text-fg sm:text-lg">{sent ? 'Assessment sent' : 'Send assessment'}</h2>
          {candidateName && <p className="text-xs text-fg-muted">{candidateName}</p>}
        </div>
      }
      footer={sent ? (
        <button type="button" onClick={onClose} className={btn.primary}>Done</button>
      ) : (
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
          {onSkip && (
            <button type="button" onClick={() => { onSkip(); onClose(); }} disabled={sending} className={btn.secondary}>Move without a test</button>
          )}
          <button type="button" onClick={send} disabled={sending || loading || tests.length === 0} className={btn.primary}>
            {sending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Send test
          </button>
        </>
      )}
    >
      {sent ? (
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">An email with this link is on its way to {candidateName || 'the candidate'}. If it does not reach them, share the link or let them scan the QR.</p>
          <TestLinkShare link={sent.link} candidateName={candidateName} candidatePhone={candidatePhone} candidateEmail={candidateEmail} testName={sent.testName} expiresAt={sent.expiresAt} />
        </div>
      ) : 
      loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-bg-subtle" />)}
        </div>
      ) : tests.length === 0 ? (
        <p className="py-6 text-center text-sm text-fg-muted">No active tests. Create one in Recruitment settings → Tests.</p>
      ) : (
        <div className="space-y-3">
          <div role="radiogroup" aria-label="Test" className={cx('space-y-2 rounded-lg', error && 'ring-1 ring-[var(--tt-danger)]')}>
            {tests.map((t) => {
              const active = selected === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => { setSelected(t.id); setError(''); }}
                  className={cx(
                    'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    active ? 'border-fg bg-bg-subtle ring-1 ring-fg' : 'border-line hover:bg-bg-subtle'
                  )}
                >
                  <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{t.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tabular-nums text-fg-muted">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{t.durationMinutes} min</span>
                      <span>Pass {t.passPercent}%</span>
                      <span>
                        {t.questionCount ? `${t.questionCount} of ${t.totalQuestions ?? '—'} questions` : `${t.totalQuestions ?? 0} questions`}
                      </span>
                    </span>
                  </span>
                  {defaultTestId === t.id && <span className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">Position test</span>}
                </button>
              );
            })}
          </div>
          {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
          <p className="text-xs text-fg-muted">The candidate gets an email link. They take the test once, timed by the server; the link expires in 72 hours.</p>
        </div>
      )}
    </Dialog>
  );
}
