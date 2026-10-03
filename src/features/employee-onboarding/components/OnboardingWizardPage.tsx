'use client';

import { Fragment, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { showError, showInfo } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/FormControls';
import { useConsent } from '@/features/privacy/hooks/useConsent';
import { ConsentSection } from '@/features/privacy/components/ConsentSection';
import { useOnboardingWizard } from '../hooks/useOnboardingWizard';
import { useProceedToDashboard } from '../hooks/useProceedToDashboard';
import { OnboardingFieldInput } from './OnboardingFieldInput';
import { DocumentUploadRow } from './DocumentUploadRow';
import { TextField } from '@/components/ui/FormControls';

export function OnboardingWizardPage() {
  const vm = useOnboardingWizard();
  const consentVm = useConsent();
  const { proceed, busy: proceeding } = useProceedToDashboard();
  const isUnderReview = vm.state?.status === 'submitted';
  const { checkStatus: refreshStatus } = vm;

  useEffect(() => {
    if (!isUnderReview) return;
    const onFocus = () => {
      if (document.visibilityState === 'visible') refreshStatus().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [isUnderReview, refreshStatus]);

  const checkStatus = async () => {
    try {
      const next = await vm.checkStatus();
      if (next === 'submitted') showInfo('Still under review. HR has not responded yet.');
    } catch (e) {
      showError(messageOf(e));
    }
  };

  if (vm.loading) {
    return (
      <div className="flex h-[100dvh] flex-col bg-bg-subtle" aria-busy="true">
        <div className="h-14 animate-pulse border-b border-line bg-surface" />
        <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-5 py-6">
          <div className="h-4 w-1/3 animate-pulse rounded bg-line" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
        <div className="h-16 animate-pulse border-t border-line bg-surface" />
      </div>
    );
  }

  if (vm.loadError) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-bg-subtle px-6 text-center">
        <p className="text-sm text-[var(--tt-danger)]">{vm.loadError}</p>
        <Button onClick={vm.retryLoad}>Retry</Button>
      </div>
    );
  }

  const status = vm.state?.status ?? 'draft';

  if (status === 'submitted' || status === 'approved') {
    const approved = status === 'approved';
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-bg-subtle px-6 text-center">
        {!approved && (
          <div className="mb-3 w-40 select-none sm:w-48 2xl:w-60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vectors/review.svg" alt="" width={576} height={800} className="h-auto w-full object-contain" />
          </div>
        )}
        <h1 className="text-xl font-bold text-fg">{approved ? 'Onboarding complete' : 'Submitted for review'}</h1>
        <p className="max-w-sm text-sm text-fg-muted">
          {approved
            ? 'Your onboarding has been approved. Welcome aboard!'
            : 'Your details have been sent to HR. We will let you know once they are reviewed.'}
        </p>
        {approved ? (
          <Button loading={proceeding} onClick={proceed}>Proceed to dashboard</Button>
        ) : (
          <Button variant="secondary" className="!w-auto" loading={vm.isCheckingStatus} onClick={checkStatus}>
            <RefreshCw className="h-4 w-4" /> Check status
          </Button>
        )}
      </div>
    );
  }

  const step = vm.onDocumentsPage ? null : vm.steps[vm.currentStepIndex];
  const totalPages = vm.steps.length + 1;
  const pageIndex = vm.onDocumentsPage ? vm.steps.length : vm.currentStepIndex;

  return (
    <div className="mx-auto flex h-[100dvh] max-w-xl flex-col bg-bg-subtle">
      <div className="border-b border-line bg-surface px-5 py-4">
        <h1 className="text-base font-bold text-fg">Employee Onboarding</h1>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-subtle">
            <div
              className="h-full rounded-full bg-[var(--tt-primary)] transition-all"
              style={{ width: `${((pageIndex + 1) / totalPages) * 100}%` }}
            />
          </div>
          <span className="text-xs text-fg-muted">{vm.isSaving ? 'Saving…' : 'Saved'}</span>
        </div>
      </div>

      {status === 'changes_requested' && (
        <div className="bg-[var(--tt-danger)]/5 px-5 py-3">
          <p className="text-sm font-semibold text-[var(--tt-danger)]">Changes requested</p>
          <p className="text-xs text-fg-muted">
            {vm.reviewRestricted
              ? 'HR asked you to correct only the items below. Everything else is locked.'
              : 'HR asked for a few corrections. Update the highlighted fields and submit again.'}
          </p>
          {vm.hasRejectedDocuments && !vm.onDocumentsPage && (
            <button type="button" onClick={vm.openDocuments} className="mt-1.5 text-xs font-semibold text-[var(--tt-danger)] underline">
              Go to documents to re-upload
            </button>
          )}
          {Object.values(vm.state?.remarks ?? {}).some((r) => r.trim()) && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
              {Object.entries(vm.state?.remarks ?? {})
                .filter(([, r]) => r.trim())
                .map(([key, r]) => (
                  <li key={key} className="text-xs text-[var(--tt-danger)]">
                    {vm.remarkLabel(key) ? `${vm.remarkLabel(key)}: ` : ''}
                    {r}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {step && (
          <Section title={step.label}>
            <div className="space-y-4">
              {step.fields.map((field) => {
                const isPermanent = field.key.startsWith('permanent_address_');
                return (
                  <Fragment key={field.key}>
                    {field.key === 'permanent_address_line1' && (
                      <label className="flex items-center gap-2.5 text-sm text-fg">
                        <input
                          type="checkbox"
                          checked={vm.sameAsCurrent}
                          disabled={vm.reviewRestricted}
                          onChange={(e) => vm.setSameAsCurrent(e.target.checked)}
                          className="h-4 w-4 rounded border-line accent-[var(--tt-primary)]"
                        />
                        Permanent address same as current
                      </label>
                    )}
                    {!(isPermanent && vm.sameAsCurrent) && (
                    <OnboardingFieldInput
                      field={field}
                      value={vm.values[field.key]}
                      onChange={(v) => vm.setValue(field.key, v)}
                      errorText={vm.fieldErrors[field.key] ?? (vm.flagNoteFor(field.key) ? `HR: ${vm.flagNoteFor(field.key)}` : undefined)}
                      hint={vm.fetching[field.key] ? 'Fetching details…' : undefined}
                      disabled={!vm.canEditField(field.key)}
                    />
                    )}
                  </Fragment>
                );
              })}
            </div>
          </Section>
        )}

        {vm.onDocumentsPage && (
          <div className="space-y-4">
            {vm.state!.config.documents.map((doc) => (
              <Section
                key={doc.key}
                title={<>{doc.label}{doc.required && <span className="text-[var(--tt-danger)]"> *</span>}</>}
                description={doc.helpText || undefined}>
                <div className="space-y-2">
                  {doc.numberRequired && (
                    <TextField
                      label={`${doc.label} number`}
                      required
                      value={vm.documentNumberFor(doc)}
                      onChange={(v) => vm.setDocumentNumber(doc.key, v)}
                      disabled={!vm.canUploadDocument(doc.key, 'front')}
                      autoComplete="off"
                    />
                  )}
                  <DocumentUploadRow
                    label={doc.sides === 2 ? 'Front side' : doc.label}
                    accept={doc.accept}
                    uploaded={vm.documents.find((d) => d.doc_type_key === doc.key && d.side === 'front')}
                    isUploading={!!vm.uploadingKeys[`${doc.key}:front`]}
                    progress={vm.uploadProgress[`${doc.key}:front`] || 0}
                    onPick={(file) => vm.uploadDocument(doc.key, 'front', file, vm.documentNumberFor(doc).trim() || undefined)}
                    locked={!vm.canUploadDocument(doc.key, 'front')}
                    errorText={vm.documentErrors[doc.key]}
                  />
                  {doc.sides === 2 && (
                    <DocumentUploadRow
                      label="Back side"
                      accept={doc.accept}
                      uploaded={vm.documents.find((d) => d.doc_type_key === doc.key && d.side === 'back')}
                      isUploading={!!vm.uploadingKeys[`${doc.key}:back`]}
                      progress={vm.uploadProgress[`${doc.key}:back`] || 0}
                      onPick={(file) => vm.uploadDocument(doc.key, 'back', file)}
                      locked={!vm.canUploadDocument(doc.key, 'back')}
                    />
                  )}
                </div>
              </Section>
            ))}
            <Section title="Privacy Notice">
              <ConsentSection vm={consentVm} />
            </Section>
            {vm.submitError && Object.keys(vm.documentErrors).length === 0 && Object.keys(vm.fieldErrors).length === 0 && (
              <p className="text-sm font-medium text-[var(--tt-danger)]">{vm.submitError}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 border-t border-line bg-surface px-5 py-4">
        {pageIndex > 0 && (
          <Button variant="secondary" onClick={vm.previousStep} className="flex-1">
            Back
          </Button>
        )}
        <Button
          onClick={async () => {
            if (!vm.onDocumentsPage) {
              await vm.nextStep();
              return;
            }
            if (!consentVm.accepted) {
              if (!consentVm.canAccept) return;
              const consented = await consentVm.accept();
              if (!consented) return;
            }
            await vm.submit();
          }}
          disabled={vm.onDocumentsPage && (consentVm.submitting || (!consentVm.accepted && !consentVm.canAccept))}
          loading={vm.isSubmitting || (vm.onDocumentsPage && consentVm.submitting)}
          loadingLabel="Submitting…"
          className="flex-[2]"
        >
          {vm.onDocumentsPage ? 'Submit' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
