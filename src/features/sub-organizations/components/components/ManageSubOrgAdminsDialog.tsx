'use client';

import React from 'react';
import { Search, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/subOrganizations.api';
import type { SubOrgAdminDto, SubOrgAdminCandidateDto } from '../../api/subOrganizations.api';
import { invalidateManageableSubOrgs } from '../../hooks/useManageableSubOrgs';
import { messageOf } from '../../utils/asyncAction';
import type { SubOrganization } from '../../types/sub-organizations.model';

interface ManageSubOrgAdminsDialogProps {
  open: boolean;
  subOrg: SubOrganization | null;
  onClose: () => void;
}

// Assign/remove the users who administer a sub-organization. Membership here is
// authorization: an assigned user's scope covers this sub-org's departments,
// roles, sites, policies and employees.
export function ManageSubOrgAdminsDialog({ open, subOrg, onClose }: ManageSubOrgAdminsDialogProps) {
  const [admins, setAdmins] = React.useState<SubOrgAdminDto[]>([]);
  const [candidates, setCandidates] = React.useState<SubOrgAdminCandidateDto[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [busyUserId, setBusyUserId] = React.useState<number | null>(null);

  const loadAdmins = React.useCallback(async () => {
    if (!subOrg) return;
    setLoading(true);
    try {
      const res = await api.listSubOrgAdmins(subOrg.id);
      setAdmins(res.admins || []);
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, [subOrg]);

  React.useEffect(() => {
    if (open && subOrg) {
      setSearch('');
      setCandidates([]);
      loadAdmins();
    }
  }, [open, subOrg, loadAdmins]);

  // Debounced candidate search.
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        const res = await api.listSubOrgAdminCandidates(search);
        setCandidates(res.candidates || []);
      } catch {
        setCandidates([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [open, search]);

  const assignedIds = React.useMemo(() => new Set(admins.map((a) => a.user_id)), [admins]);

  const assign = async (userId: number) => {
    if (!subOrg) return;
    setBusyUserId(userId);
    try {
      await api.assignSubOrgAdmin(subOrg.id, userId);
      invalidateManageableSubOrgs();
      showSuccess('Admin assigned');
      await loadAdmins();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusyUserId(null);
    }
  };

  const remove = async (userId: number) => {
    if (!subOrg) return;
    setBusyUserId(userId);
    try {
      await api.removeSubOrgAdmin(subOrg.id, userId);
      invalidateManageableSubOrgs();
      showSuccess('Admin removed');
      await loadAdmins();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusyUserId(null);
    }
  };

  const unassignedCandidates = candidates.filter((c) => !assignedIds.has(c.user_id));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-sm font-bold text-fg sm:text-base">Manage admins</h2>
          <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
            {subOrg ? `${subOrg.name} — who can manage this sub-organization's data` : ''}
          </p>
        </div>
      }
      footer={
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
        >
          Done
        </button>
      }
    >
      <div className="space-y-4">
        {/* Current admins */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Current admins</label>
          {loading ? (
            <div className="flex h-16 items-center justify-center text-fg-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : admins.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-fg-muted">
              No admins assigned. This sub-organization is managed only by org admins.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {admins.map((a) => (
                <li key={a.user_id} className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-fg sm:text-sm">{a.name}</div>
                    <div className="truncate text-[11px] text-fg-muted">{a.email}</div>
                  </div>
                  <button
                    type="button"
                    disabled={busyUserId === a.user_id}
                    onClick={() => remove(a.user_id)}
                    className="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)] disabled:opacity-40"
                    aria-label="Remove admin"
                  >
                    {busyUserId === a.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add admin */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Add an admin</label>
          <div className="relative flex h-10 w-full items-center rounded-lg border border-line bg-surface px-3 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name or email…"
              className="ml-2 w-full min-w-0 border-none bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-0"
            />
          </div>
          {unassignedCandidates.length > 0 && (
            <ul className="mt-2 max-h-56 space-y-1.5 overflow-auto">
              {unassignedCandidates.map((c) => (
                <li key={c.user_id} className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-fg sm:text-sm">{c.name}</div>
                    <div className="truncate text-[11px] text-fg-muted">{c.email}</div>
                  </div>
                  <button
                    type="button"
                    disabled={busyUserId === c.user_id}
                    onClick={() => assign(c.user_id)}
                    className="ml-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-2.5 text-xs font-semibold text-[var(--tt-on-primary)] transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:opacity-40"
                  >
                    {busyUserId === c.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                    <span>Add</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
