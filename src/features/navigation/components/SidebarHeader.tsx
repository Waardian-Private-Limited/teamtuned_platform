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
  if (collapsed) return <div className="h-3" aria-hidden="true" />;

  return (
    <div className="flex items-center gap-3 border-b border-line p-4">
      {orgLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={orgLogoUrl}
          alt={orgName || 'Organization'}
          className="h-8 w-8 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--tt-primary)]">
          <Building2 size={18} className="text-[var(--tt-on-primary)]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-bold leading-tight text-fg">{orgName || 'TeamTuned'}</h2>
        <p className="text-xs text-fg-muted">{subtitle}</p>
      </div>
    </div>
  );
}
