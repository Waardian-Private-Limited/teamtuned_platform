'use client';

import { ChevronRight, UserRound, X } from 'lucide-react';
import { StepShell } from './StepShell';
import { AuthButton } from '../components/AuthButton';
import { button, cx, surface, text } from '@/theme/tokens';
import type { RememberedAccount } from '../../model/auth.model';

/**
 * Saved accounts on this device. Shown first when more than one is stored, so
 * a shared machine or a multi-org user picks instead of retyping an email.
 */
export function RememberedAccountsStep({
  accounts,
  onSelect,
  onForget,
  onUseAnother,
  isLoading,
}: {
  accounts: RememberedAccount[];
  onSelect: (entry: RememberedAccount) => void;
  onForget: (accountId: string) => void;
  onUseAnother: () => void;
  isLoading: boolean;
}) {
  return (
    <StepShell title="Pick an account" subtitle="Saved on this device.">
      <ul className="space-y-2">
        {accounts.map((entry) => (
          <li key={entry.account.id} className={cx(surface.card, 'flex items-center')}>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onSelect(entry)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-l-[var(--tt-radius-lg)] px-4 py-3 text-left transition-colors hover:bg-bg-subtle disabled:opacity-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-subtle">
                <UserRound className="h-4 w-4 text-fg-muted" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">
                  {entry.account.organizationName}
                </span>
                <span className={cx(text.caption, 'block truncate')}>
                  {entry.account.username || entry.email}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onForget(entry.account.id)}
              aria-label={`Remove ${entry.account.organizationName}`}
              className="mr-2 rounded-full p-2 text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <AuthButton variant="secondary" onClick={onUseAnother} disabled={isLoading}>
        Use a different account
      </AuthButton>
    </StepShell>
  );
}

/** Inline link used on the password step to get back to the saved list. */
export function SwitchAccountLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={button.link}>
      Switch
    </button>
  );
}
