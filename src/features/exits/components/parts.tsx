'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { OFFER_STATUS_META, STATUS_META, TONE_CLASS, type Tone } from '../constants/exits.constants';
import type { ExitStatus, OfferStatus } from '../types/exits';

export function TonePill({ label, tone }: { label: string; tone: Tone }) {
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold', TONE_CLASS[tone])}>{label}</span>;
}

export const StatusPill = ({ status }: { status: ExitStatus }) => <TonePill label={STATUS_META[status].label} tone={STATUS_META[status].tone} />;
export const OfferPill = ({ status }: { status: OfferStatus }) => <TonePill label={OFFER_STATUS_META[status].label} tone={OFFER_STATUS_META[status].tone} />;

export function Card({ title, aside, children, className }: { title?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('min-w-0 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5', className)}>
      {(title || aside) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-sm font-bold text-fg">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Fact({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cx('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-fg">{value || '—'}</dd>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-bg-subtle', className)} />;
}

/** A small yes/cancel confirmation with an optional note. */
export function ConfirmNote({ open, title, body, cta, danger, noteLabel, noteRequired, busy, onClose, onConfirm }: {
  open: boolean; title: string; body?: React.ReactNode; cta: string; danger?: boolean; noteLabel?: string; noteRequired?: boolean; busy?: boolean;
  onClose: () => void; onConfirm: (note: string) => void;
}) {
  const [note, setNote] = React.useState('');
  const [err, setErr] = React.useState('');
  React.useEffect(() => { if (open) { setNote(''); setErr(''); } }, [open]);
  return (
    <Dialog open={open} onClose={onClose} title={<h2 className="text-sm font-bold text-fg sm:text-base">{title}</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn>
        <Btn variant={danger ? 'danger' : 'primary'} busy={busy} onClick={() => {
          if (noteRequired && !note.trim()) { setErr('This is required'); return; }
          onConfirm(note.trim());
        }}>{cta}</Btn></>}>
      <div className="space-y-3">
        {body && <div className="text-sm text-fg-muted">{body}</div>}
        {noteLabel && <Textarea label={noteLabel} required={noteRequired} value={note} error={err} maxLength={500} onChange={(e) => { setNote(e.target.value); setErr(''); }} />}
      </div>
    </Dialog>
  );
}
