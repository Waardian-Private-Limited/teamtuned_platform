'use client';

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { AddButton, PageHeader, SearchBox } from '../../catalog-shared/ToolbarShell';
import type { TeamStatusFilter } from '../../../hooks/useTeamsList';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

interface Props {
  total: number;
  search: string;
  onSearch: (v: string) => void;
  status: TeamStatusFilter;
  onStatus: (v: TeamStatusFilter) => void;
  subOrgId: number | null;
  onSubOrg: (v: number | null) => void;
  canAdd: boolean;
  onAdd: () => void;
}

export function TeamsToolbar({ total, search, onSearch, status, onStatus, subOrgId, onSubOrg, canAdd, onAdd }: Props) {
  return (
    <PageHeader title="Teams" count={total} hint="Groups of people you build rosters for — a site, ward, department or crew.">
      <SearchBox value={search} onChange={onSearch} placeholder="Search teams…" />
      <div className="w-full sm:w-52">
        <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={onStatus} />
      </div>
      <SubOrgFilter value={subOrgId} onChange={onSubOrg} />
      {canAdd && <AddButton label="New team" onClick={onAdd} />}
    </PageHeader>
  );
}
