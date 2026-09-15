'use client';

import { ChevronDown, ChevronRight, Folder, type LucideIcon } from 'lucide-react';
import { cx, nav } from '@/theme/tokens';
import { NavItem } from './NavItem';
import type { NavGroup as NavGroupNode } from '../types/nav.model';

/**
 * Icon shown for a group's own button on the collapsed rail — its label and
 * chevron are hidden there, and with every group closed by default (open
 * state is derived from the active route; nothing is active on first paint
 * or an unmapped page) a collapsed rail with no representative icon reads
 * as fully empty. Falls back to the first link found anywhere in the
 * subtree; a bare Folder icon only if a group somehow has none (filterNav
 * guarantees a visible group has at least one visible descendant, so this
 * is unreachable in practice — kept only as a non-blank fallback).
 */
function representativeIcon(group: NavGroupNode): LucideIcon | undefined {
  for (const child of group.children) {
    if (child.kind === 'link') return child.icon;
    const icon = representativeIcon(child);
    if (icon) return icon;
  }
  return undefined;
}

/**
 * One collapsible section. Recurses for nested groups (the Inventory tree
 * is three levels deep) instead of the legacy pattern of hand-rolling a
 * second, differently-styled button+chevron block for each extra level.
 */
export function NavGroup({
  group,
  depth,
  collapsed,
  isOpen,
  onToggle,
  onNavigate,
}: {
  group: NavGroupNode;
  depth: number;
  collapsed: boolean;
  isOpen: (id: string) => boolean;
  onToggle: (id: string, depth: number) => void;
  onNavigate?: () => void;
}) {
  const open = isOpen(group.id);
  const Icon = collapsed ? representativeIcon(group) ?? Folder : undefined;

  return (
    <div className={depth > 0 ? 'mt-1' : undefined}>
      <button
        type="button"
        onClick={() => onToggle(group.id, depth)}
        title={collapsed ? group.label : undefined}
        className={cx(
          'flex w-full items-center rounded-[var(--tt-radius-control)] px-3 py-2 transition-colors hover:bg-bg-subtle',
          collapsed ? 'justify-center' : 'justify-between',
          depth === 0 && 'mb-1 mt-2'
        )}
      >
        {Icon && <Icon size={18} className="shrink-0 text-fg" />}
        {!collapsed && <span className={nav.groupLabel}>{group.label}</span>}
        {!collapsed && (
          open
            ? <ChevronDown size={14} className="text-fg" />
            : <ChevronRight size={14} className="text-fg" />
        )}
      </button>

      {open && (
        <div className="space-y-1">
          {group.children.map((child) =>
            child.kind === 'link' ? (
              <NavItem key={child.href} link={child} collapsed={collapsed} indent={depth} onNavigate={onNavigate} />
            ) : (
              <NavGroup
                key={child.id}
                group={child}
                depth={depth + 1}
                collapsed={collapsed}
                isOpen={isOpen}
                onToggle={onToggle}
                onNavigate={onNavigate}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
