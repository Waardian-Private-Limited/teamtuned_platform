'use client';

import { useState } from 'react';
import { History, Smartphone, Monitor } from 'lucide-react';
import { TunerIcon } from '../shared/TunerIcon';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import * as api from '../../api/dc.api';
import { useAsync } from '../../hooks/useAsync';
import { Btn, Labeled, Pill, inputCls } from '../shared/Ui';
import { FormRenderer } from '../renderer/FormRenderer';
import type { FormSchema, Values } from '../../types/dc.types';

export function PreviewDialog({ open, schema, onClose }: { open: boolean; schema: FormSchema; onClose: () => void }) {
  const [device, setDevice] = useState<'phone' | 'desktop'>('phone');
  const [values, setValues] = useState<Values>({});
  return (
    <Dialog open={open} onClose={onClose} title="Preview" maxWidthClassName="max-w-3xl"
      footer={<Btn onClick={onClose}>Close</Btn>}>
      <div className="mb-4 inline-flex overflow-hidden rounded-lg border border-line">
        {([['phone', Smartphone, 'Phone'], ['desktop', Monitor, 'Desktop']] as const).map(([k, I, l]) => (
          <button key={k} type="button" onClick={() => setDevice(k)} className={cx('flex h-9 items-center gap-1.5 px-3 text-xs font-semibold', device === k ? 'bg-fg text-[var(--tt-on-primary)]' : 'bg-surface text-fg-muted')}><I className="h-4 w-4" />{l}</button>
        ))}
      </div>
      <div className={cx('mx-auto rounded-xl border border-line bg-bg-subtle/40 p-4', device === 'phone' ? 'max-w-[380px]' : 'max-w-none')}>
        <FormRenderer schema={schema} values={values} onChange={setValues} />
      </div>
      <p className="mt-3 text-center text-[11px] text-fg-muted">Nothing here is saved. Uploads and location work for people filling the form.</p>
    </Dialog>
  );
}

export function PublishDialog({ open, onClose, onPublish, hasChanges }: { open: boolean; onClose: () => void; onPublish: (note: string) => Promise<void>; hasChanges: boolean }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const go = async () => {
    setBusy(true); setError('');
    try { await onPublish(note); setNote(''); onClose(); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Publish a new version"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} disabled={!hasChanges} onClick={go}>Publish</Btn></>}>
      <p className="mb-4 text-xs text-fg-muted sm:text-sm">Each publish is a new version. Forms already filled keep the version they were filled on. Assignments set to “latest” use the new version from the next run.</p>
      <Labeled label="What changed? (optional)" error={error}>
        <input className={inputCls(Boolean(error))} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Added a helmet check" />
      </Labeled>
    </Dialog>
  );
}

export function VersionsDrawer({ open, formId, currentId, onClose, onRestore }: { open: boolean; formId: number; currentId: number | null; onClose: () => void; onRestore: (versionId: number, no: number) => void }) {
  const { data, loading, error } = useAsync(() => api.formVersions(formId), [formId, open], open);
  const [view, setView] = useState<{ no: number; schema: FormSchema } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const show = async (id: number, no: number) => { setBusy(id); try { const v = await api.formVersion(formId, id); setView({ no, schema: v.schema }); } finally { setBusy(null); } };
  return (
    <>
      <Drawer open={open} onClose={onClose} title="Versions" maxWidthClassName="sm:max-w-md">
        <div className="p-4 sm:p-6">
          {loading && <p className="text-sm text-fg-muted">Loading…</p>}
          {error && <p className="text-sm text-[var(--tt-danger)]">{error}</p>}
          {data && data.items.length === 0 && <p className="text-sm text-fg-muted">Nothing is published yet.</p>}
          <ul className="space-y-2">
            {data?.items.map((v) => (
              <li key={v.id} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-fg">Version {v.version_no}</span>{v.id === currentId && <Pill label="Live" tone="strong" />}</div>
                <p className="mt-0.5 text-[11px] text-fg-muted">{new Date(v.published_at).toLocaleString()} · {v.field_count} fields · {v.submissions} submission{v.submissions === 1 ? '' : 's'}</p>
                {v.note && <p className="mt-1 text-xs text-fg">{v.note}</p>}
                <div className="mt-2 flex gap-2"><Btn busy={busy === v.id} onClick={() => show(v.id, v.version_no)}>View</Btn><Btn icon={<History className="h-4 w-4" />} onClick={() => onRestore(v.id, v.version_no)}>Restore as draft</Btn></div>
              </li>
            ))}
          </ul>
        </div>
      </Drawer>
      <PreviewDialog open={Boolean(view)} schema={view?.schema || { version: 1, fields: [] }} onClose={() => setView(null)} />
    </>
  );
}

export function TunerDialog({ open, onClose, onUse }: { open: boolean; onClose: () => void; onUse: (r: { name: string; description: string; schema: FormSchema }) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const go = async () => {
    setBusy(true); setError('');
    try { onUse(await api.suggestForm(text)); setText(''); onClose(); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Build with Tuner"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} icon={<TunerIcon />} disabled={text.trim().length < 10} onClick={go}>Build form</Btn></>}>
      <p className="mb-3 text-xs text-fg-muted sm:text-sm">Describe what people should collect. Tuner drafts the fields; you edit them before saving. This replaces the fields now on the canvas.</p>
      <Labeled label="What do you want to collect?" error={error}>
        <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Daily site safety audit: PPE check, housekeeping score, photos of any hazard, supervisor sign-off" className={cx(inputCls(Boolean(error)), 'h-auto py-2')} />
      </Labeled>
    </Dialog>
  );
}
