'use client';

import React from 'react';
import { Check, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Pagination } from '@/components/ui/Pagination';
import { cx, text } from '@/theme/tokens';
import type { RoleDetail, RoleAuditResult } from '../../types/roles.model';

interface RoleDetailDrawerProps {
  open: boolean;
  detail: RoleDetail | null;
  isLoading: boolean;
  audit: RoleAuditResult | null;
  auditLoading: boolean;
  onAuditPageChange: (page: number) => void;
  onClose: () => void;
}

const TABS = [
  { value: 'permissions', label: 'Permissions' },
  { value: 'audit', label: 'Audit' },
] as const;

export function RoleDetailDrawer({ open, detail, isLoading, audit, auditLoading, onAuditPageChange, onClose }: RoleDetailDrawerProps) {
  const [tab, setTab] = React.useState<(typeof TABS)[number]['value']>('permissions');

  React.useEffect(() => {
    if (open) setTab('permissions');
  }, [open]);

  return (
    <Drawer open={open} onClose={onClose} title={detail ? detail.role.name : 'Role Details'}>
      {isLoading || !detail ? (
        <p className={text.body}>Loading…</p>
      ) : (
        <div className="space-y-4">
          <div>
            <SegmentedControl options={TABS} value={tab} onChange={setTab} />
          </div>

          {tab === 'permissions' ? (
            <div className="space-y-3">
              <p className={text.overline}>
                Effective permissions — what this role can actually do
              </p>
              {detail.effectivePermissions.map((category) => {
                const grantedCount = category.permissions.filter((p) => p.granted).length;
                if (grantedCount === 0) return null;
                return (
                  <div key={category.id} className="rounded-lg border border-line">
                    <div className="flex items-center justify-between bg-bg-subtle px-3 py-2">
                      <span className="text-xs font-semibold text-fg sm:text-sm">{category.name}</span>
                      <span className="text-[11px] text-fg-muted sm:text-xs">{grantedCount}/{category.permissions.length}</span>
                    </div>
                    <ul className="divide-y divide-line/60">
                      {category.permissions.filter((p) => p.granted).map((perm) => (
                        <li key={perm.code} className="flex items-center gap-2 px-3 py-2">
                          <Check className="h-3.5 w-3.5 shrink-0 text-[var(--tt-success)]" />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-medium text-fg sm:text-sm">{perm.name}</span>
                            {perm.description && <span className={cx(text.caption, 'block truncate')}>{perm.description}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {detail.role.permissions.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-line bg-bg-subtle px-3 py-3 text-sm text-fg-muted">
                  <X className="h-4 w-4 shrink-0" />
                  This role has no permissions yet.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className={text.overline}>Permission changes — grants and revokes over time</p>
              {auditLoading || !audit ? (
                <p className={text.body}>Loading…</p>
              ) : audit.entries.length === 0 ? (
                <p className={text.body}>No permission changes recorded for this role yet.</p>
              ) : (
                <>
                  <ul className="divide-y divide-line/60 rounded-lg border border-line">
                    {audit.entries.map((entry) => (
                      <li key={entry.id} className="flex items-start gap-2 px-3 py-2.5">
                        {entry.action === 'grant' ? (
                          <ArrowUpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tt-success)]" />
                        ) : (
                          <ArrowDownCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tt-danger)]" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium text-fg sm:text-sm">
                            {entry.action === 'grant' ? 'Granted' : 'Revoked'} {entry.permissionCode}
                          </span>
                          <span className={cx(text.caption, 'block')}>
                            {new Date(entry.createdAt).toLocaleString()} · {entry.source}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {audit.total > audit.pageSize && (
                    <Pagination
                      currentPage={audit.page}
                      totalPages={audit.pages}
                      totalItems={audit.total}
                      pageSize={audit.pageSize}
                      onPageChange={onAuditPageChange}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
