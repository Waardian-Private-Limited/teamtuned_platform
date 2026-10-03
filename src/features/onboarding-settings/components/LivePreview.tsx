'use client';

import { Section } from '@/components/ui/FormControls';
import { Lock } from 'lucide-react';
import type { OnboardingConfigDto } from '../types/onboarding-settings.dto';

export function LivePreview({ config }: { config: OnboardingConfigDto }) {
  const visibleSteps = config.steps.filter((s) => s.visible);
  const visibleDocs = config.documents.filter((d) => d.visible);

  return (
    <div className="space-y-3 pb-2">
      <p className="text-xs text-fg-muted">What the invited employee will be asked to fill in, in this order.</p>
      {visibleSteps.map((step) => {
        const fields = step.fields.filter((f) => f.visible);
        if (!fields.length) return null;
        return (
          <Section key={step.key} title={step.label}>
            <ul className="space-y-1.5">
              {fields.map((f) => (
                <li key={f.key} className="flex items-center gap-2 text-sm text-fg">
                  <span className={f.required ? 'h-1.5 w-1.5 rounded-full bg-[var(--tt-primary)]' : 'h-1.5 w-1.5 rounded-full border border-line-strong'} />
                  <span>{f.label}</span>
                  {f.sensitive && <Lock className="h-3 w-3 text-fg-muted" aria-label="Encrypted" />}
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
      {visibleDocs.length > 0 && (
        <Section title="Documents">
          <ul className="space-y-1.5">
            {visibleDocs.map((d) => (
              <li key={d.key} className="flex items-center gap-2 text-sm text-fg">
                <span className={d.required ? 'h-1.5 w-1.5 rounded-full bg-[var(--tt-primary)]' : 'h-1.5 w-1.5 rounded-full border border-line-strong'} />
                <span>{d.label}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
