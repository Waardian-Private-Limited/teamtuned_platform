'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import { Heart, Plus, Sparkles, Trash2 } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { formatDayTime } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelectField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Textarea } from '@/components/ui/Textarea';
import * as api from '../api/perf.api';
import type { Kudos, KudosWall, PersonOption } from '../types/perf.types';
import { PersonPicker } from './PersonPicker';
import { Btn, IconBtn, PageHead, Panel } from './ui';

type Show = 'all' | 'received' | 'given';
const FILTER: Record<Show, { to?: 'me'; from?: 'me' }> = { all: {}, received: { to: 'me' }, given: { from: 'me' } };

/** The company-wide wall of thanks: give kudos to a colleague, tag the value it shows, like what others wrote. */
export function KudosPage() {
  const [show, setShow] = React.useState<Show>('all');
  const [wall, setWall] = React.useState<KudosWall | null>(null);
  const [error, setError] = React.useState('');
  const [more, setMore] = React.useState(false);
  const [giving, setGiving] = React.useState(false);

  React.useEffect(() => {
    setWall(null); setError('');
    api.kudosWall(FILTER[show]).then(setWall).catch((e) => setError(messageOf(e)));
  }, [show]);

  const loadMore = async () => {
    if (!wall?.next) return;
    setMore(true);
    try { const page = await api.kudosWall({ ...FILTER[show], before: wall.next }); setWall({ ...wall, items: [...wall.items, ...page.items], next: page.next }); } catch (e) { setError(messageOf(e)); } finally { setMore(false); }
  };
  const patch = (id: number, p: Partial<Kudos>) => wall && setWall({ ...wall, items: wall.items.map((k) => (k.id === id ? { ...k, ...p } : k)) });
  const like = async (k: Kudos) => {
    patch(k.id, { liked_by_me: !k.liked_by_me, like_count: k.like_count + (k.liked_by_me ? -1 : 1) });
    try { const r = await api.likeKudos(k.id, !k.liked_by_me); patch(k.id, r); } catch (e) { patch(k.id, { liked_by_me: k.liked_by_me, like_count: k.like_count }); setError(messageOf(e)); }
  };
  const remove = async (k: Kudos) => {
    try { await api.removeKudos(k.id); if (wall) setWall({ ...wall, items: wall.items.filter((x) => x.id !== k.id) }); showSuccess('Removed'); } catch (e) { setError(messageOf(e)); }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead title="Kudos" subtitle="Thank a colleague" help={HELP.kudos}
        actions={<>
          <SegmentedControl<Show> options={[{ value: 'all', label: 'Everyone' }, { value: 'received', label: 'For me' }, { value: 'given', label: 'From me' }]} value={show} onChange={setShow} fitText />
          {wall?.can_give !== false && <Btn icon={Plus} onClick={() => setGiving(true)}>Give kudos</Btn>}
        </>} />
      <Panel className="overflow-y-auto p-3 tt-scroll-hidden sm:p-4">
        {error && <p role="alert" className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}
        {!wall && !error && <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-bg-subtle" />)}</div>}
        {wall?.items.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <EmptyState illustration={{ src: '/vectors/teams.svg', width: 220, height: 160, alt: '' }}
              title={show === 'received' ? 'No kudos for you yet' : show === 'given' ? 'You have not thanked anyone yet' : 'No kudos yet'}
              description="A short, specific thank-you makes someone's week. Say what they did and why it mattered."
              action={wall.can_give !== false ? { label: 'Give kudos', onClick: () => setGiving(true) } : undefined} />
          </div>
        )}
        {wall && wall.items.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {wall.items.map((k) => (
              <article key={k.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)]">
                <p className="text-xs text-fg-muted"><span className="font-semibold text-fg">{k.from_name}</span> thanked <span className="font-semibold text-fg">{k.to_name}</span></p>
                <p className="text-sm leading-relaxed text-fg">{k.message}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <div className="flex min-w-0 items-center gap-2 text-[11px] text-fg-muted">
                    {k.competency_name && <span className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 font-semibold text-fg"><Sparkles className="h-3 w-3" />{k.competency_name}</span>}
                    <span className="truncate">{formatDayTime(k.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => like(k)} aria-pressed={k.liked_by_me} aria-label={k.liked_by_me ? 'Unlike' : 'Like'} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors hover:bg-bg-subtle ${k.liked_by_me ? 'text-fg' : 'text-fg-muted'}`}>
                      <Heart className={`h-4 w-4 ${k.liked_by_me ? 'fill-current' : ''}`} />{k.like_count > 0 && k.like_count}
                    </button>
                    {k.can_delete && <IconBtn label="Remove" onClick={() => remove(k)}><Trash2 className="h-4 w-4" /></IconBtn>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {wall?.next && <div className="mt-4 flex justify-center"><Btn variant="secondary" loading={more} onClick={loadMore}>Show more</Btn></div>}
      </Panel>
      {giving && <GiveKudosDialog values={wall?.values || []} onClose={() => setGiving(false)} onGiven={(k) => { setGiving(false); showSuccess('Kudos sent'); if (wall && show !== 'received') setWall({ ...wall, items: [k, ...wall.items] }); }} />}
    </div>
  );
}

export function GiveKudosDialog({ values, to, onClose, onGiven }: { values: { id: number; name: string }[]; to?: PersonOption | null; onClose: () => void; onGiven: (k: Kudos) => void }) {
  const [person, setPerson] = React.useState<PersonOption | null>(to || null);
  const [message, setMessage] = React.useState('');
  const [value, setValue] = React.useState<number | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const send = async () => {
    const e: Record<string, string> = {};
    if (!person) e.to = 'Choose who to thank';
    if (message.trim().length < 3) e.message = 'Say what they did';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try { onGiven(await api.giveKudos({ to_employee_id: person!.id, message: message.trim(), competency_id: value })); } catch (err) { setErrors({ form: messageOf(err) }); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title="Give kudos" footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn icon={Heart} loading={busy} onClick={send}>Send</Btn></>}>
      <div className="space-y-3">
        <PersonPicker label="Who" value={person} onChange={setPerson} search={api.kudosPeople} error={errors.to} />
        <Textarea label="What they did" rows={4} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} error={errors.message} hint={`${message.length} / 500. Be specific: what happened and why it mattered.`} />
        {values.length > 0 && <SelectField<number> label="Shows the value (optional)" numeric value={value} placeholder="None" onChange={setValue} options={values.map((v) => ({ value: v.id, label: v.name }))} />}
        {errors.form && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.form}</p>}
      </div>
    </Dialog>
  );
}
