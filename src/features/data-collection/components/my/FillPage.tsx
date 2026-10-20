'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/dc.api';
import { useAsync } from '../../hooks/useAsync';
import type { Errors, Values } from '../../types/dc.types';
import { newUuid, validate } from '../../utils/schema';
import { Btn, Card, Pill, Skeleton } from '../shared/Ui';
import { FormRenderer } from '../renderer/FormRenderer';
import { useDevicePosition } from '../renderer/SystemFields';


/** Fills one run (kind "run") or one open form (kind "open"). Drafts save on the server after a pause so the form can be finished on another device. */
export function FillPage({ kind, id, basePath }: { kind: 'run' | 'open'; id: number; basePath: string }) {
  const router = useRouter();
  const where = useDevicePosition();
  const { data, loading, error } = useAsync(() => (kind === 'run' ? api.myRun(id) : api.myOpenForm(id)), [kind, id]);
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string>('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const started = useRef(false);
  const touched = useRef(false);
  const uuid = useRef(newUuid());
  const key = kind === 'run' ? `run:${id}` : `open:${id}`;
  const versionId = data ? (kind === 'run' ? data.run!.form_version_id : data.form!.version_id) : 0;
  const flags = data ? (kind === 'run' ? data.run!.flags : data.form!.flags) : {};
  const title = data ? (kind === 'run' ? data.run!.title : data.form!.title) : '';

  useEffect(() => {
    if (!data || started.current) return;
    started.current = true;
    setValues(data.previous?.values || data.draft?.values || {});
  }, [data]);

  // Draft autosave: one request after the person pauses typing.
  useEffect(() => {
    if (!touched.current || !versionId) return undefined;
    const t = setTimeout(() => { api.putDraft(key, versionId, values).then(() => setSaved(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))).catch(() => undefined); }, 1500);
    return () => clearTimeout(t);
  }, [values, key, versionId]);

  const upload = useCallback((f: File | Blob) => api.uploadAttachment(f), []);

  const submit = async () => {
    if (!data) return;
    const local = validate(data.schema.fields, values);
    setErrors(local);
    if (Object.keys(local).length) { showError('Fix the highlighted fields'); return; }
    setBusy(true);
    try {
      if (flags.require_location && !where.geo) { showError(where.error || 'Waiting for your location'); where.retry(); return; }
      await api.submitForm({ ...(kind === 'run' ? { run_id: id } : { assignment_id: id }), client_uuid: uuid.current, values, geo: where.geo, captured_at: new Date().toISOString() });
      showSuccess('Sent');
      router.push(`${basePath}/my`);
    } catch (e) {
      const server = (e instanceof ApiError ? (e.data as { details?: { errors?: Errors } })?.details?.errors : undefined);
      if (server) { setErrors(server); showError('Fix the highlighted fields'); } else showError(messageOf(e));
    } finally { setBusy(false); }
  };

  const back = () => (touched.current ? setConfirm({ title: 'Leave this form?', cta: 'Leave', body: 'What you typed is saved as a draft. You can finish it later.', run: () => router.push(`${basePath}/my`) }) : router.push(`${basePath}/my`));

  if (loading && !data) return <div className="mx-auto max-w-2xl space-y-3 p-4"><Skeleton className="h-10" /><Skeleton className="h-96" /></div>;
  if (error || !data) return <div className="mx-auto max-w-2xl p-6 text-sm text-[var(--tt-danger)]">{error || 'This form is not available'}</div>;
  const locked = kind === 'run' && ['submitted', 'in_review', 'approved', 'rejected', 'cancelled'].includes(data.run!.display);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <button type="button" aria-label="Back" onClick={back} className="rounded-lg p-2 text-fg-muted hover:bg-bg-subtle"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1"><h1 className="truncate text-base font-bold text-fg sm:text-lg">{title}</h1><p className="truncate text-xs text-fg-muted">{kind === 'run' ? `${data.run!.site_name || ''} · due ${new Date(data.run!.due_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'Fill any time'}{saved ? ` · draft saved ${saved}` : ''}</p></div>
        {data.run?.display === 'overdue' && <Pill label="Overdue" tone="bad" />}
      </div>
      {data.previous?.review_note && <p className="mb-3 rounded-lg border border-[var(--tt-danger)]/30 bg-[var(--tt-danger-soft)] px-3 py-2 text-xs text-fg"><span className="font-semibold">Sent back: </span>{data.previous.review_note}</p>}
      <Card>
        <FormRenderer schema={data.schema} values={values} onChange={(v) => { touched.current = true; setValues(v); }} errors={errors} env={{ upload, readOnly: locked }}
 />
        {where.error && !where.geo && <p className="mt-2 text-xs text-[var(--tt-danger)]">{where.error} · <button type="button" onClick={where.retry} className="font-semibold underline">Retry</button></p>}
      </Card>
      <div className="sticky bottom-0 -mx-4 mt-4 flex justify-end gap-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-b-xl">
        <Btn onClick={back}>Cancel</Btn>
        <Btn variant="primary" busy={busy} disabled={locked} icon={<Send className="h-4 w-4" />} onClick={submit}>{data.previous ? 'Send again' : 'Submit'}</Btn>
      </div>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
