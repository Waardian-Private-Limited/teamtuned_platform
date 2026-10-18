'use client';

import { useState } from 'react';
import { formatDateTime } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import type { TimelineEvent } from '../../types/recruitment.model';
import { CandidateAvatar } from '../CandidateAvatar';
import { EmptyTab } from './parts';

export function NotesTab({ events, canAdd, isSaving, onAdd }: {
  events: TimelineEvent[];
  canAdd: boolean;
  isSaving: boolean;
  onAdd: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const notes = events
    .filter((e) => e.type === 'note')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const submit = async () => {
    const t = text.trim();
    if (!t) { setError('Write something first'); return; }
    setError('');
    if (await onAdd(t)) setText('');
  };

  return (
    <div className="space-y-4">
      {canAdd && (
        <div>
          <div className={cx(
            'rounded-lg border bg-surface px-3 py-2 transition-colors focus-within:ring-1',
            error ? 'border-[var(--tt-danger)] focus-within:ring-[var(--tt-danger)]' : 'border-line focus-within:border-[var(--tt-primary)] focus-within:ring-[var(--tt-primary)]'
          )}>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); if (error) setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
              rows={3}
              maxLength={2000}
              aria-label="Add a note"
              aria-invalid={Boolean(error) || undefined}
              placeholder="Add a note for the hiring team…"
              className="w-full resize-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-fg-subtle">Visible to the hiring team only · ⌘/Ctrl + Enter</span>
              <button
                type="button"
                onClick={submit}
                disabled={isSaving}
                className="inline-flex h-7 items-center rounded-md bg-[var(--tt-primary)] px-2.5 text-xs font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Add note'}
              </button>
            </div>
          </div>
          {error && <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
        </div>
      )}
      {notes.length === 0 ? (
        <EmptyTab title="No notes yet" />
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="flex gap-2.5">
              <CandidateAvatar name={n.actorName || '?'} size="sm" />
              <div className="min-w-0 flex-1 rounded-lg border border-line bg-bg-subtle/40 px-3 py-2">
                <p className="text-[11px] text-fg-muted"><span className="font-semibold text-fg">{n.actorName || 'Someone'}</span> · {formatDateTime(n.createdAt)}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-fg">{String(n.data.text ?? '')}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
