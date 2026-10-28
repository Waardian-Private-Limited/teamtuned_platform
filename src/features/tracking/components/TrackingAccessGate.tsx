'use client';

import { useTrackingAccess } from '../hooks/useTrackingAccess';

/** Renders a tracking page only for users the backend would serve; others see why it is empty. */
export function TrackingAccessGate({ anyOf, children }: { anyOf: string[]; children: React.ReactNode }) {
  const { allowed, loading } = useTrackingAccess(anyOf);
  if (loading) return null;
  if (!allowed) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border border-line bg-surface p-6 text-center shadow-2xs">
          <h2 className="text-sm font-semibold text-fg">No access to live tracking</h2>
          <p className="mt-1 text-xs text-fg-muted">Ask an administrator for location tracking permission to see this page.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
