'use client';

import { Trash2 } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import type { Mapping } from '../../types/siteSubOrgMapper.model';

interface MappingRowActionsProps {
  mapping: Mapping;
  canDelete: boolean;
  onDelete: (mapping: Mapping) => void;
}

const iconButtonClass =
  'rounded-[var(--tt-radius-sm)] p-1.5 2xl:p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)] disabled:cursor-not-allowed disabled:opacity-40';

export function MappingRowActions({ mapping, canDelete, onDelete }: MappingRowActionsProps) {
  if (!canDelete) return <span className="block text-right text-xs text-fg-subtle">—</span>;

  return (
    <div className="flex items-center justify-end">
      <Tooltip content="Delete mapping" align="end">
        <button type="button" onClick={() => onDelete(mapping)} aria-label="Delete mapping" className={iconButtonClass}>
          <Trash2 className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
        </button>
      </Tooltip>
    </div>
  );
}
