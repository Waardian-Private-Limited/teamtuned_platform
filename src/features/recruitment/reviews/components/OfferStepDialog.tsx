'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, FileDown, FilePlus2, UserCheck } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { cx } from '@/theme/tokens';
import { btn } from '../../interviews/lib/ui';
import { AskReviewForm, OfflineDecisionForm, downloadReviewPack } from './ReviewForms';

type Step = 'choose' | 'review' | 'offline';

/**
 * Moving a candidate to Offer: decide how. Ask employees to review first; download the review pack
 * for someone outside the system and record their decision; create the offer now; or just move.
 */
export function OfferStepDialog({ open, applicationId, candidateName, onClose, onDone, onCreateOffer, onSkip }: {
  open: boolean;
  applicationId: number;
  candidateName?: string;
  onClose: () => void;
  onDone: () => void;
  onCreateOffer?: () => void;
  onSkip?: () => void;
}) {
  const [step, setStep] = useState<Step>('choose');
  const [downloading, setDownloading] = useState(false);
  useEffect(() => { if (open) setStep('choose'); }, [open]);

  const finish = () => { onDone(); onClose(); };
  const option = 'flex w-full items-start gap-3 rounded-xl border border-line p-3.5 text-left transition-colors hover:border-line-strong hover:bg-bg-subtle';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      title={
        <div>
          <h2 className="text-base font-semibold text-fg sm:text-lg">{step === 'review' ? 'Send for review' : step === 'offline' ? 'Record a decision' : 'Move to Offer'}</h2>
          {candidateName && <p className="text-xs text-fg-muted">{candidateName}</p>}
        </div>
      }
      footer={step === 'choose' && onSkip ? <button type="button" onClick={() => { onSkip(); onClose(); }} className={btn.secondary}>Move without a step</button> : undefined}
    >
      {step === 'choose' && (
        <div className="space-y-2.5">
          <button type="button" onClick={() => setStep('review')} className={option}>
            <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-fg" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-fg">Send for review</span>
              <span className="block text-xs text-fg-muted">Ask employees (hiring manager, MD…) to check the resume, tests and interviews and say whether to make an offer.</span>
            </span>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
          </button>
          <div className={cx(option, 'cursor-default hover:bg-transparent')}>
            <FileDown className="mt-0.5 h-5 w-5 shrink-0 text-fg" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-fg">Review outside TeamTuned</span>
              <span className="block text-xs text-fg-muted">For someone who does not use the system: download one PDF with everything (resume included), then record their decision.</span>
              <span className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" disabled={downloading} onClick={async () => { setDownloading(true); await downloadReviewPack(applicationId, candidateName || 'candidate'); setDownloading(false); }} className={btn.small}>
                  {downloading ? 'Preparing…' : 'Download review pack'}
                </button>
                <button type="button" onClick={() => setStep('offline')} className={btn.small}>Record their decision</button>
              </span>
            </span>
          </div>
          {onCreateOffer && (
            <button type="button" onClick={() => { onCreateOffer(); onClose(); }} className={option}>
              <FilePlus2 className="mt-0.5 h-5 w-5 shrink-0 text-fg" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-fg">Create the offer now</span>
                <span className="block text-xs text-fg-muted">Enter the terms. Nothing is sent: you download or email the letter when ready.</span>
              </span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
            </button>
          )}
        </div>
      )}
      {step === 'review' && <AskReviewForm applicationId={applicationId} onDone={finish} onCancel={() => setStep('choose')} />}
      {step === 'offline' && <OfflineDecisionForm applicationId={applicationId} onDone={finish} onCancel={() => setStep('choose')} />}
    </Dialog>
  );
}
