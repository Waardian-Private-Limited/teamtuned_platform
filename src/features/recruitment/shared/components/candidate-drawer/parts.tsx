import React from 'react';
import { cx } from '@/theme/tokens';

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">{children}</h3>
      {aside}
    </div>
  );
}

export function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-fg-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-fg">{children || <span className="text-fg-subtle">—</span>}</dd>
    </div>
  );
}

export function SmallButton({ children, onClick, primary, disabled, icon: Icon }: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        primary
          ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]'
          : 'border border-line bg-surface text-fg hover:bg-bg-subtle'
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function EmptyTab({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line px-4 py-8 text-center">
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-fg-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span className={cx(
      'inline-flex h-5 items-center rounded border px-1.5 text-[10px] font-semibold',
      strong ? 'border-fg bg-fg text-fg-inverted' : 'border-line bg-bg-subtle text-fg-muted'
    )}>
      {children}
    </span>
  );
}
