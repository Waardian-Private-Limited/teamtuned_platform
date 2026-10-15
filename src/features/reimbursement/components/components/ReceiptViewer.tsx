'use client';

import React from 'react';
import { FileText, ImageOff, Maximize2, Receipt } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { isPdfFile, useFileLink, useInView, type ReceiptFile } from '../../hooks/useFileLink';
import type { Bill, Flag, LineAttachment } from '../../types/reimbursement.model';
import { BillCheckStatus } from './BillPanel';
import { BillItemsView } from './BillItems';
import { ReceiptLightbox, type ReceiptPosition } from './ReceiptLightbox';
import { FlagList } from './StatusBadges';

export type { ReceiptFile } from '../../hooks/useFileLink';

/** Stored files of a claim line, shown through the presigned file links (`payment`: payment proofs). */
export function storedFiles(scope: 'me' | 'hr', claimId: number, lineId: number, files: Array<Pick<LineAttachment, 'index' | 'name' | 'size' | 'type'>>, payment = false): ReceiptFile[] {
  return files.map((a) => ({
    id: `${payment ? 'p' : 'b'}${lineId}-${a.index}`,
    name: a.name,
    size: a.size,
    type: a.type,
    source: { kind: 'remote', scope, claimId, lineId, index: a.index, payment },
  }));
}

export interface ReceiptFact {
  label: string;
  value: React.ReactNode;
}

interface ReceiptViewerProps {
  /** Photos / PDF of the bill, in page order. */
  bills: ReceiptFile[];
  /** Proof of how it was paid (screenshot, card slip). */
  proofs?: ReceiptFile[];
  /** Heading of the compare view, e.g. "Travel · Uber". */
  title: string;
  subtitle?: string;
  bill: Bill | null;
  /** The bill's totals are the server's (claim detail, approvals, a previewed bill). */
  checked?: boolean;
  /** The server check is running. */
  pending?: boolean;
  fromAi?: boolean;
  /** Line flags shown at the top of the compare view. */
  flags?: Flag[];
  /** Key amounts shown at the top of the compare view (claimed, approved, date…). */
  facts?: ReceiptFact[];
  /** `compare`: the receipt gets half the width once the container is wide (approvals). */
  layout?: 'card' | 'compare';
  /** Right side of the inline card; defaults to the read-only invoice. */
  children?: React.ReactNode;
}

