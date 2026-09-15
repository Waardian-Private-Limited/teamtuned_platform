'use client';

import { cx } from '@/theme/tokens';
import type { LoginTab } from '../../constants/auth.constants';

const TABS: Array<{ id: LoginTab; label: string }> = [
  { id: 'password', label: 'Password' },
  { id: 'otp', label: 'OTP' },
];

/**
 * Method switch.
 *
 * A track holding two pills: the selected one is a raised white surface, the
 * other is bare. The track is a hair taller than the pills so the selection
 * looks seated in it rather than painted on top.
 */
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
    <div
      role="tablist"
      className="grid grid-cols-2 gap-1 rounded-[var(--tt-radius-md)] bg-bg-subtle p-1"
    >
      {TABS.map((tab) => {
        const isSelected = value === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isSelected}
            disabled={disabled}
            onClick={() => onChange(tab.id)}
            className={cx(
              'h-10 rounded-[var(--tt-radius-sm)] text-sm font-semibold transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isSelected
                ? 'bg-surface text-fg shadow-[var(--tt-shadow-sm)]'
                : 'text-fg-muted hover:text-fg'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
