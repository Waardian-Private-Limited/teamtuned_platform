import { Building2 } from 'lucide-react';

export function SidebarHeader({
  orgName,
  orgLogoUrl,
  collapsed,
  subtitle,
}: {
  orgName?: string | null;
  orgLogoUrl?: string | null;
  collapsed: boolean;
  subtitle: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-4 ${collapsed ? 'justify-center' : ''}`}>
      {orgLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={orgLogoUrl}
          alt={orgName || 'Organization'}
          className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-[var(--tt-shadow-sm)]"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--tt-primary)] shadow-[var(--tt-shadow-sm)]">
          <Building2 size={20} className="text-[var(--tt-on-primary)]" />
        </div>
      )}
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold leading-tight text-fg">{orgName || 'TeamTuned'}</h2>
          <p className="text-[11px] font-medium text-fg-muted">{subtitle}</p>
        </div>
      )}
    </div>
  );
}