function FactGrid({ facts }: { facts: ReceiptFact[] }) {
  if (!facts.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg border border-line p-3">
      {facts.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-[11px] text-fg-muted">{f.label}</dt>
          <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-fg">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A bill's receipt beside its invoice data. Inline: a thumbnail (click to enlarge) next to the
 * invoice; "Compare" opens the full-screen viewer with the receipt (zoom, pan, rotate, pages) on the
 * left and the bill details, check status and flags on the right.
 */
export function ReceiptViewer({ bills, proofs = [], title, subtitle, bill, checked = true, pending, fromAi, flags = [], facts = [], layout = 'card', children }: ReceiptViewerProps) {
  const [open, setOpen] = React.useState<ReceiptPosition | null>(null);
  const [page, setPage] = React.useState(0);
  const group = bills.length ? 'bill' : 'proof';
  const files = bills.length ? bills : proofs;
  const shown = Math.min(page, Math.max(0, files.length - 1));
  const compare = layout === 'compare';

  const inline = children ?? (bill ? <BillItemsView bill={bill} checked={checked} fromAi={fromAi} /> : null);
  if (!files.length) return inline ? <>{inline}</> : null;

  const details = (
    <div className="space-y-4">
      <FactGrid facts={facts} />
      {(bill || flags.length > 0) && (
        <div className="space-y-2">
          {bill && <BillCheckStatus bill={bill} checked={checked} pending={pending} />}
          {flags.length > 0 && <FlagList flags={flags} compact />}
        </div>
      )}
      {bill ? <BillItemsView bill={bill} checked={checked} fromAi={fromAi} hideCheck /> : <p className="text-sm text-fg-muted">No item details were entered for this bill. Compare the amounts above with the receipt.</p>}
    </div>
  );

  return (
    <div className="@container">
      <div className={cx('grid gap-3', compare ? '@md:grid-cols-[11rem_minmax(0,1fr)] @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : '@md:grid-cols-[11rem_minmax(0,1fr)]')}>
        <div className="min-w-0 space-y-2 self-start @md:sticky @md:top-0">
          <Thumb file={files[shown]} page={shown} count={files.length} tall={compare} onOpen={() => setOpen({ group, index: shown })} />
          {files.length > 1 && (
            <div className="flex items-center justify-center gap-1.5">
              {files.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  aria-label={`Show page ${i + 1} of ${files.length}`}
                  aria-current={i === shown ? 'true' : undefined}
                  onClick={() => setPage(i)}
                  className="flex h-6 w-5 items-center justify-center"
                >
                  <span className={cx('block h-1.5 rounded-full bg-fg transition-opacity', i === shown ? 'w-4 opacity-100' : 'w-1.5 opacity-30')} />
                </button>
              ))}
              <span className="ml-1 text-[11px] tabular-nums text-fg-muted">
                {shown + 1} / {files.length}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setOpen({ group, index: shown })}
              aria-label="Compare the receipt with the bill details"
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-fg px-2.5 text-xs font-semibold text-[var(--tt-on-primary)] transition-opacity hover:opacity-90"
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              Compare
            </button>
            {group === 'bill' && proofs.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen({ group: 'proof', index: 0 })}
                aria-label={`Show payment proof, ${proofs.length} ${proofs.length === 1 ? 'file' : 'files'}`}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-line px-2.5 text-xs font-semibold text-fg transition-opacity hover:bg-bg-subtle"
              >
                <Receipt className="h-3.5 w-3.5" aria-hidden />
                Proof ({proofs.length})
              </button>
            )}
          </div>
        </div>
        <div className="min-w-0">{inline ?? details}</div>
      </div>
      <ReceiptLightbox open={open !== null} onClose={() => setOpen(null)} bills={bills} proofs={proofs} start={open ?? { group, index: 0 }} title={title} subtitle={subtitle} details={details} />
    </div>
  );
}

/** First page of a receipt, loaded once it scrolls into view. */
function Thumb({ file, page, count, tall, onOpen }: { file: ReceiptFile; page: number; count: number; tall: boolean; onOpen: () => void }) {
  const [ref, seen] = useInView<HTMLButtonElement>();
  const pdf = isPdfFile(file);
  const link = useFileLink(pdf ? null : file.source, seen);
  const [failed, setFailed] = React.useState<string | null>(null);
  const broken = failed !== null && failed === link.url;
  const label = `Enlarge ${pdf ? 'PDF' : 'photo'} ${file.name}${count > 1 ? `, page ${page + 1} of ${count}` : ''}`;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label={label}
      className={cx(
        'group relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-line bg-bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg',
        tall ? 'h-48 @2xl:h-[26rem]' : 'h-48 @md:h-56'
      )}
    >
      {pdf || !file.source ? (
        <span className="flex flex-col items-center gap-1.5 px-3 text-center">
          <FileText className="h-7 w-7 text-fg-muted" aria-hidden />
          <span className="line-clamp-2 break-all text-[11px] font-semibold text-fg">{file.name}</span>
          <span className="text-[11px] text-fg-muted">{file.source ? 'PDF · open to view' : 'Not kept'}</span>
        </span>
      ) : broken || link.error ? (
        <span className="flex flex-col items-center gap-1.5 px-3 text-center text-[11px] text-fg-muted">
          <ImageOff className="h-6 w-6" aria-hidden />
          Could not load the photo
        </span>
      ) : link.url ? (
        <img
          key={link.url}
          src={link.url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => {
            if (!link.retry()) setFailed(link.url);
          }}
          className="tt-fade-in h-full w-full object-contain transition-transform duration-200 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <span aria-hidden className="absolute inset-2 animate-pulse rounded-md bg-line/60" />
      )}
      <span aria-hidden className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-surface/90 text-fg opacity-70 shadow-[var(--tt-shadow-sm)] transition-opacity group-hover:opacity-100">
        <Maximize2 className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
