'use client';

import { useState } from 'react';
import { CheckCircle2, Download, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { button, cx, heading, text } from '@/theme/tokens';
import { useOffer } from '../hooks/useOffer';
import type { OfferInfo } from '../types/careers.types';
import { formatDateOnly, formatDateTime, formatMoney } from '../utils/format';
import { Checkbox, TextArea, TextInput } from './controls';
import { CompanyMark, PublicShell, StatusScreen } from './PublicShell';

const normaliseName = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

function Terms({ offer }: { offer: OfferInfo }) {
  const rows: Array<[string, string | null]> = [
    ['Role', offer.designation || null],
    ['Department', offer.department],
    ['Location', offer.location],
    ['Employment type', offer.employmentType],
    ['Joining date', formatDateOnly(offer.joiningDate)],
    ['Annual CTC', offer.annualCtc !== null ? formatMoney(offer.annualCtc, offer.currency) : null],
    ['Probation', offer.probationMonths !== null ? `${offer.probationMonths} month${offer.probationMonths === 1 ? '' : 's'}` : null],
    ['Notice period', offer.noticePeriodDays !== null ? `${offer.noticePeriodDays} days` : null],
    ['Respond by', formatDateOnly(offer.expiresOn)],
  ];
  return (
    <dl className="divide-y divide-line rounded-[var(--tt-radius-lg)] border border-line">
      {rows
        .filter(([, v]) => v)
        .map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 px-5 py-4">
            <dt className="text-sm text-fg-muted">{label}</dt>
            <dd className="text-right text-sm font-semibold text-fg">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

function LetterLink({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cx(button.secondary, '!h-12')}>
      <Download className="h-4 w-4" aria-hidden="true" /> Download offer letter (PDF)
    </a>
  );
}

export function OfferPage({ token }: { token: string }) {
  const vm = useOffer(token);
  const [dialog, setDialog] = useState<'accept' | 'decline' | null>(null);
  const [name, setName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ name?: string; confirm?: string }>({});

  const offer = vm.offer;
  const company = offer?.company ?? null;

  if (vm.state === 'loading') {
    return (
      <PublicShell width="narrow">
        <div className="animate-pulse py-10" aria-busy="true" aria-label="Loading offer">
          <div className="h-12 w-12 rounded-[var(--tt-radius-md)] bg-bg-subtle" />
          <div className="mt-6 h-9 w-2/3 rounded bg-bg-subtle" />
          <div className="mt-10 h-72 rounded-[var(--tt-radius-lg)] bg-bg-subtle" />
        </div>
      </PublicShell>
    );
  }

  if (vm.state === 'invalid') {
    return (
      <PublicShell width="narrow">
        <StatusScreen title="This link is not valid" description="Check that you opened the full link from your email, or contact the recruiter for a new one." />
      </PublicShell>
    );
  }

  if (vm.state === 'error' || !offer) {
    return (
      <PublicShell width="narrow">
        <StatusScreen
          title="We could not load your offer"
          description={vm.error ?? 'Please try again.'}
          action={<button type="button" onClick={vm.reload} className={button.secondary}>Try again</button>}
        />
      </PublicShell>
    );
  }

  const companyName = company?.name || 'the company';

  if (offer.status === 'withdrawn') {
    return (
      <PublicShell company={company} width="narrow">
        <StatusScreen title="This offer has been withdrawn" description={`${companyName} has withdrawn this offer. Contact the recruiter if you have questions.`} />
      </PublicShell>
    );
  }
  if (offer.status === 'expired') {
    return (
      <PublicShell company={company} width="narrow">
        <StatusScreen title="This offer has expired" description={`The time to respond to this offer has passed. Contact ${companyName} if you would still like to discuss it.`} />
      </PublicShell>
    );
  }

  const openDialog = (d: 'accept' | 'decline') => {
    vm.clearRespondError();
    setErrors({});
    setDialog(d);
  };

  const onAccept = async () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Type your full name to sign.';
    else if (normaliseName(name) !== normaliseName(offer.candidateName)) e.name = `Type your name exactly as shown: ${offer.candidateName}`;
    if (!confirmed) e.confirm = 'Please confirm that you accept the offer.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const ok = await vm.respond('accept', { signatureName: name.trim().replace(/\s+/g, ' ') });
    if (ok) setDialog(null);
  };

  const onDecline = async () => {
    const ok = await vm.respond('decline', { note });
    if (ok) setDialog(null);
  };

  const answered = offer.status === 'accepted' || offer.status === 'declined';
  const busy = vm.responding !== null;
  const nameError = errors.name ?? (vm.respondError?.field === 'signature_name' ? vm.respondError.message : undefined);
  const generalError = vm.respondError && vm.respondError.field !== 'signature_name' && vm.respondError.field !== 'note' ? vm.respondError.message : null;

  return (
    <PublicShell company={company} width="narrow">
      <div className="py-2 sm:py-6">
        {company && <CompanyMark company={company} size={48} />}
        <p className={cx(text.overline, 'mt-6')}>Offer of employment</p>
        <h1 className={cx(heading.lg, 'mt-2 break-words')}>
          {offer.candidateName ? `${offer.candidateName}, ` : ''}
          {offer.designation ? `your offer for ${offer.designation}` : 'your offer'}
        </h1>
        {company?.name && <p className={cx(text.lead, 'mt-2')}>{company.name}</p>}

        {answered && (
          <div role="status" className="mt-8 flex items-start gap-3 rounded-[var(--tt-radius-lg)] border border-line bg-bg-subtle p-5">
            {offer.status === 'accepted' ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-fg" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-fg" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-fg">{offer.status === 'accepted' ? 'You accepted this offer' : 'You declined this offer'}</p>
              <p className={cx(text.body, 'mt-1')}>
                {offer.status === 'accepted'
                  ? `Signed as ${offer.signatureName || offer.candidateName}${offer.respondedAt ? ` on ${formatDateTime(offer.respondedAt)}` : ''}. ${companyName} will email you the next steps to set up your account and complete onboarding.`
                  : `${offer.respondedAt ? `Declined on ${formatDateTime(offer.respondedAt)}. ` : ''}Thank you for letting ${companyName} know.`}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8">
          <Terms offer={offer} />
        </div>

        <div className="mt-6">
          <LetterLink url={offer.letterUrl} />
        </div>

        {!answered && (
          <div className="mt-10 border-t border-line pt-8">
            <h2 className={heading.sm}>Your response</h2>
            <p className={cx(text.body, 'mt-1')}>
              Read the offer letter before responding. Your response is final.
              {offer.expiresOn ? ` Please respond by ${formatDateOnly(offer.expiresOn)}.` : ''}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button onClick={() => openDialog('accept')}>Accept offer</Button>
              <Button variant="secondary" onClick={() => openDialog('decline')}>Decline</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={dialog === 'accept'}
        onClose={() => !busy && setDialog(null)}
        title="Accept this offer"
        maxWidthClassName="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)} disabled={busy} className={cx(button.secondary, '!h-11 !w-auto !px-5')}>Cancel</button>
            <Button onClick={onAccept} loading={vm.responding === 'accept'} loadingLabel="Accepting…" className="!h-11 !w-auto !px-5">Accept and sign</Button>
          </>
        }
      >
        <div className="space-y-5">
          <p className={text.body}>
            To sign, type your full name exactly as shown: <strong className="text-fg">{offer.candidateName}</strong>
          </p>
          <TextInput
            label="Full name"
            required
            autoComplete="name"
            value={name}
            onChange={(v) => {
              setName(v);
              setErrors((e) => ({ ...e, name: undefined }));
            }}
            error={nameError}
            maxLength={160}
          />
          <Checkbox
            checked={confirmed}
            onChange={(v) => {
              setConfirmed(v);
              setErrors((e) => ({ ...e, confirm: undefined }));
            }}
            error={errors.confirm}
          >
            I have read the offer letter and accept this offer from {companyName}{offer.designation ? ` for the role of ${offer.designation}` : ''}.
          </Checkbox>
          {generalError && <p role="alert" className={cx(text.error, 'text-sm')}>{generalError}</p>}
        </div>
      </Dialog>

      <Dialog
        open={dialog === 'decline'}
        onClose={() => !busy && setDialog(null)}
        title="Decline this offer?"
        maxWidthClassName="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)} disabled={busy} className={cx(button.secondary, '!h-11 !w-auto !px-5')}>Cancel</button>
            <Button variant="danger" onClick={onDecline} loading={vm.responding === 'decline'} loadingLabel="Declining…" className="!h-11 !w-auto !px-5">Decline offer</Button>
          </>
        }
      >
        <div className="space-y-5">
          <p className={text.body}>This cannot be undone. You can tell {companyName} why, if you like.</p>
          <TextArea
            label="Note"
            value={note}
            onChange={setNote}
            rows={4}
            maxLength={500}
            error={vm.respondError?.field === 'note' ? vm.respondError.message : undefined}
            hint={`${note.length}/500`}
          />
          {generalError && <p role="alert" className={cx(text.error, 'text-sm')}>{generalError}</p>}
        </div>
      </Dialog>
    </PublicShell>
  );
}
