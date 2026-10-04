'use client';

import { useCallback, useMemo } from 'react';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/lib/hooks/usePermission';
import {
  assignOpenShift, cancelSwap, claimOpenShift, closeOpenShift, decideAvailability, decideClaim, decideSwap,
  listAvailability, listOpenShifts, listSwaps, withdrawClaim,
} from '../api/roster.api';
import { ROSTER_PERMISSIONS } from '../constants/roster.constants';
import type { ClaimRow, OpenShift, SwapRequest } from '../types/roster.types';
import { todayLocal } from '../utils/rosterTime';
import { useEmployeeRosterQuery } from './useEmployeeRosterQuery';

export interface PendingClaim {
  claim: ClaimRow;
  shift: OpenShift;
}

export function useRequests() {
  const { employee_id: myId } = useAuth();
  const { can } = usePermission();
  const canApprove = can(ROSTER_PERMISSIONS.APPROVE);
  const canView = can(ROSTER_PERMISSIONS.VIEW);
  const canEdit = can(ROSTER_PERMISSIONS.EDIT);
  const today = todayLocal();

  const mine = useEmployeeRosterQuery(() => listSwaps({ scope: 'mine' }), 'req-mine');
  const open = useEmployeeRosterQuery(() => listOpenShifts({ scope: 'mine', from: today }), `req-open:${today}`);
  const approvals = useEmployeeRosterQuery(() => listSwaps({ scope: 'approvals' }), 'req-approvals');
  const availability = useEmployeeRosterQuery(() => listAvailability({ scope: 'approvals' }), 'req-availability', canApprove);
  const manage = useEmployeeRosterQuery(() => listOpenShifts({ scope: 'manage', from: today, status: 'open' }), `req-manage:${today}`, canView);

  const run = useCallback(async (job: () => Promise<unknown>, success: string, reload: (() => Promise<void>)[]): Promise<string | null> => {
    try {
      await job();
      showSuccess(success);
      await Promise.all(reload.map((r) => r()));
      return null;
    } catch (err) {
      const message = messageOf(err);
      showError(message);
      return message;
    }
  }, []);

  const { reload: reloadMine } = mine;
  const { reload: reloadOpen } = open;
  const { reload: reloadApprovals } = approvals;
  const { reload: reloadAvailability } = availability;
  const { reload: reloadManage } = manage;

  const mySwaps = useMemo(() => mine.data?.requests || [], [mine.data]);
  const approvalSwaps = useMemo(() => approvals.data?.requests || [], [approvals.data]);
  const availabilityItems = useMemo(() => (availability.data?.availability || []).filter((a) => a.status === 'pending'), [availability.data]);
  const unfilled = useMemo(() => (manage.data?.open_shifts || []).filter((o) => o.status === 'open'), [manage.data]);
  const claimsToDecide = useMemo<PendingClaim[]>(
    () => unfilled.flatMap((shift) => (shift.claims || []).filter((c) => c.status === 'pending').map((claim) => ({ claim, shift }))),
    [unfilled]
  );

  const needsMyResponse = useCallback(
    (r: SwapRequest) => r.status === 'pending' && r.to_employee_id === myId && r.chain_snapshot[r.current_level]?.type === 'peer',
    [myId]
  );

  const pendingMine = mySwaps.filter((r) => r.status === 'pending');
  const decidable = approvalSwaps.filter((r) => r.can_decide);
  const approvalsCount = decidable.length + availabilityItems.length + claimsToDecide.length;
  const showApprovals = canApprove || approvalSwaps.length > 0 || claimsToDecide.length > 0 || (canEdit && unfilled.length > 0);

  return {
    myId, canApprove, canEdit, canView, today,
    mySwaps, pendingMine, openShifts: open.data?.open_shifts || [], approvalSwaps, availabilityItems, unfilled, claimsToDecide,
    counts: {
      mine: pendingMine.length,
      open: (open.data?.open_shifts || []).filter((o) => o.eligible && !o.claim).length,
      approvals: approvalsCount,
    },
    showApprovals, needsMyResponse,
    loading: {
      mine: mine.loading && !mine.data,
      open: open.loading && !open.data,
      approvals: (approvals.loading && !approvals.data) || (canApprove && availability.loading && !availability.data) || (canView && manage.loading && !manage.data),
    },
    errors: { mine: mine.error, open: open.error, approvals: approvals.error, availability: availability.error, manage: manage.error },
    cancel: (id: number) => run(() => cancelSwap(id), 'Request cancelled', [reloadMine]),
    respond: (id: number, decision: 'approved' | 'rejected', note?: string) =>
      run(() => decideSwap(id, { decision, note: note || undefined }), decision === 'approved' ? 'Accepted' : 'Declined', [reloadMine, reloadApprovals]),
    decide: (id: number, decision: 'approved' | 'rejected', note?: string) =>
      run(() => decideSwap(id, { decision, note: note || undefined }), decision === 'approved' ? 'Request approved' : 'Request declined', [reloadMine, reloadApprovals]),
    claim: (id: number) => run(() => claimOpenShift(id), 'Claim sent', [reloadOpen, reloadManage]),
    withdraw: (claimId: number) => run(() => withdrawClaim(claimId), 'Claim withdrawn', [reloadOpen, reloadManage]),
    decideAvailabilityItem: (id: number, decision: 'approved' | 'rejected') =>
      run(() => decideAvailability(id, { decision }), decision === 'approved' ? 'Approved' : 'Declined', [reloadAvailability]),
    decideClaimItem: (id: number, decision: 'approved' | 'rejected') =>
      run(() => decideClaim(id, { decision }), decision === 'approved' ? 'Claim approved' : 'Claim declined', [reloadManage, reloadOpen]),
    assign: (id: number, employeeId: number) => run(() => assignOpenShift(id, { employeeId }), 'Shift assigned', [reloadManage, reloadOpen]),
    close: (id: number) => run(() => closeOpenShift(id), 'Open shift closed', [reloadManage, reloadOpen]),
  };
}
