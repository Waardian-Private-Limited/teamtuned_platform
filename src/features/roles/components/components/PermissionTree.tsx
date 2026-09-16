'use client';

import React from 'react';
import { ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import type { PermissionCategory } from '../../types/roles.model';

interface PermissionTreeProps {
  categories: PermissionCategory[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

// Accordion of permission categories, each with a select-all/clear pair and a
// 2-column checkbox grid — shared by the role form, the permission-set
// editor, and the bulk-apply drawer's "extra permissions" step.
export function PermissionTree({ categories, selected, onChange, disabled, isLoading }: PermissionTreeProps) {
  const [openMap, setOpenMap] = React.useState<Record<number, boolean>>({});

  React.useEffect(() => {
    if (!categories.length) return;
    setOpenMap((prev) => {
      if (Object.keys(prev).length) return prev;
      const next: Record<number, boolean> = {};
      categories.forEach((c) => { next[c.id] = false; });
      if (categories[0]) next[categories[0].id] = true;
      return next;
    });
  }, [categories]);

  const toggleCode = (code: string) => {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(next);
  };

  const selectAll = (category: PermissionCategory) => {
    if (disabled) return;
    const next = new Set(selected);
    category.permissions.forEach((p) => next.add(p.code));
    onChange(next);
  };

  const clearCategory = (category: PermissionCategory) => {
    if (disabled) return;
    const next = new Set(selected);
    category.permissions.forEach((p) => next.delete(p.code));
    onChange(next);
  };

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-11 rounded-lg bg-bg-subtle" />
        ))}
      </div>
    );
  }

  if (!categories.length) {
    return <p className={text.body}>No permissions are available for this organization yet.</p>;
  }

  return (
    <div className="space-y-2">
      {categories.map((category) => {
        const isOpen = Boolean(openMap[category.id]);
        const selectedCount = category.permissions.filter((p) => selected.has(p.code)).length;
        return (
          <div key={category.id} className="overflow-hidden rounded-lg border border-line">
            <button
              type="button"
              onClick={() => setOpenMap((prev) => ({ ...prev, [category.id]: !prev[category.id] }))}
              className="flex w-full items-center justify-between gap-3 bg-bg-subtle px-3 py-2.5 text-left transition-colors hover:bg-bg-subtle/70"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-xs font-semibold text-fg sm:text-sm">{category.name}</span>
                <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted sm:text-[11px]">
                  {selectedCount}/{category.permissions.length}
                </span>
              </span>
              {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-fg-muted" /> : <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" />}
            </button>

            {isOpen && (
              <div className="border-t border-line p-3">
                <div className="mb-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => selectAll(category)}
                    className="text-[11px] font-semibold text-[var(--tt-primary)] hover:underline disabled:opacity-40 disabled:no-underline sm:text-xs"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => clearCategory(category)}
                    className="text-[11px] font-semibold text-fg-muted hover:underline disabled:opacity-40 disabled:no-underline sm:text-xs"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {category.permissions.map((perm) => {
                    const isChecked = selected.has(perm.code);
                    return (
                      <button
                        key={perm.code}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleCode(perm.code)}
                        className={cx(
                          'flex items-start gap-2 rounded-md border p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                          isChecked ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5' : 'border-line hover:bg-bg-subtle'
                        )}
                      >
                        {isChecked ? (
                          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tt-primary)]" />
                        ) : (
                          <Square className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-fg sm:text-sm">{perm.name}</span>
                          {perm.description && (
                            <span className={cx(text.caption, 'block truncate')}>{perm.description}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
