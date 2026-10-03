'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { cx } from '@/theme/tokens';
import { showError } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import { requestOnboardingExport } from '@/features/downloads/api/downloads.api';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';

const MAX_COMBINED = 50;

function Choice({
  selected, disabled, onSelect, title, description,
}: { selected: boolean; disabled?: boolean; onSelect: () => void; title: string; description: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cx(
        'flex-1 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        selected ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5' : 'border-line hover:bg-bg-subtle'
      )}
    >
      <p className="text-sm font-semibold text-fg">{title}</p>
      <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
    </button>
  );
}

export function DownloadProfilesDialog({
  open, onClose, employeeIds, onQueued,
}: { open: boolean; onClose: () => void; employeeIds: number[]; onQueued?: () => void }) {
  const { track } = useDownloadCenter();
  const many = employeeIds.length > 1;
  const [layout, setLayout] = useState<'combined' | 'separate'>('combined');
  const [signature, setSignature] = useState<'digital' | 'manual'>('digital');
  const [includeDocuments, setIncludeDocuments] = useState(true);
  const [includeSalary, setIncludeSalary] = useState(true);
  const [revealSensitive, setRevealSensitive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setLayout(employeeIds.length > MAX_COMBINED ? 'separate' : 'combined');
  }, [open, employeeIds.length]);

  const submit = async () => {
    setBusy(true);
    try {
      const job = await requestOnboardingExport({
        employeeIds, layout: many ? layout : 'combined', signature, includeDocuments, includeSalary, revealSensitive,
      });
      track(job);
      onQueued?.();
      onClose();
    } catch (e) {
      showError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={many ? `Download ${employeeIds.length} onboarding profiles` : 'Download onboarding profile'}
      maxWidthClassName="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" className="!h-10 !w-auto !text-sm" onClick={onClose}>Cancel</Button>
          <Button className="!h-10 !w-auto !text-sm" loading={busy} onClick={submit}>Prepare download</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {many && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">Format</p>
            <div className="flex gap-2">
              <Choice
                selected={layout === 'combined'}
                disabled={employeeIds.length > MAX_COMBINED}
                onSelect={() => setLayout('combined')}
                title="One PDF"
                description={employeeIds.length > MAX_COMBINED ? `Up to ${MAX_COMBINED} employees` : 'Every employee one after another'}
              />
              <Choice
                selected={layout === 'separate'}
                onSelect={() => setLayout('separate')}
                title="Separate PDFs"
                description="One PDF per employee, in a ZIP file"
              />
            </div>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">Signature</p>
          <div className="flex gap-2">
            <Choice
              selected={signature === 'digital'}
              onSelect={() => setSignature('digital')}
              title="Digital verification"
              description="Shows who reviewed and generated it, with a reference number. No physical signature needed."
            />
            <Choice
              selected={signature === 'manual'}
              onSelect={() => setSignature('manual')}
              title="Manual signature"
              description="Adds signature and date lines for the employee and HR to sign on paper."
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2.5 text-sm text-fg">
            <input type="checkbox" checked={includeSalary} onChange={(e) => setIncludeSalary(e.target.checked)} className="h-4 w-4 accent-[var(--tt-primary)]" />
            Include salary details (CTC, earnings and deductions)
          </label>
          <label className="flex items-center gap-2.5 text-sm text-fg">
            <input type="checkbox" checked={includeDocuments} onChange={(e) => setIncludeDocuments(e.target.checked)} className="h-4 w-4 accent-[var(--tt-primary)]" />
            Attach uploaded documents (Aadhaar, PAN, proofs) at the end
          </label>
          <label className="flex items-center gap-2.5 text-sm text-fg">
            <input type="checkbox" checked={revealSensitive} onChange={(e) => setRevealSensitive(e.target.checked)} className="h-4 w-4 accent-[var(--tt-primary)]" />
            Show full Aadhaar, PAN, bank account and UAN numbers
          </label>
          {revealSensitive && (
            <p className="pl-6 text-xs text-fg-muted">Needs the PII view permission. Each export is recorded in the access log.</p>
          )}
        </div>

        <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg-muted">
          The file is prepared in the background, so the app stays fast for everyone. Track it in the Download Centre on the right edge of the screen.
        </p>
      </div>
    </Dialog>
  );
}
