import { surface, text } from '@/theme/tokens';
import type { Account } from '../../types/auth.model';

export function AccountSummary({
  account,
  action,
}: {
  account: Pick<Account, 'organizationName' | 'displayName' | 'username' | 'email'>;
  action?: React.ReactNode;
}) {
  const name = account.displayName || account.username || account.email;
  return (
    <div className={`${surface.panel} flex items-center justify-between gap-3 px-4 py-3`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">{name}</p>
        <p className={`${text.caption} truncate`}>{account.email}</p>
        <p className={`${text.caption} truncate`}>{account.organizationName}</p>
      </div>
      {action}
    </div>
  );
}
