'use client';

import { Drawer } from '@/components/ui/Drawer';
import { cx, text } from '@/theme/tokens';
import type { DepartmentHeadsPanel, HeadCandidate } from '../../types/departments.model';
import { HeadPicker } from './HeadPicker';

interface DepartmentHeadsDrawerProps {
  open: boolean;
  panel: DepartmentHeadsPanel | null;
  isLoading: boolean;
  isSaving: boolean;
  candidates: HeadCandidate[];
  candidatesLoading: boolean;
  onSearchCandidates: (term: string) => void;
  onAssign: (siteId: number | null, employeeId: number) => void;
  onRemove: (siteId: number | null) => void;
  onClose: () => void;
}

export function DepartmentHeadsDrawer({
  open,
  panel,
  isLoading,
  isSaving,
  candidates,
  candidatesLoading,
  onSearchCandidates,
  onAssign,
  onRemove,
  onClose,
}: DepartmentHeadsDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title={panel ? `Heads — ${panel.department.name}` : 'Department Heads'}>
      {isLoading || !panel ? (
        <p className={text.body}>Loading…</p>
      ) : (
        <div className="space-y-5">
          <HeadPicker
            label="Organization-wide head"
            head={panel.orgWideHead}
            candidates={candidates}
            candidatesLoading={candidatesLoading}
            disabled={isSaving}
            onSearch={onSearchCandidates}
            onAssign={(employeeId) => onAssign(null, employeeId)}
            onRemove={() => onRemove(null)}
          />

          {panel.sites.length > 0 && (
            <div className="space-y-5 border-t border-line pt-5">
              <p className={cx(text.overline)}>Per-site heads</p>
              {panel.sites.map((site) => (
                <HeadPicker
                  key={site.siteId}
                  label={site.siteName}
                  head={site.head}
                  candidates={candidates}
                  candidatesLoading={candidatesLoading}
                  disabled={isSaving}
                  onSearch={onSearchCandidates}
                  onAssign={(employeeId) => onAssign(site.siteId, employeeId)}
                  onRemove={() => onRemove(site.siteId)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
