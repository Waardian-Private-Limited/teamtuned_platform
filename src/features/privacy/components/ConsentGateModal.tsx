'use client';

import { useAuth } from '@/providers/auth-provider';
import { useConsent } from '../hooks/useConsent';
import { ConsentSection } from './ConsentSection';
import { Button } from '@/components/ui/Button';
import { CONSENT_STRINGS } from '../constants/consentUi';

/**
 * Mounted once at the app root (RootLayout), so it pops up over whatever
 * screen the user is on — employee, org-admin, superadmin, any of them —
 * the moment the session says a privacy notice hasn't been accepted, rather
 * than requiring a dedicated route the app has to navigate to first.
 */
export function ConsentGateModal() {
  const { nextStep, refreshSession } = useAuth();
  if (nextStep !== 'consent') return null;
  return <ConsentGateModalInner refreshSession={refreshSession} />;
}

function ConsentGateModalInner({ refreshSession }: { refreshSession: () => Promise<void> }) {
  const vm = useConsent();

  const onAccept = async () => {
    const ok = await vm.accept();
    if (ok) await refreshSession();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl">
        <ConsentSection vm={vm} />
        {!vm.loading && !vm.loadError && (
          <div className="mt-4 flex justify-end">
            <Button onClick={onAccept} loading={vm.submitting} loadingLabel={CONSENT_STRINGS[vm.lang].accepting} disabled={!vm.canAccept}>
              {CONSENT_STRINGS[vm.lang].accept}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
