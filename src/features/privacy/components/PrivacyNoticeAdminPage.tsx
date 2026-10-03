'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/privacy.api';
import type { ConsentPurposeDto, PrivacyNoticeAdminResponseDto } from '../types/privacy.dto';

export function PrivacyNoticeAdminPage() {
  const [data, setData] = useState<PrivacyNoticeAdminResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [title, setTitle] = useState('');
  const [bodyMd, setBodyMd] = useState('');
  const [purposes, setPurposes] = useState<ConsentPurposeDto[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getNoticeAdmin();
      setData(res);
      const source = res.draft || res.published;
      setTitle(source?.title || '');
      setBodyMd(source?.bodyMd || '');
      setPurposes(source?.purposes || []);
    } catch (e) {
      showError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await api.saveNoticeDraft({ title, body_md: bodyMd, purposes });
      showSuccess('Draft saved');
      await load();
    } catch (e) {
      showError(messageOf(e));
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await api.publishNoticeDraft();
      showSuccess('Notice published — every user who has not yet accepted it will be asked to.');
      await load();
    } catch (e) {
      showError(messageOf(e));
    } finally {
      setPublishing(false);
    }
  };

  const updatePurpose = (i: number, patch: Partial<ConsentPurposeDto>) => {
    setPurposes((p) => p.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  };

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-bg-subtle" />;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="rounded-xl border border-line bg-surface p-4">
        <h1 className="text-base font-bold text-fg">Privacy Notice</h1>
        <p className="mt-0.5 text-xs text-fg-muted">
          One notice for the whole platform — every organization's employees see this. Publishing a new
          version asks every user who hasn't accepted it to do so on their next login.
          {data?.published ? ` Currently published: v${data.published.version}.` : ' Nothing published yet.'}
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
        <TextField label="Title" value={title} onChange={setTitle} />
        <Textarea label="Notice text" rows={10} value={bodyMd} onChange={(e) => setBodyMd(e.target.value)} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-fg">Purposes</span>
            <button
              type="button"
              onClick={() => setPurposes((p) => [...p, { key: '', label: '', required: false }])}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--tt-primary)] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add purpose
            </button>
          </div>
          <div className="space-y-2">
            {purposes.map((p, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-line p-2">
                <input
                  value={p.key}
                  onChange={(e) => updatePurpose(i, { key: e.target.value })}
                  placeholder="key"
                  className="w-32 rounded-md border border-line bg-bg-subtle px-2 py-1.5 text-xs text-fg"
                />
                <input
                  value={p.label}
                  onChange={(e) => updatePurpose(i, { label: e.target.value })}
                  placeholder="Label shown to the user"
                  className="flex-1 rounded-md border border-line bg-bg-subtle px-2 py-1.5 text-xs text-fg"
                />
                <label className="flex items-center gap-1.5 text-xs text-fg-muted">
                  <input type="checkbox" checked={p.required} onChange={(e) => updatePurpose(i, { required: e.target.checked })} />
                  Required
                </label>
                <button type="button" onClick={() => setPurposes((list) => list.filter((_, idx) => idx !== i))} className="text-fg-muted hover:text-[var(--tt-danger)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={save} loading={saving} loadingLabel="Saving…">Save draft</Button>
          <Button onClick={publish} loading={publishing} loadingLabel="Publishing…" disabled={!data?.draft}>
            Publish{data?.draft ? ` v${data.draft.version}` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
