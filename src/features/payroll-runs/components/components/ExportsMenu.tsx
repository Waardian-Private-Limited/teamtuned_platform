'use client';

import React from 'react';
import { ChevronDown, Download, FileArchive, FileText, Landmark, Sheet } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { RunExportKind } from '../../hooks/useRunActions';
import type { Run } from '../../types/payrollRuns.model';
import { actionBtn, Spinner } from './controls';

const FROZEN = new Set(['finalized', 'paid']);

export function ExportsMenu({ run, busy, onExport }: { run: Run; busy: boolean; onExport: (kind: RunExportKind) => void }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const bankReady = FROZEN.has(run.status);
  const items: Array<{ kind: RunExportKind; label: string; hint: string; icon: React.ReactNode; disabled?: boolean }> = [
    { kind: 'payslips_zip', label: 'Payslips (ZIP)', hint: 'One PDF per employee', icon: <FileArchive className="h-4 w-4" /> },
    { kind: 'payslips_combined', label: 'Payslips (single PDF)', hint: 'All payslips in one file', icon: <FileText className="h-4 w-4" /> },
    { kind: 'register', label: 'Payroll sheet', hint: 'Site-wise paysheet with totals', icon: <Sheet className="h-4 w-4" /> },
    { kind: 'bank', label: 'Bank sheet', hint: bankReady ? 'Bank account salary list' : 'Available after finalize', icon: <Landmark className="h-4 w-4" />, disabled: !bankReady },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button type="button" className={actionBtn.secondary} aria-haspopup="menu" aria-expanded={open} disabled={busy} onClick={() => setOpen((v) => !v)}>
        {busy ? <Spinner /> : <Download className="h-3.5 w-3.5" />}
        <span>Exports</span>
        <ChevronDown className={cx('h-3.5 w-3.5 text-fg-muted transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="menu" className="tt-fade-in absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-[var(--tt-shadow-lg)]">
          {items.map((it) => (
            <button
              key={it.kind}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                onExport(it.kind);
              }}
              className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
            >
              <span className="mt-0.5 text-fg-muted">{it.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-fg">{it.label}</span>
                <span className="block text-[11px] text-fg-muted">{it.hint}</span>
              </span>
            </button>
          ))}
          <p className="border-t border-line px-2.5 pb-1.5 pt-2 text-[11px] text-fg-muted">Files are prepared in the Download Centre.</p>
        </div>
      )}
    </div>
  );
}
