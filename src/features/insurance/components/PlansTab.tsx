'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/insurance.api';
import { ILLUSTRATIONS } from '../constants/insurance.constants';
import { usePlans } from '../hooks/useInsuranceData';
import type { Plan } from '../types/insurance.types';
import { PlanCard } from './components/PlanCard';
import { PlanDrawer } from './components/PlanDrawer';
import { RenewDialog } from './components/RenewDialog';

interface PlansTabProps {
  today: string;
  canManage: boolean;
  subOrgId: number | null;
  onSubOrgChange: (id: number | null) => void;
  onOpenCoverage: (planId: number) => void;
  onChanged: () => void;
}

export function PlansTab({ today, canManage, subOrgId, onSubOrgChange, onOpenCoverage, onChanged }: PlansTabProps) {
  const [view, setView] = React.useState<'active' | 'archived'>('active');
  const { plans, isLoading, error, refetch } = usePlans(subOrgId, view);
  const [editing, setEditing] = React.useState<Plan | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [renewing, setRenewing] = React.useState<Plan | null>(null);
  const [deleting, setDeleting] = React.useState<Plan | null>(null);
  const [busy, setBusy] = React.useState(false);

  const done = () => {
    refetch();
    onChanged();
  };

  const toggleArchive = async (plan: Plan) => {
    try {
      await api.setPlanArchived(plan.id, plan.status === 'active');
      showSuccess(plan.status === 'active' ? 'Plan archived' : 'Plan restored');
      done();
    } catch (err) {
      showError(messageOf(err));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deletePlan(deleting.id);
      showSuccess('Plan deleted');
      setDeleting(null);
      done();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl fitText value={view} onChange={setView} options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]} />
          <SubOrgFilter value={subOrgId} onChange={onSubOrgChange} />
        </div>
        {canManage && <Btn variant="primary" onClick={() => setCreating(true)} icon={<Plus className="h-3.5 w-3.5" />}>New plan</Btn>}
      </div>

      {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl border border-line bg-bg-subtle" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState
            illustration={ILLUSTRATIONS.health}
            title={view === 'active' ? 'No insurance plans yet' : 'No archived plans'}
            description={view === 'active' ? 'Add your group policy to cover employees and recover their share with payroll.' : undefined}
            action={view === 'active' && canManage ? { label: 'New plan', onClick: () => setCreating(true) } : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              today={today}
              canManage={canManage}
              onEdit={() => setEditing(p)}
              onRenew={() => setRenewing(p)}
              onArchive={() => toggleArchive(p)}
              onDelete={() => setDeleting(p)}
              onOpenCoverage={() => onOpenCoverage(p.id)}
            />
          ))}
        </div>
      )}

      <PlanDrawer open={creating || Boolean(editing)} plan={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); done(); }} />
      <RenewDialog plan={renewing} onClose={() => setRenewing(null)} onRenewed={() => { setRenewing(null); done(); }} />
      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        maxWidthClassName="max-w-sm"
        title="Delete plan?"
        footer={
          <>
            <Btn onClick={() => setDeleting(null)}>Cancel</Btn>
            <Btn variant="danger" busy={busy} onClick={confirmDelete}>Delete</Btn>
          </>
        }
      >
        <p className="p-4 text-sm text-fg-muted sm:p-6">{deleting?.name} has nobody covered. This cannot be undone.</p>
      </Dialog>
    </div>
  );
}
