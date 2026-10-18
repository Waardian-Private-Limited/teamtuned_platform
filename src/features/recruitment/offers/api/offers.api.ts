import { apiClient } from '@/lib/apiClient';
import type { ApplicationDetailDto, ListResponseDto } from '../../shared/types/recruitment.dto';
import type { HireFormDto, HireResultDto, OfferBody, OfferDetailDto, OfferLetterChoice, OfferLetterFormDto, OfferListItemDto, OfferStatus } from '../types/offers.dto';

const auth = { withAuth: true } as const;

export function listOffers(p: { status?: OfferStatus | 'all'; search?: string; page?: number; pageSize?: number }) {
  return apiClient.get<ListResponseDto<OfferListItemDto>>(
    '/recruitment/offers',
    { status: p.status && p.status !== 'all' ? p.status : undefined, search: p.search || undefined, page: p.page, pageSize: p.pageSize },
    auth
  );
}

/** No GET /offers/:id in the contract: the drawer reads the application detail (offer + timeline). */
export function getApplicationDetail(applicationId: number) {
  return apiClient.get<ApplicationDetailDto & { offer?: OfferDetailDto | null }>(`/recruitment/applications/${applicationId}`, undefined, auth);
}

export function createOffer(applicationId: number, body: OfferBody) {
  return apiClient.post<OfferDetailDto>(`/recruitment/applications/${applicationId}/offer`, body, auth);
}

export function updateOffer(id: number, body: OfferBody) {
  return apiClient.put<OfferDetailDto>(`/recruitment/offers/${id}`, body, auth);
}

export function submitOffer(id: number) {
  return apiClient.post<OfferDetailDto>(`/recruitment/offers/${id}/submit`, undefined, auth);
}

/** Emails the letter (PDF attached) with a link to accept online. */
export function sendOffer(id: number, choice?: OfferLetterChoice) {
  return apiClient.post<OfferDetailDto>(`/recruitment/offers/${id}/send`, choice || {}, auth);
}

export function getLetterForm(id: number) {
  return apiClient.get<OfferLetterFormDto>(`/recruitment/offers/${id}/letter/form`, undefined, auth);
}

/** The letter PDF (DRAFT watermark before approval). Generated on demand, never stored. */
export function downloadLetter(id: number, choice?: OfferLetterChoice) {
  return apiClient<Blob>(`/recruitment/offers/${id}/letter`, { ...auth, method: 'POST', body: choice || {}, responseType: 'blob' });
}

/** The letter was shared outside the system: the offer counts as sent. */
export function markShared(id: number) {
  return apiClient.post<OfferDetailDto>(`/recruitment/offers/${id}/mark-shared`, {}, auth);
}

/** The candidate answered outside the system; an acceptance may carry the signed copy (PDF / JPG / PNG). */
export function recordResponse(id: number, body: { decision: 'accept' | 'decline'; note?: string }, signedLetter?: File | null) {
  const fd = new FormData();
  fd.append('decision', body.decision);
  if (body.note) fd.append('note', body.note);
  if (signedLetter) fd.append('signed_letter', signedLetter);
  return apiClient.post<OfferDetailDto>(`/recruitment/offers/${id}/response`, fd, auth);
}

/** Adds or replaces the signed copy of an accepted offer. */
export function uploadSignedLetter(id: number, file: File) {
  const fd = new FormData();
  fd.append('signed_letter', file);
  return apiClient.put<OfferDetailDto>(`/recruitment/offers/${id}/signed-letter`, fd, auth);
}

export function getSignedLetterUrl(id: number) {
  return apiClient.get<{ url: string; name?: string }>(`/recruitment/offers/${id}/signed-letter-url`, undefined, auth);
}

export function withdrawOffer(id: number) {
  return apiClient.post<OfferDetailDto>(`/recruitment/offers/${id}/withdraw`, undefined, auth);
}

export function getHireForm(id: number) {
  return apiClient.get<HireFormDto>(`/recruitment/offers/${id}/hire-form`, undefined, auth);
}

export function hire(id: number, body: Record<string, unknown>) {
  return apiClient.post<HireResultDto>(`/recruitment/offers/${id}/hire`, body, auth);
}
