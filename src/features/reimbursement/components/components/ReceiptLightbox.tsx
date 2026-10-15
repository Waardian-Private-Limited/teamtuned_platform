'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Maximize, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { useModalBehavior } from '@/components/ui/useModalBehavior';
import { isPdfFile, useFileLink, type ReceiptFile } from '../../hooks/useFileLink';

export type ReceiptGroup = 'bill' | 'proof';
export interface ReceiptPosition {
  group: ReceiptGroup;
  index: number;
}

interface View {
  zoom: number;
  rotation: number;
  x: number;
  y: number;
}

const FIT: View = { zoom: 1, rotation: 0, x: 0, y: 0 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** Zooms by `factor` keeping the point (px, py), relative to the stage centre, where it is. */
function zoomAt(v: View, factor: number, px = 0, py = 0): View {
  const zoom = clampZoom(v.zoom * factor);
  if (zoom === 1) return { ...v, zoom, x: 0, y: 0 };
  const k = zoom / v.zoom;
  return { ...v, zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
}

const TOOL =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg transition-opacity hover:bg-bg-subtle disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg';

// ── Stage: one file, zoomable ───────────────────────────────────────────────

interface StageProps {
  file: ReceiptFile;
  view: View;
  setView: React.Dispatch<React.SetStateAction<View>>;
  /** Gets the file's URL once loaded (for "Open in new tab"). */
  onUrl: (url: string | null) => void;
}

function Stage({ file, view, setView, onUrl }: StageProps) {
  const link = useFileLink(file.source, true);
  const pdf = isPdfFile(file);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  const [natural, setNatural] = React.useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const pinch = React.useRef<{ dist: number; zoom: number } | null>(null);

  React.useEffect(() => onUrl(link.url), [link.url, onUrl]);

  React.useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const measure = () => setBox({ w: node.clientWidth, h: node.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [pdf, link.url]);

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  React.useEffect(() => {
    const node = boxRef.current;
    if (!node || pdf) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = node.getBoundingClientRect();
      const px = e.clientX - r.left - r.width / 2;
      const py = e.clientY - r.top - r.height / 2;
      setView((v) => zoomAt(v, Math.exp(-e.deltaY * 0.0015), px, py));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [pdf, link.url, setView]);

  const center = (e: { clientX: number; clientY: number }) => {
    const r = boxRef.current?.getBoundingClientRect();
    return r ? { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 } : { x: 0, y: 0 };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: view.zoom };
    }
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      const p = pinch.current;
      const mid = center({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      setView((v) => zoomAt(v, clampZoom((p.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / p.dist) / v.zoom, mid.x, mid.y));
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    setView((v) => (v.zoom > 1 ? { ...v, x: v.x + dx, y: v.y + dy } : v));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (!pointers.current.size) setDragging(false);
  };

  const onError = () => {
    if (!link.retry()) setFailed(true);
  };

  if (!file.source) return <StageNote>This file was not kept. Attach it again to see it.</StageNote>;
  if (link.error || failed) {
    return (
      <StageNote>
        <span role="alert">{link.error || 'The file could not be shown.'}</span>
        {link.url && <OpenLink url={link.url} className="mt-3" />}
      </StageNote>
    );
  }
  if (!link.url) return <div aria-hidden className="m-4 flex-1 animate-pulse rounded-lg bg-bg-subtle" />;

  if (pdf) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <iframe key={link.url} src={link.url} title={file.name} className="min-h-0 w-full flex-1 border-0 bg-surface" />
      </div>
    );
  }

  const turned = view.rotation % 180 !== 0;
  const fit = natural && box.w && box.h ? Math.min(box.w / (turned ? natural.h : natural.w), box.h / (turned ? natural.w : natural.h)) * 0.94 : 0;
  return (
    <div
      ref={boxRef}
      className={cx('relative min-h-0 flex-1 touch-none select-none overflow-hidden', view.zoom > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => {
        const p = center(e);
        setView((v) => (v.zoom > 1 ? { ...FIT, rotation: v.rotation } : zoomAt(v, 2.5, p.x, p.y)));
      }}
    >
      <img
        key={link.url}
        src={link.url}
        alt={file.name}
        draggable={false}
        onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        onError={onError}
        style={{
          width: natural?.w,
          height: natural?.h,
          transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) rotate(${view.rotation}deg) scale(${fit * view.zoom || 0.0001})`,
          opacity: fit ? 1 : 0,
        }}
        className={cx('absolute left-1/2 top-1/2 max-w-none origin-center will-change-transform', !dragging && 'transition-[transform,opacity] duration-150 ease-out')}
      />
    </div>
  );
}

function StageNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-sm text-fg-muted">
      <FileText className="mb-2 h-6 w-6" aria-hidden />
      {children}
    </div>
  );
}

function OpenLink({ url, className }: { url: string; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cx('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-fg transition-opacity hover:bg-bg-subtle', className)}
    >
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">Open in new tab</span>
      <span className="sm:hidden">Open</span>
    </a>
  );
}

// ── Full-screen viewer ──────────────────────────────────────────────────────

interface ReceiptLightboxProps {
  open: boolean;
  onClose: () => void;
  bills: ReceiptFile[];
  proofs: ReceiptFile[];
  start: ReceiptPosition;
  title: string;
  subtitle?: string;
  /** The bill details on the right (read-only). */
  details: React.ReactNode;
}

export function ReceiptLightbox(props: ReceiptLightboxProps) {
  if (!props.open || typeof document === 'undefined') return null;
  return createPortal(<LightboxPanel {...props} />, document.body);
}

function LightboxPanel({ onClose, bills, proofs, start, title, subtitle, details }: ReceiptLightboxProps) {
  const panelRef = useModalBehavior(true, onClose);
  const [pos, setPos] = React.useState<ReceiptPosition>(start);
  const [view, setView] = React.useState<View>(FIT);
  const [pane, setPane] = React.useState<'receipt' | 'details'>('receipt');
  const [url, setUrl] = React.useState<string | null>(null);
  const files = pos.group === 'bill' ? bills : proofs;
  const file = files[pos.index] ?? files[0] ?? null;
  const count = files.length;
  const pdf = file ? isPdfFile(file) : false;
  const headingId = React.useId();

  const go = React.useCallback((next: ReceiptPosition) => {
    setPos(next);
    setView(FIT);
    setUrl(null);
  }, []);
  const page = React.useCallback(
    (step: number) => {
      const index = pos.index + step;
      if (index >= 0 && index < count) go({ group: pos.group, index });
    },
    [pos, count, go]
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowLeft') page(-1);
      else if (e.key === 'ArrowRight') page(1);
      else if (pdf) return;
      else if (e.key === '+' || e.key === '=') setView((v) => zoomAt(v, 1.25));
      else if (e.key === '-' || e.key === '_') setView((v) => zoomAt(v, 0.8));
      else if (e.key === '0') setView((v) => ({ ...FIT, rotation: v.rotation }));
      else if (e.key === 'r' || e.key === 'R') setView((v) => ({ ...v, rotation: (v.rotation + 90) % 360 }));
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [page, pdf]);

  const tabs: Array<{ group: ReceiptGroup; label: string; n: number }> = [{ group: 'bill', label: 'Bill', n: bills.length }];
  if (proofs.length) tabs.push({ group: 'proof', label: 'Payment proof', n: proofs.length });

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      tabIndex={-1}
      className="tt-fade-in fixed inset-0 z-[60] flex flex-col bg-surface text-fg outline-none"
    >
      <header className="flex items-center gap-3 border-b border-line px-3 py-2.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="truncate text-sm font-bold sm:text-base">
            {title}
          </h2>
          {subtitle && <p className="truncate text-[11px] text-fg-muted sm:text-xs">{subtitle}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close compare view" className={TOOL}>
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {/* Phones: one pane at a time. */}
      <div role="tablist" aria-label="View" className="grid grid-cols-2 gap-1 border-b border-line p-1.5 lg:hidden">
        {(['receipt', 'details'] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={pane === p}
            onClick={() => setPane(p)}
            className={cx('h-9 rounded-lg text-xs font-semibold transition-opacity', pane === p ? 'bg-fg text-[var(--tt-on-primary)]' : 'text-fg-muted hover:bg-bg-subtle')}
          >
            {p === 'receipt' ? 'Receipt' : 'Bill details'}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-label="Receipt" className={cx('min-h-0 min-w-0 flex-1 flex-col bg-bg-subtle', pane === 'receipt' ? 'flex' : 'hidden lg:flex')}>
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-2 py-1.5 sm:px-3">
            {tabs.length > 1 && (
              <div role="group" aria-label="Files" className="flex gap-1">
                {tabs.map((t) => (
                  <button
                    key={t.group}
                    type="button"
                    aria-pressed={pos.group === t.group}
                    disabled={!t.n}
                    onClick={() => go({ group: t.group, index: 0 })}
                    className={cx(
                      'h-8 rounded-lg px-2.5 text-xs font-semibold transition-opacity disabled:opacity-35',
                      pos.group === t.group ? 'bg-fg text-[var(--tt-on-primary)]' : 'border border-line text-fg hover:bg-bg-subtle'
                    )}
                  >
                    {t.label} ({t.n})
                  </button>
                ))}
              </div>
            )}
            <div className="ml-auto flex items-center gap-0.5">
              <button type="button" className={TOOL} aria-label="Zoom out" disabled={pdf || view.zoom <= MIN_ZOOM} onClick={() => setView((v) => zoomAt(v, 0.8))}>
                <ZoomOut className="h-4 w-4" aria-hidden />
              </button>
              <span className="w-11 text-center text-[11px] font-semibold tabular-nums text-fg-muted" aria-live="polite">
                {pdf ? '—' : `${Math.round(view.zoom * 100)}%`}
              </span>
              <button type="button" className={TOOL} aria-label="Zoom in" disabled={pdf || view.zoom >= MAX_ZOOM} onClick={() => setView((v) => zoomAt(v, 1.25))}>
                <ZoomIn className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" className={TOOL} aria-label="Fit to screen" disabled={pdf} onClick={() => setView((v) => ({ ...FIT, rotation: v.rotation }))}>
                <Maximize className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" className={TOOL} aria-label="Rotate 90 degrees" disabled={pdf} onClick={() => setView((v) => ({ ...v, rotation: (v.rotation + 90) % 360 }))}>
                <RotateCw className="h-4 w-4" aria-hidden />
              </button>
              {url && <OpenLink url={url} className="ml-1" />}
            </div>
          </div>

          {file ? (
            <Stage key={`${pos.group}-${pos.index}`} file={file} view={view} setView={setView} onUrl={setUrl} />
          ) : (
            <StageNote>No file attached.</StageNote>
          )}

          {count > 0 && (
            <div className="flex items-center justify-between gap-2 border-t border-line bg-surface px-2 py-1.5 sm:px-3">
              <button type="button" className={TOOL} aria-label="Previous page" disabled={pos.index <= 0} onClick={() => page(-1)}>
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <p className="min-w-0 truncate text-center text-xs text-fg-muted" aria-live="polite">
                <span className="font-semibold text-fg">
                  {pos.index + 1} / {count}
                </span>
                {file && <span className="hidden sm:inline"> · {file.name}</span>}
              </p>
              <button type="button" className={TOOL} aria-label="Next page" disabled={pos.index >= count - 1} onClick={() => page(1)}>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </section>

        <aside aria-label="Bill details" className={cx('min-h-0 min-w-0 flex-1 overflow-y-auto border-line p-4 sm:p-5 lg:border-l', pane === 'details' ? 'block' : 'hidden lg:block')}>
          {details}
        </aside>
      </div>
    </div>
  );
}
