'use client';

import { Check } from 'lucide-react';
import { btnPrimary } from '../../catalog-shared/catalogUi';
import { Spinner } from '../../catalog-shared/Spinner';

interface Props {
  label: string;
  saving: boolean;
  disabled?: boolean;
  error?: string;
  onSave: () => void;
  extra?: React.ReactNode;
}

export function TabFooter({ label, saving, disabled, error, onSave, extra }: Props) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
      <button type="button" disabled={saving || disabled} onClick={onSave} className={btnPrimary}>
        {saving ? <Spinner /> : <Check className="h-3.5 w-3.5" />}
        <span>{label}</span>
      </button>
      {extra}
      {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
    </div>
  );
}
