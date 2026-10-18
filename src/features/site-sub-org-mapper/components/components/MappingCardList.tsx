'use client';

import { cx, text } from '@/theme/tokens';
import type { Mapping } from '../../types/siteSubOrgMapper.model';
import { MappingRowActions } from './MappingRowActions';
import { addedOn, siteMeta } from './MappingTable';

interface MappingCardListProps {
  mappings: Mapping[];
  canDelete: boolean;
  onDelete: (mapping: Mapping) => void;
}

export function MappingCardList({ mappings, canDelete, onDelete }: MappingCardListProps) {
  return (
    <>
      {mappings.map((mapping) => (
        <div key={mapping.id} className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-fg">{mapping.siteName}</div>
            {siteMeta(mapping) && <div className={cx(text.caption, 'mt-0.5 truncate')}>{siteMeta(mapping)}</div>}
            <div className="mt-2 text-sm text-fg-muted">
              {mapping.subOrgName}
              {mapping.subOrgCode && <span className="ml-1.5 text-xs text-fg-subtle">{mapping.subOrgCode}</span>}
            </div>
            <div className={cx(text.caption, 'mt-1')}>Added {addedOn(mapping)}</div>
          </div>
          <MappingRowActions mapping={mapping} canDelete={canDelete} onDelete={onDelete} />
        </div>
      ))}
    </>
  );
}
