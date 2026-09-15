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

export function QrLoginPanel({ token, status, isLoading, onRefresh }: QrLoginPanelProps) {
  const isLive = Boolean(token) && status !== 'expired';

  return (
    <div className="mt-5 flex w-full flex-col items-center">
      <div className="relative mb-4 flex w-full items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <span className={`relative bg-surface px-3 ${text.overline}`}>or scan to sign in</span>
      </div>

      <div className="mb-3 rounded-[var(--tt-radius-md)] border border-line bg-surface p-2">
        {isLive ? (
          <div className="relative">
            <QRCodeSVG
              value={QR.deepLink(token!)}
              size={88}
              bgColor="#ffffff"
              fgColor="#0a0a0a"
              level="M"
              style={{ display: 'block' }}
            />
            {status === 'scanned' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface/95">
                <span className="flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-[var(--tt-primary)]">
                  <Smartphone className="h-3.5 w-3.5 text-[var(--tt-on-primary)]" />
                </span>
                <p className="text-center text-[10px] font-semibold leading-tight text-fg">
                  Scanned · confirm on phone
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-[88px] w-[88px] flex-col items-center justify-center gap-1.5 rounded-[var(--tt-radius-sm)] bg-bg-subtle">
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-fg border-t-transparent" />
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-fg-subtle" />
                <p className="text-[10px] text-fg-subtle">Code expired</p>
              </>
            )}
          </div>
        )}
      </div>

      {status === 'expired' && !isLoading ? (
        <button type="button" onClick={onRefresh} className={`${button.link} flex items-center gap-1.5 text-xs`}>
          <RefreshCw className="h-3 w-3" />
          Get a new code
        </button>
      ) : (
        <p className="text-center text-xs text-fg-muted">
          Scan with the <span className="font-semibold text-fg">TeamTuned app</span>
        </p>
      )}
    </div>
  );
}
