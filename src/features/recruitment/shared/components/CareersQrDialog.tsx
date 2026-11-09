'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Copy, Download, ExternalLink, QrCode, Share2 } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Dialog } from '@/components/ui/Dialog';
import { showError } from '@/lib/toast';

export interface CareersQrDialogProps {
  open: boolean;
  onClose: () => void;
  /** Public link the QR opens: one job, or the whole careers page. Null when there is none yet. */
  url: string | null;
  /** Why there is no link and what to do about it, shown instead of the QR. */
  unavailable?: ReactNode;
  /** Big line on the dialog and poster, e.g. the job title or "Careers at Acme". */
  title: string;
  /** Small line under it, e.g. department and location. */
  subtitle?: string;
  companyName?: string;
}

// The QR is drawn once at poster resolution and scaled down on screen, so the
// same canvas is crisp in the dialog and in the downloaded PNG.
const QR_PX = 640;
const POSTER = { w: 1080, h: 1350, pad: 96 };

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s*\S*$/, '')}…`;
  }
  return lines;
}

/** A print-ready 4:5 poster: company, title, QR, and the link spelled out for anyone who can't scan. */
function drawPoster(qr: HTMLCanvasElement, { title, subtitle, companyName, url }: { title: string; subtitle?: string; companyName?: string; url: string }) {
  const { w, h, pad } = POSTER;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const font = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  const inner = w - pad * 2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, 14);
  ctx.textBaseline = 'top';

  let y = pad;
  ctx.fillStyle = '#737373';
  ctx.font = `700 26px ${font}`;
  ctx.fillText(`${companyName ? `${companyName.toUpperCase()} · ` : ''}WE'RE HIRING`, pad, y, inner);
  y += 56;

  ctx.fillStyle = '#0a0a0a';
  ctx.font = `800 68px ${font}`;
  for (const line of wrap(ctx, title, inner, 2)) { ctx.fillText(line, pad, y); y += 80; }

  if (subtitle) {
    ctx.fillStyle = '#525252';
    ctx.font = `500 32px ${font}`;
    ctx.fillText(subtitle, pad, y + 4, inner);
  }

  const size = 600;
  const qx = (w - size) / 2;
  const qy = h - pad - size - 150;
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(qx - 32, qy - 32, size + 64, size + 64, 36);
  ctx.stroke();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, qx, qy, size, size);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0a0a0a';
  ctx.font = `800 36px ${font}`;
  ctx.fillText('Scan to apply', w / 2, qy + size + 64);
  ctx.fillStyle = '#737373';
  ctx.font = `500 24px ${font}`;
  ctx.fillText(url.replace(/^https?:\/\//, ''), w / 2, qy + size + 114, inner);
  return canvas;
}

const fileSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'careers';

/** Share a careers link: scannable QR, copy, native share sheet, open, and a downloadable poster. */
export function CareersQrDialog({ open, onClose, url, unavailable, title, subtitle, companyName }: CareersQrDialogProps) {
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  // Known only in the browser; read after mount so the first render matches the server's.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { setCanShare(typeof navigator.share === 'function'); }, []);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      showError('Could not copy the link');
    }
  };

  const share = async () => {
    if (!url) return;
    try {
      await navigator.share({ title, text: companyName ? `${title} at ${companyName}` : title, url });
    } catch {
      // Dismissing the share sheet rejects too; nothing to report.
    }
  };

  const download = () => {
    if (!qrRef.current || !url) return;
    const poster = drawPoster(qrRef.current, { url, title, subtitle, companyName });
    if (!poster) return;
    const a = document.createElement('a');
    a.download = `${fileSlug(title)}-qr.png`;
    a.href = poster.toDataURL('image/png');
    a.click();
  };

  const action = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-sm"
      title={
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg"><QrCode className="h-4 w-4" /></span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-fg sm:text-base">Share to apply</h2>
            <p className="truncate text-xs text-fg-muted">Anyone who scans lands on the apply page</p>
          </div>
        </div>
      }
    >
      {!url ? (
        <div className="flex flex-col items-center py-4 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-line-strong text-fg-subtle"><QrCode className="h-6 w-6" /></span>
          <p className="text-sm font-bold text-fg">{title}</p>
          <div className="mt-1.5 max-w-xs text-xs leading-relaxed text-fg-muted">{unavailable || 'There is no public link to share yet.'}</div>
        </div>
      ) : (
      <div className="flex flex-col items-center">
        {/* Shrinks with the screen (and with a short screen), never wider than the popup. */}
        <div className="w-[min(13rem,60vw,34vh)] rounded-2xl border border-line bg-white p-3 shadow-xs sm:p-4">
          <QRCodeCanvas
            ref={qrRef}
            value={url}
            size={QR_PX}
            level="M"
            marginSize={0}
            bgColor="#ffffff"
            fgColor="#0a0a0a"
            // The library sets width/height to `size` inline; scale it to the box instead.
            style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '1 / 1' }}
            aria-label={`QR code for ${url}`}
          />
        </div>

        <p className="mt-4 line-clamp-2 max-w-full break-words text-center text-base font-bold text-fg">{title}</p>
        {subtitle && <p className="max-w-full truncate text-center text-xs text-fg-muted">{subtitle}</p>}

        <div className="mt-4 flex w-full items-center gap-1 rounded-lg border border-line bg-bg-subtle/60 py-1 pl-3 pr-1">
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-muted select-all" title={url}>{url.replace(/^https?:\/\//, '')}</span>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy link"
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-surface px-2.5 text-xs font-semibold text-fg shadow-xs hover:bg-bg-subtle"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className={`mt-3 grid w-full gap-2 ${canShare ? 'grid-cols-3' : 'grid-cols-2'} [&>*]:min-w-0`}>
          {canShare && (
            <button type="button" onClick={share} className={action}><Share2 className="h-4 w-4" />Share</button>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className={action}><ExternalLink className="h-4 w-4" />Open</a>
          <button type="button" onClick={download} className={action}><Download className="h-4 w-4" />Poster</button>
        </div>
        <p className="mt-2 text-center text-[11px] text-fg-muted">Poster is a print-ready PNG with the QR and link.</p>
      </div>
      )}
    </Dialog>
  );
}

/** Why there is no careers link: still checking, the hosted page is off, or it could not be checked. */
export function CareersOffNotice({ state, canSettings, base }: { state: 'checking' | 'on' | 'off' | 'unknown'; canSettings: boolean; base: string }) {
  if (state === 'checking') return <>Getting the careers link…</>;
  if (state === 'unknown') return <>Could not get the careers link. Try again after the page reloads, or ask someone with recruitment settings access.</>;
  return canSettings ? (
    <>The careers page is off. Turn it on and give it an address in{' '}
      <Link href={`${base}/settings?tab=careers`} className="font-semibold text-fg underline">Settings → Careers &amp; API</Link>.</>
  ) : (
    <>The careers page is off. Ask someone with recruitment settings access to turn it on.</>
  );
}
