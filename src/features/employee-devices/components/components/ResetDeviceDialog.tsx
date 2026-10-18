'use client';

import { Dialog } from '@/components/ui/Dialog';
import { text } from '@/theme/tokens';

interface ResetDeviceDialogProps {
  open: boolean;
  employeeName: string;
  deviceName: string | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ResetDeviceDialog({ open, employeeName, deviceName, isSaving, onClose, onConfirm }: ResetDeviceDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reset registered phone"
      maxWidthClassName="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onConfirm}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-danger)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-danger)]/90 active:scale-[0.98] disabled:opacity-50 sm:text-sm"
          >
            {isSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            <span>Reset phone</span>
          </button>
        </>
      }
    >
      <div className="space-y-2.5">
        <p className={text.body}>
          This signs <span className="font-semibold text-fg">{employeeName}</span> out of the app on their phone
          {deviceName ? <> (<span className="font-semibold text-fg">{deviceName}</span>)</> : null} only. It does not sign them out on the web.
        </p>
        <p className={text.body}>
          The next phone they sign in on in the app becomes their registered phone. Web sign-ins are not limited and stay signed in.
        </p>
      </div>
    </Dialog>
  );
}
