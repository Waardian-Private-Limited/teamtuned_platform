'use client';

import { useEffect, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { CandidateAvatar } from '../../shared/components/CandidateAvatar';
import { listPool, moveToPosition } from '../api/pool.api';
import type { PoolItem } from '../types/pool.types';
import { LeadStatusBadge } from './PoolTable';

/** A position's "From talent pool": search past candidates and leads, add the chosen ones at Applied. */
export function PickFromPoolDialog({ open, positionId, positionTitle, onClose, onAdded }: {
  open: boolean;
  positionId: number;
  positionTitle: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<PoolItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Map<number, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setSearch(''); setPicked(new Map()); setError(null); } }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    const t = setTimeout(() => {
      setLoading(true);
      listPool({ tab: '', search, leadSource: '', mine: false, sort: search ? 'name' : 'recent', page: 1, pageSize: 30 })
        .then((d) => { if (alive) setItems(d.items.filter((i) => !i.isEmployee)); })
        .catch((e) => { if (alive) setError(messageOf(e)); })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [open, search]);

  const toggle = (i: PoolItem) => setPicked((m) => {
    const next = new Map(m);
    if (next.has(i.id)) next.delete(i.id); else next.set(i.id, i.name);
    return next;
  });

  const add = async () => {
    setSaving(true);
    setError(null);
    const failed: string[] = [];
    let added = 0;
    for (const [id, name] of picked) {
      try {
        await moveToPosition(id, { position_id: positionId });
        added += 1;
      } catch (err) {
        failed.push(`${name}: ${messageOf(err)}`);
      }
    }
    setSaving(false);
    if (added) { showSuccess(`${added} added to ${positionTitle}`); onAdded(); }
    if (failed.length) setError(failed.join('\n'));
    else onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add from talent pool"
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3.5 text-sm font-semibold text-fg hover:bg-bg-subtle">Cancel</button>
          <button type="button" onClick={add} disabled={saving || picked.size === 0} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:opacity-50">
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Add {picked.size || ''} to Applied
          </button>
        </>
      }
    >
      <div className="relative mb-3 flex h-10 items-center rounded-lg border border-line bg-surface px-3 focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
        <Search className="h-4 w-4 shrink-0 text-fg-subtle" />
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, title, skills, city…" aria-label="Search the talent pool"
          className="ml-2 w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle focus:ring-0" />
      </div>
      <ul className={cx('max-h-[50vh] divide-y divide-line overflow-y-auto rounded-xl border border-line transition-opacity', loading && 'opacity-60')}>
        {items.length === 0 && <li className="px-3 py-8 text-center text-xs text-fg-muted">{loading ? 'Searching…' : 'Nobody found'}</li>}
        {items.map((i) => {
          const on = picked.has(i.id);
          const inThis = i.lastApplication?.positionTitle === positionTitle;
          return (
            <li key={i.id}>
              <button type="button" disabled={inThis} onClick={() => toggle(i)} className={cx('flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-bg-subtle/50 disabled:cursor-not-allowed disabled:opacity-50', on && 'bg-bg-subtle')}>
                <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded border', on ? 'border-fg bg-fg text-bg' : 'border-line-strong')}>{on && <Check className="h-3.5 w-3.5" />}</span>
                <CandidateAvatar name={i.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">{i.name}</span>
                  <span className="block truncate text-xs text-fg-muted">
                    {inThis ? 'Already in this position' : [i.currentTitle, i.totalExperience !== null ? `${i.totalExperience} yrs` : null, i.city, i.skills].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
                <LeadStatusBadge status={i.leadStatus} />
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-3 whitespace-pre-line text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
    </Dialog>
  );
}
