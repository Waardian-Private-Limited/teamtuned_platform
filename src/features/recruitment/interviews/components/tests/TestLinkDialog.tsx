'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/interviews.api';
import { btn } from '../../lib/ui';
import { TestLinkShare } from './TestLinkShare';

type View =
  | { kind: 'loading' }
  | { kind: 'share'; link: string; expiresAt: string | null }
  | { kind: 'renew'; reason: 'unavailable' | 'asked'; email: boolean };

function codeOf(err: unknown): string | undefined {
  const e = err as { data?: { code?: string }; code?: string } | null;
  return e?.data?.code || e?.code;
}

/**
 * An open test's link, any time after it was sent: the same link again (copy / QR / WhatsApp /
 * mail), or a new one when the old one should stop working (optionally emailed again).
 */
export function TestLinkDialog({ attemptId, onClose, onChanged, candidateName, candidatePhone, candidateEmail, testName }: {
  attemptId: number | null;
  onClose: () => void;
  onChanged?: () => void;
  candidateName?: string;
  candidatePhone?: string | null;
  candidateEmail?: string | null;
  testName?: string;
}) {
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (attemptId === null) return;
    let alive = true;
    setView({ kind: 'loading' });
    api.getTestLink(attemptId)
      .then((r) => { if (alive) setView({ kind: 'share', link: r.link, expiresAt: r.expiresAt }); })
      .catch((err) => {
        if (!alive) return;
        if (codeOf(err) === 'RECRUIT_TEST_LINK_UNAVAILABLE') setView({ kind: 'renew', reason: 'unavailable', email: false });
        else { showError(messageOf(err)); onClose(); }
      });
    return () => { alive = false; };
  }, [attemptId, onClose]);

  async function renew(email: boolean) {
    if (attemptId === null) return;
    setBusy(true);
    try {
      const r = await api.renewTestLink(attemptId, email);
      setView({ kind: 'share', link: r.link, expiresAt: r.expiresAt });
      showSuccess(email ? 'New link made and emailed' : 'New link made. The old one no longer works.');
      onChanged?.();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={attemptId !== null}
      onClose={onClose}
      title={view.kind === 'renew' ? 'Get a new link?' : 'Test link'}
      footer={view.kind === 'renew' ? (
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
          <button type="button" onClick={() => renew(view.email)} disabled={busy} className={btn.primary}>Get new link</button>
        </>
      ) : view.kind === 'share' ? (
        <>
          <button type="button" onClick={() => setView({ kind: 'renew', reason: 'asked', email: false })} className={btn.secondary}>
            <RefreshCw className="h-4 w-4" /> New link
          </button>
          <button type="button" onClick={onClose} className={btn.primary}>Done</button>
        </>
      ) : undefined}
    >
      {view.kind === 'loading' && <div className="mx-auto h-48 w-48 animate-pulse rounded-xl bg-bg-subtle" />}
      {view.kind === 'share' && (
        <TestLinkShare link={view.link} expiresAt={view.expiresAt} candidateName={candidateName} candidatePhone={candidatePhone} candidateEmail={candidateEmail} testName={testName} />
      )}
      {view.kind === 'renew' && (
        <div className="space-y-3 text-sm text-fg">
          <p>{view.reason === 'unavailable'
            ? 'This test was sent before links were kept, so its link cannot be shown again. A new link can be made.'
            : 'Make a new link when the old one may have reached the wrong person.'}</p>
          <p className="text-fg-muted">The earlier link stops working. Same questions and expiry; a test already started keeps its timer.</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={view.email} onChange={(e) => setView({ ...view, email: e.target.checked })} />
            Also email the new link to the candidate
          </label>
        </div>
      )}
    </Dialog>
  );
}
