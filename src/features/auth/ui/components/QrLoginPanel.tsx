'use client';

import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Smartphone } from 'lucide-react';
import { QR, type QrStatus } from '../../constants/auth.constants';
import { button, text } from '@/theme/tokens';

interface QrLoginPanelProps {
  token: string | null;
  status: QrStatus;
  isLoading: boolean;
  onRefresh: () => void;
}

// Scan-to-sign-in panel. Hidden on small screens, where there is no second device.
export function QrLoginPanel({ token, status, isLoading, onRefresh }: QrLoginPanelProps) {
  const isLive = Boolean(token) && status !== 'expired';

  return (
    <div className="flex flex-col items-center w-full mt-2.5">
      {/* Divider */}
      <div className="relative flex items-center justify-center w-full mb-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <span className="relative bg-white px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          or scan to sign in
        </span>
      </div>

      {/* QR Code Container */}
      <div className="relative rounded-xl border border-slate-200/90 bg-white p-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-2.5">
        {isLive ? (
          <>
            <QRCodeSVG
              value={QR.deepLink(token!)}
              size={84}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="M"
              style={{ display: 'block' }}
            />
            {status === 'scanned' && (
              <div className="absolute inset-1.5 flex flex-col items-center justify-center gap-1 rounded-lg bg-white/95">
                <span className="flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-[#0066ff]">
                  <Smartphone className="h-3.5 w-3.5 text-white" />
                </span>
                <p className="text-center text-[10px] font-semibold leading-tight text-slate-900">
                  Scanned · Confirm on phone
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded bg-bg-subtle">
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-fg border-t-transparent" />
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-fg-subtle" />
                <p className="text-[9px] text-fg-subtle">Code expired</p>
              </>
            )}
          </div>
        )}
      </div>

      {status === 'expired' && !isLoading && (
        <button type="button" onClick={onRefresh} className={`${button.link} text-xs flex items-center gap-1 mb-2`}>
          <RefreshCw className="h-3 w-3 text-[#0066ff]" />
          Get a new code
        </button>
      )}

      {/* Scan instruction with crisp badge icon */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-medium text-center">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-50 text-[#0066ff] shrink-0">
          <Smartphone className="h-3 w-3" strokeWidth={2.4} />
        </span>
        <span>
          Scan with <span className="font-semibold text-slate-900">TeamTuned app</span> to sign in
        </span>
      </div>
    </div>
  );
}
