'use client';

import { Button } from '@/components/ui/Button';
import type { useConsent } from '../hooks/useConsent';

function stripMarkdown(text: string) {
  return text.replace(/^#+\s*/gm, '');
}

/**
 * The privacy-notice + purpose checkboxes, shown either standalone
 * (`/consent`) or embedded as the onboarding wizard's last step. The
 * caller owns the `useConsent()` instance and what happens after
 * acceptance — this component only renders it.
 */
export function ConsentSection({ vm }: { vm: ReturnType<typeof useConsent> }) {
  if (vm.loading) {
    return <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />;
  }
  if (vm.loadError) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-[var(--tt-danger)]">{vm.loadError}</p>
        <Button variant="secondary" onClick={vm.retryLoad}>Retry</Button>
      </div>
    );
  }

  const notice = vm.consent!.notice;
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-fg">{notice.title}</h2>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-line bg-surface p-3 text-sm leading-relaxed text-fg-muted whitespace-pre-wrap">
        {stripMarkdown(notice.body_md)}
      </div>
      <div className="space-y-2">
        {notice.purposes.map((p) => (
          <label key={p.key} className="flex items-start gap-2.5 text-sm text-fg">
            <input
              type="checkbox"
              checked={vm.checked[p.key] ?? false}
              disabled={vm.accepted}
              onChange={(e) => vm.toggle(p.key, e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line accent-[var(--tt-primary)]"
            />
            <span>{p.label}{p.required && <span className="text-[var(--tt-danger)]"> *</span>}</span>
          </label>
        ))}
      </div>
      {vm.submitError && <p className="text-xs font-medium text-[var(--tt-danger)]">{vm.submitError}</p>}
    </div>
  );
}
