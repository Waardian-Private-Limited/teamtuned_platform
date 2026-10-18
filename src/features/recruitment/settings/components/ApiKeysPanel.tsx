'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Plus, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, FieldMessage, Section, TextField } from '@/components/ui/FormControls';
import { StatusPill } from '@/components/ui/StatusPill';
import { messageOf } from '@/lib/api/errors';
import { formatDate, formatDayTime } from '@/lib/datetime';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { btn, fieldOf, itemsOf, tdClass, thClass } from '../../interviews/lib/ui';
import { ConfirmDialog } from '../../interviews/lib/ConfirmDialog';
import * as api from '../api/settings.api';

export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      showError('Could not copy. Select the text and copy it manually.');
    }
  }, []);
  return { copied, copy };
}

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<api.ApiKeyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [revoke, setRevoke] = useState<api.ApiKeyDto | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    try {
      setKeys(itemsOf(await api.listApiKeys()));
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmRevoke() {
    if (!revoke) return;
    setRevoking(true);
    try {
      await api.revokeApiKey(revoke.id);
      showSuccess('Key revoked');
      setRevoke(null);
      load();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setRevoking(false);
    }
  }

  return (
    <Section
      title="Careers API keys"
      description="Publishable keys for your own website: they can only read published jobs and submit applications."
      aside={
        <button type="button" onClick={() => setCreateOpen(true)} className={btn.primary}>
          <Plus className="h-3.5 w-3.5" /> Create key
        </button>
      }
    >
      {loading ? (
        <div className="h-24 animate-pulse rounded-lg bg-bg-subtle" />
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong py-8 text-center">
          <KeyRound className="h-6 w-6 text-fg-subtle" />
          <p className="text-sm font-semibold text-fg">No API keys</p>
          <p className="max-w-sm text-xs text-fg-muted">Create a key to list jobs and accept applications on your own website.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line tt-scroll-hidden">
          <table className="w-full min-w-[720px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Key</th>
                <th className={thClass}>Allowed origins</th>
                <th className={thClass}>Last used</th>
                <th className={thClass}>Status</th>
                <th className={cx(thClass, 'text-right')}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className={cx(k.revokedAt && 'opacity-60')}>
                  <td className={tdClass}>
                    <p className="font-semibold">{k.name}</p>
                    <p className="text-[11px] tabular-nums text-fg-muted">Created {formatDate(k.createdAt?.slice(0, 10))}</p>
                  </td>
                  <td className={cx(tdClass, 'font-mono text-xs')}>{k.prefix}…</td>
                  <td className={tdClass}>
                    {k.allowedOrigins && k.allowedOrigins.length > 0 ? (
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {k.allowedOrigins.map((o) => <span key={o} className="rounded border border-line bg-bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-fg">{o}</span>)}
                      </div>
                    ) : (
                      <span className="text-xs text-fg-muted">Any origin</span>
                    )}
                  </td>
                  <td className={cx(tdClass, 'text-xs tabular-nums text-fg-muted')}>{k.lastUsedAt ? formatDayTime(k.lastUsedAt) : 'Never'}</td>
                  <td className={tdClass}>{k.revokedAt ? <StatusPill label="Revoked" tone="terminated" /> : <StatusPill label="Active" tone="active" />}</td>
                  <td className={cx(tdClass, 'text-right')}>
                    {!k.revokedAt && <button type="button" className={btn.small} onClick={() => setRevoke(k)}>Revoke</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateKeyDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <ConfirmDialog
        open={Boolean(revoke)}
        title="Revoke key"
        body={<>Requests using <span className="font-mono text-fg">{revoke?.prefix}…</span> ({revoke?.name}) will stop working immediately. This cannot be undone.</>}
        confirmLabel="Revoke"
        danger
        busy={revoking}
        onClose={() => setRevoke(null)}
        onConfirm={confirmRevoke}
      />
    </Section>
  );
}

function normalizeOrigin(raw: string): string | null {
  const v = raw.trim().replace(/\/+$/, '');
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.pathname !== '/' && u.pathname !== '') return null;
    return u.origin;
  } catch {
    return null;
  }
}

function CreateKeyDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [originInput, setOriginInput] = useState('');
  const [origins, setOrigins] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ name?: string; origins?: string }>({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const { copied, copy } = useCopy();

  useEffect(() => {
    if (!open) return;
    setName(''); setOriginInput(''); setOrigins([]); setErrors({}); setCreated(null);
  }, [open]);

  function addOrigin() {
    if (!originInput.trim()) return true;
    const o = normalizeOrigin(originInput);
    if (!o) { setErrors((e) => ({ ...e, origins: 'Enter an origin like https://www.example.com (no path)' })); return false; }
    if (!origins.includes(o)) setOrigins((list) => [...list, o]);
    setOriginInput('');
    setErrors((e) => ({ ...e, origins: undefined }));
    return true;
  }

  async function submit() {
    if (!addOrigin()) return;
    const finalOrigins = (() => {
      const o = normalizeOrigin(originInput);
      return o && !origins.includes(o) ? [...origins, o] : origins;
    })();
    if (!name.trim()) { setErrors({ name: 'Name the key, e.g. Company website' }); return; }
    setSaving(true);
    try {
      const res = await api.createApiKey(name.trim(), finalOrigins);
      setCreated(res.key);
      onCreated();
    } catch (err) {
      const f = fieldOf(err);
      if (f === 'name') setErrors({ name: messageOf(err) });
      else if (f === 'allowed_origins') setErrors({ origins: messageOf(err) });
      else showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={created ? 'Copy your key' : 'Create API key'}
      footer={
        created ? (
          <button type="button" onClick={onClose} className={btn.primary}>I have copied it</button>
        ) : (
          <>
            <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
            <button type="button" onClick={submit} disabled={saving} className={btn.primary}>
              {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Create key
            </button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-fg bg-bg-subtle p-2.5">
            <code className="min-w-0 flex-1 break-all font-mono text-xs text-fg sm:text-sm">{created}</code>
            <button type="button" onClick={() => copy('key', created)} className={btn.small} aria-label="Copy key">
              {copied === 'key' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === 'key' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs font-medium text-fg">This is the only time the full key is shown. Store it now; if it is lost, revoke it and create a new one.</p>
          <p className="text-xs text-fg-muted">Send it in the <code className="font-mono">X-Careers-Key</code> header.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <TextField label="Name" required value={name} onChange={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined })); }} error={errors.name} placeholder="Company website" maxLength={120} />
          <div>
            <FieldLabel label="Allowed origins" />
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  value={originInput}
                  onChange={(e) => { setOriginInput(e.target.value); setErrors((x) => ({ ...x, origins: undefined })); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addOrigin(); } }}
                  placeholder="https://www.example.com"
                  aria-invalid={Boolean(errors.origins) || undefined}
                  className={cx(
                    'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-fg outline-none focus:ring-1',
                    errors.origins ? 'border-[var(--tt-danger)] focus:ring-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)] focus:ring-[var(--tt-primary)]'
                  )}
                />
              </div>
              <button type="button" onClick={addOrigin} className={btn.secondary}>Add</button>
            </div>
            <FieldMessage error={errors.origins} hint="Browsers on other sites are refused. Leave empty to allow any origin (server-to-server calls always work)." />
            {origins.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {origins.map((o) => (
                  <span key={o} className="inline-flex items-center gap-1 rounded border border-line bg-bg-subtle py-0.5 pl-1.5 pr-0.5 font-mono text-[11px] text-fg">
                    {o}
                    <button type="button" aria-label={`Remove ${o}`} onClick={() => setOrigins((l) => l.filter((x) => x !== o))} className="rounded p-0.5 text-fg-subtle hover:text-fg">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
