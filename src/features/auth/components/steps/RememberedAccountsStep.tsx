'use client';

import { ChevronRight, UserRound, X } from 'lucide-react';
import { StepShell } from './StepShell';
import { AuthButton } from '../components/AuthButton';
import { cx, surface, text } from '@/theme/tokens';
import type { RememberedAccount } from '../../types/auth.model';

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
        {accounts.map((entry) => {
          const name = entry.account.displayName || entry.account.username;
          const email = entry.email || entry.account.email;
          return (
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
                  <span className="block truncate text-sm font-semibold text-fg">{name}</span>
                  <span className={cx(text.caption, 'block truncate')}>{email}</span>
                  <span className={cx(text.caption, 'block truncate')}>
                    {entry.account.organizationName}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onForget(entry.account.id)}
                aria-label={`Remove ${name}`}
                className="mr-2 rounded-full p-2 text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <AuthButton variant="secondary" onClick={onUseAnother} disabled={isLoading}>
        Use a different account
      </AuthButton>
    </StepShell>
  );
}
