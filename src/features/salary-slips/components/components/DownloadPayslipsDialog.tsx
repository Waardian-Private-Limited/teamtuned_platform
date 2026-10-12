'use client';

import React from 'react';
import { Download, FileArchive, FileText } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { cx } from '@/theme/tokens';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import type { PayslipLayout } from '../../types/salarySlips.model';

interface DownloadPayslipsDialogProps {
  open: boolean;
  scopeLabel: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (layout: PayslipLayout, includeHeld: boolean) => void;
}

const LAYOUTS: { value: PayslipLayout; label: string; hint: string; icon: typeof FileText }[] = [
  { value: 'zip', label: 'ZIP of PDFs', hint: 'One PDF per employee, ready to share individually', icon: FileArchive },
  { value: 'combined', label: 'Single PDF', hint: 'All payslips in one file, ready to print', icon: FileText },
];

export function DownloadPayslipsDialog({ open, scopeLabel, busy, error, onClose, onSubmit }: DownloadPayslipsDialogProps) {
  const [layout, setLayout] = React.useState<PayslipLayout>('zip');
  const [includeHeld, setIncludeHeld] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setLayout('zip');
      setIncludeHeld(false);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title={
        <div>
          <h2 className="text-sm font-bold text-fg sm:text-base">Download payslips</h2>
          <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">{scopeLabel}. The file is prepared in the background and appears in Downloads.</p>
        </div>
      }
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={busy} icon={<Download className="h-3.5 w-3.5" />} onClick={() => onSubmit(layout, includeHeld)}>
            Download
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="File layout">
          {LAYOUTS.map(({ value, label, hint, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={layout === value}
              onClick={() => setLayout(value)}
              className={cx(
                'flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors',
                layout === value ? 'border-fg bg-bg-subtle ring-1 ring-fg' : 'border-line bg-surface hover:bg-bg-subtle'
              )}
            >
              <Icon className="h-5 w-5 text-fg" />
              <span className="text-sm font-semibold text-fg">{label}</span>
              <span className="text-[11px] leading-snug text-fg-muted">{hint}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
          <div>
            <p className="text-sm font-semibold text-fg">Include held payslips</p>
            <p className="text-[11px] text-fg-muted">Held employees are left out unless you include them.</p>
          </div>
          <Switch checked={includeHeld} onChange={setIncludeHeld} label="Include held payslips" />
        </div>
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>}
      </div>
    </Dialog>
  );
}
