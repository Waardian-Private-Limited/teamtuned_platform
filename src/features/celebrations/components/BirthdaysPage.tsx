'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Heart, Trash2 } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../api/birthdays.api';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/** Initials only: birthdays never show employees' photos. */
function Avatar({ name, size = 40, inverted = false }: { name: string; size?: number; inverted?: boolean }) {
  return (
    <span
      className={cx('flex shrink-0 items-center justify-center rounded-full text-xs font-bold', inverted ? 'bg-[var(--tt-on-primary)] text-[var(--tt-primary)]' : 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]')}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

const detailOf = (designation: string | null, site: string | null) => [designation, site].filter(Boolean).join(' · ');

/** Today's birthdays; opening one shows its wall. `?e=<employee id>` opens a wall directly (from a notification). */
export function BirthdaysPage() {
  const params = useSearchParams();
  const router = useRouter();
  const selected = Number(params.get('e')) || null;
  return selected ? <Wall employeeId={selected} onBack={() => router.push(window.location.pathname)} /> : <Today onOpen={(id) => router.push(`${window.location.pathname}?e=${id}`)} />;
}

function Today({ onOpen }: { onOpen: (id: number) => void }) {
  const [list, setList] = React.useState<api.BirthdayDto[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => { api.getToday().then((r) => setList(r.list)).catch((e) => setError(messageOf(e))); }, []);

  if (error) return <p className="py-10 text-center text-sm text-fg-muted">{error}</p>;
  if (!list) return <div className="mx-auto max-w-xl space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-bg-subtle" />)}</div>;
  if (list.length === 0) return <p className="py-12 text-center text-sm text-fg-muted">No birthdays today</p>;
  return (
    <div className="mx-auto max-w-xl space-y-2">
      <h2 className="text-sm font-bold text-fg">🎂 Birthdays today</h2>
      {list.map((b) => (
        <button key={b.employee_id} type="button" onClick={() => onOpen(b.employee_id)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-colors hover:bg-bg-subtle">
          <Avatar name={b.name} size={44} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-fg">{b.name}</span>
            {detailOf(b.designation, b.site_name) && <span className="block truncate text-xs text-fg-muted">{detailOf(b.designation, b.site_name)}</span>}
          </span>
          <span className="flex shrink-0 gap-3 text-xs text-fg-muted">
            {b.likes > 0 && <span className="inline-flex items-center gap-1"><Heart size={13} />{b.likes}</span>}
            {b.wishes > 0 && <span>{b.wishes} wishes</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

function Wall({ employeeId, onBack }: { employeeId: number; onBack: () => void }) {
  const [wall, setWall] = React.useState<api.WallDto | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [text, setText] = React.useState('');
  const [replyTo, setReplyTo] = React.useState<api.WishDto | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => api.getWall(employeeId).then(setWall).catch((e) => setError(messageOf(e))), [employeeId]);
  React.useEffect(() => { void load(); }, [load]);

  if (error) return <p className="py-10 text-center text-sm text-fg-muted">{error}</p>;
  if (!wall) return <div className="mx-auto h-64 max-w-xl animate-pulse rounded-3xl bg-bg-subtle" />;

  const canWrite = wall.features.wishes && ((wall.is_today && !wall.celebrant.is_me) || replyTo !== null);

  const like = async () => {
    const was = wall.likes;
    setWall({ ...wall, likes: { liked: !was.liked, count: Math.max(0, was.count + (was.liked ? -1 : 1)) } });
    try {
      const res = await api.setLike(employeeId, !was.liked);
      setWall((w) => (w ? { ...w, likes: { liked: res.liked, count: res.count } } : w));
    } catch (e) {
      setWall((w) => (w ? { ...w, likes: was } : w));
      showError(messageOf(e));
    }
  };

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.sendWish(employeeId, text.trim(), replyTo?.id);
      setText('');
      setReplyTo(null);
      await load();
    } catch (e) {
      showError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  // One wish or reply changed in place; the rest of the wall stays as it is.
  const patchWish = (id: number, change: Partial<api.WishDto>) =>
    setWall((w) => (w ? { ...w, wishes: w.wishes.map((x) => (x.id === id ? { ...x, ...change } : { ...x, replies: x.replies.map((r) => (r.id === id ? { ...r, ...change } : r)) })) } : w));

  const likeWish = async (w: api.WishDto) => {
    patchWish(w.id, { liked: !w.liked, likes: Math.max(0, w.likes + (w.liked ? -1 : 1)) });
    try {
      const res = await api.setWishLike(w.id, !w.liked);
      patchWish(w.id, { liked: res.liked, likes: res.count });
    } catch (e) {
      patchWish(w.id, { liked: w.liked, likes: w.likes });
      showError(messageOf(e));
    }
  };

  const remove = async (id: number) => {
    try { await api.removeWish(id); await load(); } catch (e) { showError(messageOf(e)); }
  };

  const bubble = (w: api.WishDto, reply: boolean) => (
    <div key={w.id} className={cx('flex gap-2.5', reply && 'ml-10 mt-2')}>
      <Avatar name={w.author.name} size={reply ? 28 : 36} />
      <div className="min-w-0 flex-1 rounded-2xl border border-line bg-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-fg">{w.author.name}</p>
          {w.mine && <button type="button" aria-label="Remove" onClick={() => remove(w.id)} className="text-fg-muted hover:text-fg"><Trash2 size={14} /></button>}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-fg">{w.message}</p>
        <div className="mt-1.5 flex items-center gap-4">
          {wall.features.likes && (
            <button type="button" onClick={() => likeWish(w)} disabled={w.mine} className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg disabled:cursor-default">
              <Heart size={14} className={cx('transition-transform duration-200', w.liked && 'scale-110 fill-[#E5484D] text-[#E5484D]')} />
              {w.likes > 0 && w.likes}
            </button>
          )}
          {!reply && wall.features.wishes && <button type="button" onClick={() => setReplyTo(w)} className="text-xs font-semibold text-fg-muted hover:text-fg">Reply</button>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <button type="button" onClick={onBack} className="text-xs font-semibold text-fg-muted hover:text-fg">← All birthdays</button>
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
        <Avatar name={wall.celebrant.name} size={54} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-fg">{wall.celebrant.is_me ? `Happy birthday, ${wall.celebrant.name.split(' ')[0]}!` : wall.celebrant.name}</h2>
          {detailOf(wall.celebrant.designation, wall.celebrant.site_name) && <p className="truncate text-xs text-fg-muted">{detailOf(wall.celebrant.designation, wall.celebrant.site_name)}</p>}
          <p className="mt-1 text-xs text-fg-muted">🎂 {wall.is_today ? 'Birthday today' : wall.year}</p>
        </div>
        {wall.features.likes && (
          <button type="button" onClick={like} disabled={wall.celebrant.is_me} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-fg transition-transform hover:bg-bg-subtle active:scale-90 disabled:opacity-60">
            <Heart size={18} className={cx('transition-transform duration-200', wall.likes.liked && 'scale-110 fill-current')} />
            {wall.likes.count}
          </button>
        )}
      </div>

      {wall.wishes.length === 0 ? (
        <p className="py-6 text-center text-sm text-fg-muted">{!wall.features.wishes ? 'Wishes are turned off' : wall.celebrant.is_me ? 'Wishes from your team will show up here' : 'Be the first to send a wish'}</p>
      ) : (
        <div className="space-y-3">
          {wall.wishes.map((w) => (
            <div key={w.id}>{bubble(w, false)}{w.replies.map((r) => bubble(r, true))}</div>
          ))}
        </div>
      )}

      {canWrite && (
        <div className="sticky bottom-0 space-y-2 border-t border-line bg-surface pt-3">
          {replyTo && <p className="flex items-center justify-between text-xs text-fg-muted">Replying to {replyTo.author.name}<button type="button" onClick={() => setReplyTo(null)} className="font-semibold">Cancel</button></p>}
          <div className="flex gap-2">
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={1} placeholder="Write a message" className="min-h-10 flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg" />
            <button type="button" onClick={send} disabled={busy || !text.trim()} className="rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] disabled:opacity-40">Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
