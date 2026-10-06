'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Download, Printer, QrCode } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { apiClient } from '@/lib/api/client';
import type { Site } from '../../types/sites.model';

interface SiteQrDialogProps {
  open: boolean;
  site: Site | null;
  onClose: () => void;
}

export function SiteQrDialog({ open, site, onClose }: SiteQrDialogProps) {
  const [payload, setPayload] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const qrRef = React.useRef<SVGSVGElement | null>(null);

  React.useEffect(() => {
    if (!open || !site) {
      setPayload(null);
      setError(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    apiClient<{ site_id: number; payload: string }>(`/attendance/sites/${site.id}/qr`, {
      method: 'GET',
      withAuth: true,
    })
      .then((res) => {
        if (!isCancelled) {
          setPayload(res.payload);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err?.message || 'Failed to generate QR code');
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [open, site]);

  const handleCopy = () => {
    if (!payload) return;
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrRef.current || !site) return;
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const a = document.createElement('a');
        a.download = `site-qr-${site.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      }
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const handlePrint = () => {
    if (!site || !payload) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const svgData = qrRef.current ? new XMLSerializer().serializeToString(qrRef.current) : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance QR - ${site.name}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 90vh; margin: 0; text-align: center; }
            .card { border: 2px dashed #999; padding: 40px; border-radius: 16px; max-width: 400px; }
            h1 { font-size: 24px; margin: 0 0 8px; }
            p { color: #666; margin: 0 0 24px; font-size: 14px; }
            .hint { margin-top: 20px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${site.name}</h1>
            <p>Scan with TeamTuned app to Check In / Out</p>
            ${svgData}
            <div class="hint">Site Code: ${site.code || site.id}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-[var(--tt-primary)]" />
          <div>
            <h2 className="text-base font-bold text-fg">Attendance QR Code</h2>
            <p className="text-xs text-fg-muted">{site?.name || 'Site'}</p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center py-4">
        {isLoading ? (
          <div className="flex h-56 w-56 items-center justify-center">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[var(--tt-primary)] border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        ) : payload ? (
          <>
            <div className="rounded-2xl border-2 border-line bg-white p-4 shadow-sm">
              <QRCodeSVG
                ref={qrRef}
                value={payload}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="mt-3 text-center text-xs text-fg-muted">
              Employees scan this QR code with the TeamTuned app to punch attendance.
            </p>

            <div className="mt-4 flex w-full max-w-sm items-center gap-2 rounded-lg border border-line bg-bg-subtle/50 px-3 py-2 text-xs">
              <span className="flex-1 truncate font-mono text-[11px] text-fg-muted select-all">
                {payload}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-fg-muted hover:bg-bg-subtle hover:text-fg"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="mt-6 flex w-full justify-center gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-xs font-semibold text-fg hover:bg-bg-subtle shadow-xs"
              >
                <Printer className="h-4 w-4" />
                Print QR
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--tt-primary)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 shadow-xs"
              >
                <Download className="h-4 w-4" />
                Download PNG
              </button>
            </div>
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
