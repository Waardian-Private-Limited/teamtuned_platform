'use client';

import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ILLUSTRATIONS } from '../../constants/petty-cash.constants';

export { Block, CategoryIcon, Fact, FormError, PageHeader, Panel, primaryBtn, secondaryBtn } from '@/features/expense-bills/components/Primitives';

export function NoAccess({ what }: { what: string }) {
  return (
    <div className="flex h-full flex-1 items-center justify-center rounded-xl border border-line bg-surface p-6">
      <EmptyState illustration={ILLUSTRATIONS.locked} title="You don’t have access" description={`Ask your administrator for permission to see ${what}.`} />
    </div>
  );
}

export function FeatureOff({ what }: { what: string }) {
  return (
    <div className="flex h-full flex-1 items-center justify-center rounded-xl border border-line bg-surface p-6">
      <EmptyState illustration={ILLUSTRATIONS.locked} title="Not switched on" description={`${what} is not enabled for your organization. Ask your TeamTuned administrator to turn it on.`} />
    </div>
  );
}

/** The page shell: gates on the feature, then on the permission codes. */
export function Gate({ enabled, allowed, what, children }: { enabled: boolean; allowed: boolean; what: string; children: React.ReactNode }) {
  if (!enabled) return <FeatureOff what="Petty cash" />;
  if (!allowed) return <NoAccess what={what} />;
  return <>{children}</>;
}
