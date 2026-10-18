'use client';

import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Download, Mail, MessageCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { btn } from '../../lib/ui';

/** Indian mobile numbers as wa.me wants them (country code, digits only). */
function whatsappNumber(phone?: string | null) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith('91')) return d;
  return '';
}

/**
 * A candidate's test link for the recruiter to hand over directly: copy it, show the QR for the
 * candidate to scan (walk-in, email not received), or send it on WhatsApp / from their own mail.
 */
export function TestLinkShare({ link, candidateName, candidatePhone, candidateEmail, testName, expiresAt }: {
  link: string;
  candidateName?: string;
  candidatePhone?: string | null;
  candidateEmail?: string | null;
  testName?: string;
  expiresAt?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const qrBox = useRef<HTMLDivElement>(null);
  const first = (candidateName || '').trim().split(/\s+/)[0] || 'there';
  const message = `Hi ${first}, here is your ${testName ? `"${testName}" ` : ''}assessment link: ${link}${expiresAt ? ` (open it before ${formatDateTime(expiresAt)})` : ''}`;
  const wa = whatsappNumber(candidatePhone);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the link is selectable below */
    }
  }

  function downloadQr() {
    const svg = qrBox.current?.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `assessment-${(candidateName || 'candidate').replace(/\s+/g, '-').toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={qrBox} className="rounded-xl border border-line bg-white p-3">
        <QRCodeSVG value={link} size={176} level="M" includeMargin={false} />
      </div>
      <p className="text-center text-xs text-fg-muted">The candidate can scan this with their phone camera to open the test.</p>

      <div className="flex w-full items-center gap-2 rounded-lg border border-line bg-bg-subtle/50 px-3 py-2">
        <span className="min-w-0 flex-1 select-all truncate font-mono text-[11px] text-fg">{link}</span>
        <button type="button" onClick={copy} className={cx(btn.small, 'h-7')} aria-label="Copy link">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="grid w-full grid-cols-3 gap-2">
        <a className={cx(btn.secondary, 'w-full')} target="_blank" rel="noopener noreferrer"
          href={`https://wa.me/${wa}?text=${encodeURIComponent(message)}`}>
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
        <a className={cx(btn.secondary, 'w-full')}
          href={`mailto:${candidateEmail || ''}?subject=${encodeURIComponent(`Your assessment${testName ? `: ${testName}` : ''}`)}&body=${encodeURIComponent(message)}`}>
          <Mail className="h-4 w-4" /> Email
        </a>
        <button type="button" onClick={downloadQr} className={cx(btn.secondary, 'w-full')}>
          <Download className="h-4 w-4" /> QR
        </button>
      </div>
      {expiresAt && <p className="text-xs text-fg-muted">Link works until {formatDateTime(expiresAt)}. One attempt only.</p>}
    </div>
  );
}
