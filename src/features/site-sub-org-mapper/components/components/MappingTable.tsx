'use client';

import { cx, text } from '@/theme/tokens';
import { formatDate, orgDateOf } from '@/lib/datetime';
import type { Mapping } from '../../types/siteSubOrgMapper.model';
import { MappingRowActions } from './MappingRowActions';

interface MappingTableProps {
  mappings: Mapping[];
  canDelete: boolean;
  onDelete: (mapping: Mapping) => void;
}

const cellHeaderClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';
const cellClass = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4';

export function siteMeta(mapping: Mapping) {
  return [mapping.siteCode, mapping.siteCity].filter(Boolean).join(' · ');
}

// createdAt is a UTC instant; show the calendar day it fell on in the org.
export function addedOn(mapping: Mapping) {
  return mapping.createdAt ? formatDate(orgDateOf(mapping.createdAt)) : '—';
}

export function MappingTable({ mappings, canDelete, onDelete }: MappingTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[620px] md:min-w-0 border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(cellHeaderClass, 'w-[42%] first:rounded-tl-xl')}>Site</th>
            <th className={cellHeaderClass}>Sub-organization</th>
            <th className={cx(cellHeaderClass, 'w-36 lg:w-40 2xl:w-48')}>Added on</th>
            <th className={cx(cellHeaderClass, 'w-20 lg:w-24 2xl:w-28 text-right last:rounded-tr-xl')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((mapping) => (
            <tr key={mapping.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className={cellClass}>
                <div className="text-xs font-semibold text-fg sm:text-sm 2xl:text-base">{mapping.siteName}</div>
                {siteMeta(mapping) && <div className={cx(text.caption, 'mt-0.5 2xl:text-sm')}>{siteMeta(mapping)}</div>}
              </td>
              <td className={cellClass}>
                <div className="text-xs text-fg sm:text-sm 2xl:text-base">{mapping.subOrgName}</div>
                {mapping.subOrgCode && <div className={cx(text.caption, 'mt-0.5 2xl:text-sm')}>{mapping.subOrgCode}</div>}
              </td>
              <td className={cx(cellClass, 'whitespace-nowrap text-xs text-fg-muted sm:text-sm 2xl:text-base')}>{addedOn(mapping)}</td>
              <td className={cellClass}>
                <MappingRowActions mapping={mapping} canDelete={canDelete} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
