'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, FileText, PenLine, ScanLine, Sparkles, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { ATTACHMENT_ACCEPT, MAX_SCAN_PAGES } from '../../constants/reimbursement.constants';
import { scanFileProblem } from '../../hooks/useReceiptScan';
import { fileSize } from '../../utils/format';

interface BillScanZoneProps {
  /** The pages of one bill, in order (photos), or one PDF. */
  pages: File[];
  onPagesChange: (pages: File[]) => void;
  /** A scan is running: nothing can be added, moved or scanned until it ends. */
  scanning: boolean;
  onScan: () => void;
  onManual: () => void;
  disabled?: boolean;
  /** Shown instead of the usual hint while disabled. */
  disabledHint?: string;
  /** Why the pages cannot be scanned (or why the last scan failed). */
  error?: string;
}

const isPdf = (f: File) => f.type === 'application/pdf';

function PageThumb({ file }: { file: File }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file.type.startsWith('image/')) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? (
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <FileText className="h-6 w-6 text-fg-muted" aria-hidden />
  );
}

/**
 * Step 1 of a bill: add the photos of its pages (or one PDF), put them in order, and scan them
 * together; or enter the bill by hand.
 */
export function ReceiptScanZone({ pages, onPagesChange, scanning, onScan, onManual, disabled, disabledHint, error }: BillScanZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [problem, setProblem] = React.useState('');
  const depth = React.useRef(0);
  const hintId = React.useId();
  const locked = Boolean(disabled) || scanning;
  const message = problem || error || '';

  const add = (list: FileList | null | undefined) => {
    const files = Array.from(list || []);
    if (!files.length || locked) return;
    const bad = files.map(scanFileProblem).find(Boolean);
    if (bad) return setProblem(bad);
    const pdfs = files.filter(isPdf);
    if (pdfs.length && (files.length > 1 || pages.length)) return setProblem('Scan a PDF on its own, or photos of one bill');
    if (pages.some(isPdf)) return setProblem('Remove the PDF first to scan photos instead');
    if (pages.length + files.length > MAX_SCAN_PAGES) return setProblem(`One bill can have at most ${MAX_SCAN_PAGES} pages`);
    setProblem('');
    onPagesChange([...pages, ...files]);
  };

  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= pages.length) return;
    const next = [...pages];
    [next[i], next[j]] = [next[j], next[i]];
    onPagesChange(next);
  };

  const remove = (i: number) => {
    setProblem('');
    onPagesChange(pages.filter((_, j) => j !== i));
  };

  const canAdd = !locked && pages.length < MAX_SCAN_PAGES && !pages.some(isPdf);

  return (
    <div className="space-y-4">
      <div>
        <div
          onDragEnter={(e) => {
            if (!canAdd || !e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            depth.current += 1;
            setDragging(true);
          }}
          onDragOver={(e) => {
            if (!canAdd || !e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={() => {
            depth.current = Math.max(0, depth.current - 1);
            if (!depth.current) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            depth.current = 0;
            setDragging(false);
            if (canAdd) add(e.dataTransfer.files);
          }}
          aria-busy={scanning || undefined}
          className={cx(
            'flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-center transition-colors sm:py-8',
            message ? 'border-[var(--tt-danger)]' : dragging ? 'border-fg bg-bg-subtle' : 'border-line-strong bg-bg-subtle/40',
            locked && 'opacity-60'
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fg text-[var(--tt-on-primary)]">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="max-w-sm">
            <p className="text-sm font-bold text-fg">{dragging ? 'Drop to add' : 'Scan the bill'}</p>
            <p id={hintId} className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
              {disabled && disabledHint
                ? disabledHint
                : `Add a photo of each page of one bill, in order (up to ${MAX_SCAN_PAGES}), or one PDF. AI fills in the expense; you check it.`}
            </p>
          </div>
          <button
            type="button"
            disabled={!canAdd}
            aria-describedby={hintId}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {pages.length ? 'Add a page' : 'Choose files'}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            className="hidden"
            tabIndex={-1}
            onChange={(e) => {
              add(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        {message && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">
            {message}
          </p>
        )}
      </div>

      {pages.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-fg sm:text-[13px]">
            {pages.length === 1 ? (isPdf(pages[0]) ? 'PDF' : '1 page') : `${pages.length} pages, in this order`}
          </p>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {pages.map((f, i) => (
              <li key={`${f.name}-${f.size}-${f.lastModified}`} className="tt-fade-in min-w-0 overflow-hidden rounded-lg border border-line bg-surface">
                <div className="relative flex h-24 items-center justify-center bg-bg-subtle">
                  <PageThumb file={f} />
                  <span className="absolute left-1.5 top-1.5 rounded bg-fg px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[var(--tt-on-primary)]">{i + 1}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-fg">{f.name}</span>
                    <span className="block text-[10px] text-fg-muted">{fileSize(f.size)}</span>
                  </span>
                  {pages.length > 1 && (
                    <>
                      <button type="button" disabled={scanning || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${f.name} earlier`} className="rounded p-1 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:opacity-30">
                        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button type="button" disabled={scanning || i === pages.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${f.name} later`} className="rounded p-1 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:opacity-30">
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </>
                  )}
                  <button type="button" disabled={scanning} onClick={() => remove(i)} aria-label={`Remove ${f.name}`} className="rounded p-1 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:opacity-30">
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {scanning ? (
        <div role="status" className="tt-fade-in rounded-xl border border-line p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-fg sm:text-sm">
            <ScanLine className="h-4 w-4 shrink-0 animate-pulse" aria-hidden />
            Reading {pages.length === 1 ? 'the bill' : `${pages.length} pages`}…
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg-subtle" aria-hidden>
            <div className="h-full w-full origin-left animate-pulse rounded-full bg-fg" />
          </div>
          <p className="mt-1.5 text-[11px] text-fg-muted">This takes a few seconds. Another bill can be scanned once this one is done.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onManual}
            disabled={disabled}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline disabled:opacity-40 sm:text-sm"
          >
            <PenLine className="h-4 w-4" aria-hidden />
            Enter manually
          </button>
          <button
            type="button"
            onClick={onScan}
            disabled={locked || !pages.length}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            <ScanLine className="h-4 w-4" aria-hidden />
            Scan bill
          </button>
        </div>
      )}
    </div>
  );
}
