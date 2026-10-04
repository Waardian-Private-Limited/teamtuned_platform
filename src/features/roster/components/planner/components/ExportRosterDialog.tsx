'use client';

import React from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { cx } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';
import { requestRosterExport } from '@/features/downloads/api/downloads.api';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';

type Format = 'pdf' | 'xlsx';

interface Props {
  open: boolean;
  rosterId: number;
  teamName: string;
  onClose: () => void;
}

const FORMATS: { value: Format; label: string; hint: string; icon: typeof FileText }[] = [
  { value: 'pdf', label: 'PDF', hint: 'Landscape, ready to print or pin on a notice board', icon: FileText },
  { value: 'xlsx', label: 'Excel', hint: 'Editable sheet with totals and a shift list', icon: FileSpreadsheet },
];

export function ExportRosterDialog({ open, rosterId, teamName, onClose }: Props) {
  const { track } = useDownloadCenter();
  const [format, setFormat] = React.useState<Format>('pdf');
  const [legend, setLegend] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const job = await requestRosterExport({ rosterId, format, includeLegend: legend });
      track(job);
      onClose();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title={
        <div>
          <h2 className="text-sm font-bold text-fg sm:text-base">Export roster</h2>
          <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">{teamName}. The file is prepared in the background and appears in Downloads.</p>
        </div>
      }
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm">Cancel</button>
          <button type="button" disabled={busy} onClick={submit} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] transition-colors hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm">
            <Download className="h-3.5 w-3.5" />
            {busy ? 'Requesting…' : 'Export'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="File format">
          {FORMATS.map(({ value, label, hint, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={format === value}
              onClick={() => setFormat(value)}
              className={cx('flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors', format === value ? 'border-fg bg-bg-subtle ring-1 ring-fg' : 'border-line bg-surface hover:bg-bg-subtle')}
            >
              <Icon className="h-5 w-5 text-fg" />
              <span className="text-sm font-semibold text-fg">{label}</span>
              <span className="text-[11px] leading-snug text-fg-muted">{hint}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
          <div>
            <p className="text-sm font-semibold text-fg">Include legend</p>
            <p className="text-[11px] text-fg-muted">Shift codes with timings, and what the off, leave and holiday marks mean.</p>
          </div>
          <Switch checked={legend} onChange={setLegend} label="Include legend" />
        </div>
      </div>
    </Dialog>
  );
}
