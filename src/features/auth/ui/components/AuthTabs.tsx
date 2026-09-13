'use client';

import { cx } from '@/theme/tokens';
import type { LoginTab } from '../../constants/auth.constants';

const TABS: Array<{ id: LoginTab; label: string }> = [
  { id: 'password', label: 'Password' },
  { id: 'otp', label: 'OTP' },
];

// Segmented control that picks the credential type.
export function AuthTabs({
  value,
  onChange,
  disabled,
}: {
  value: LoginTab;
  onChange: (tab: LoginTab) => void;
  disabled?: boolean;
}) {
  return (
    <div role="tablist" className="grid grid-cols-2 gap-1 rounded-[var(--tt-radius-md)] bg-bg-subtle p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={value === tab.id}
          disabled={disabled}
          onClick={() => onChange(tab.id)}
          className={cx(
            'rounded-[var(--tt-radius-sm)] px-4 py-2 text-sm font-semibold transition-colors duration-200 disabled:opacity-50',
            value === tab.id
              ? 'bg-surface text-fg shadow-[var(--tt-shadow-sm)]'
              : 'text-fg-muted hover:text-fg'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
