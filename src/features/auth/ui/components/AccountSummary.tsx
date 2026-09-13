import { surface, text } from '@/theme/tokens';
import type { Account } from '../../model/auth.model';

// The "you're signing in as…" strip shown above a credential form.
export function AccountSummary({
  account,
  action,
}: {
  account: Pick<Account, 'organizationName' | 'username' | 'email'>;
  action?: React.ReactNode;
}) {
  return (
    <div className={`${surface.panel} flex items-center justify-between gap-3 px-4 py-3`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">{account.organizationName}</p>
        <p className={`${text.caption} truncate`}>{account.username || account.email}</p>
      </div>
      {action}
    </div>
  );
}
