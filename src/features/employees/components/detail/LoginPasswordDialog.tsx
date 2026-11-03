'use client';

import React from 'react';
import { Copy, Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Chip, TextField } from '@/components/ui/FormControls';
import { fieldErrorsOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { setLoginPassword, type LoginPasswordResult } from '../../api/employees.api';

const btn = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-semibold transition-colors sm:text-sm disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Org admin sets an employee's sign-in password: generated, or typed. Passwords are stored one-way, so an existing
 * one can never be shown; a generated one appears here once to copy and pass on.
 */
export function LoginPasswordDialog({ employeeId, name, onClose }: { employeeId: number; name: string; onClose: () => void }) {
  const [mode, setMode] = React.useState<'generate' | 'type'>('generate');
  const [password, setPassword] = React.useState('');
  const [signOut, setSignOut] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState<LoginPasswordResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await setLoginPassword(employeeId, mode === 'generate' ? { generate: true, signOut } : { password, signOut });
      setResult(r);
      if (!r.password) { showSuccess('Password changed'); onClose(); }
    } catch (e) {
      const f = fieldErrorsOf(e);
      setError(f.fields.password || f.general);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!result?.password) return;
    try { await navigator.clipboard.writeText(result.password); setCopied(true); } catch { setCopied(false); }
  };

  if (result?.password) {
    return (
      <Dialog open onClose={onClose} title="New password" footer={<button type="button" className={`${btn} bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]`} onClick={onClose}>Done</button>}>
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">Give this to {name}. It is shown only now and cannot be seen again.</p>
          {result.login && <p className="text-xs text-fg-muted">Sign in with <span className="font-semibold text-fg">{result.login}</span></p>}
          <div className="flex items-center gap-2 rounded-lg border border-line bg-bg-subtle px-3 py-2.5">
            <code className="flex-1 select-all font-mono text-base font-semibold tracking-wider text-fg">{result.password}</code>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-semibold text-fg hover:bg-bg-subtle">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {result.signed_out && <p className="text-xs text-fg-muted">They were signed out on every device.</p>}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} title="Login password"
      footer={<>
        <button type="button" className={`${btn} border border-line bg-surface text-fg hover:bg-bg-subtle`} onClick={onClose}>Cancel</button>
        <button type="button" disabled={busy || (mode === 'type' && !password)} className={`${btn} bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]`} onClick={submit}>
          {busy ? 'Saving…' : mode === 'generate' ? 'Generate password' : 'Set password'}
        </button>
      </>}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">Passwords are stored encrypted one way, so {name}&apos;s current password cannot be shown. Set a new one instead.</p>
        <div className="flex gap-2">
          <Chip active={mode === 'generate'} onClick={() => setMode('generate')}>Generate</Chip>
          <Chip active={mode === 'type'} onClick={() => setMode('type')}>Type one</Chip>
        </div>
        {mode === 'type' && (
          <TextField label="New password" type="text" autoComplete="new-password" value={password} onChange={setPassword}
            hint="At least 8 characters, with letters and numbers" error={error || undefined} />
        )}
        {mode === 'generate' && error && <p className="text-xs text-[var(--tt-danger)]">{error}</p>}
        <label className="flex items-center gap-2 text-sm text-fg">
          <input type="checkbox" checked={signOut} onChange={(e) => setSignOut(e.target.checked)} />
          Sign them out on every device
        </label>
      </div>
    </Dialog>
  );
}
