import { FileSignature } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/datetime';
import { OFFER_STATUS_LABELS } from '../../constants/recruitment.constants';
import type { OfferSummary } from '../../types/recruitment.model';
import { formatMoney } from '../../utils/format';
import { Chip, EmptyTab, KV, SmallButton } from './parts';

export function OfferTab({ offer, onOffer }: { offer: OfferSummary | null; onOffer?: () => void }) {
  if (!offer) {
    return (
      <EmptyTab
        title="No offer yet"
        description="Draft the job terms when the candidate clears the interviews."
        action={onOffer ? <SmallButton primary icon={FileSignature} onClick={onOffer}>Create offer</SmallButton> : undefined}
      />
    );
  }
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-fg">{offer.designation || 'Offer'}</p>
          {offer.sentAt && <p className="mt-0.5 text-xs text-fg-muted">Sent {formatDateTime(offer.sentAt)}</p>}
        </div>
        <Chip strong={offer.status === 'accepted'}>{OFFER_STATUS_LABELS[offer.status] || offer.status}</Chip>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <KV label="Annual CTC"><span className="tabular-nums">{offer.annualCtc !== null ? formatMoney(offer.annualCtc) : ''}</span></KV>
        <KV label="Joining date">{offer.joiningDate ? formatDate(offer.joiningDate) : ''}</KV>
        <KV label="Offer expires">{offer.expiresOn ? formatDate(offer.expiresOn) : ''}</KV>
        <KV label="Responded">{offer.respondedAt ? formatDateTime(offer.respondedAt) : ''}</KV>
      </dl>
      {onOffer && (
        <div className="mt-4 flex justify-end">
          <SmallButton icon={FileSignature} onClick={onOffer}>Open offer</SmallButton>
        </div>
      )}
    </div>
  );
}
