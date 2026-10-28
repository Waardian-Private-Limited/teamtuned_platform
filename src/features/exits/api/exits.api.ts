import { apiClient } from '@/lib/apiClient';
import type {
  CareerStint, ClearanceItem, ClearanceTemplate, ClearanceTemplateInput, ExitInsights, ExitSettlement, InterviewForm, InterviewResponse, MyInterview, RehireInput,
  ExitCase, ExitCaseDetail, ExitDocType, ExitDocument, ExitList, ExitOffer, ExitPreview, ExitTimelineEvent, HikeInput, HikePreview,
  MyExit, OfferInput, PublicExitDocuments, RehireEligibility, ShortfallAction, StartExitInput,
} from '../types/exits';

const auth = { withAuth: true } as const;

// Employee self-service
export const getMine = () => apiClient.get<MyExit>('/exits/me', undefined, auth);
export const previewResign = (requested_lwd?: string) => apiClient.post<ExitPreview>('/exits/me/preview', { requested_lwd }, auth);
export const resign = (body: { reason_category: string; reason_text?: string; requested_lwd?: string }) => apiClient.post<ExitCase>('/exits/me', body, auth);
export const withdrawMine = (note?: string) => apiClient.post<ExitCase>('/exits/me/withdraw', { note }, auth);
export const respondToOffer = (offerId: number, action: 'accept' | 'decline', note?: string) =>
  apiClient.post<ExitCase>(`/exits/me/offers/${offerId}/respond`, { action, note }, auth);
export const myDocuments = () => apiClient.get<ExitDocument[]>('/exits/me/documents', undefined, auth);
export const myDocumentUrl = (docId: number) => apiClient.get<{ url: string }>(`/exits/me/documents/${docId}/download`, undefined, auth);

// HR and approvers
export const listExits = (p: { status?: string; type?: string; q?: string; page?: number; limit?: number }, signal?: AbortSignal) =>
  apiClient.get<ExitList>('/exits', { status: p.status, type: p.type, q: p.q, page: p.page, limit: p.limit }, { ...auth, signal });
export const getExit = (id: number) => apiClient.get<ExitCaseDetail>(`/exits/${id}`, undefined, auth);
export const startExit = (body: StartExitInput) => apiClient.post<ExitCase>('/exits', body, auth);
export const changeLastDay = (id: number, body: { last_working_day: string; shortfall_action?: ShortfallAction; note: string }) =>
  apiClient.patch<ExitCase>(`/exits/${id}/last-day`, body, auth);
export const setFlags = (id: number, body: { regrettable?: boolean; rehire_eligibility?: RehireEligibility; rehire_note?: string }) =>
  apiClient.patch<ExitCase>(`/exits/${id}/flags`, body, auth);
export const timeline = (id: number) => apiClient.get<ExitTimelineEvent[] | { events: ExitTimelineEvent[] }>(`/exits/${id}/timeline`, undefined, auth);

export const createOffer = (id: number, body: OfferInput) => apiClient.post<ExitOffer>(`/exits/${id}/offers`, body, auth);
export const previewOffer = (id: number, hike: HikeInput) => apiClient.post<HikePreview>(`/exits/${id}/offers/preview`, hike, auth);
export const sendOffer = (id: number, offerId: number) => apiClient.post<ExitOffer>(`/exits/${id}/offers/${offerId}/send`, {}, auth);
export const withdrawOffer = (id: number, offerId: number) => apiClient.post<ExitOffer>(`/exits/${id}/offers/${offerId}/withdraw`, {}, auth);

export const documents = (id: number) => apiClient.get<ExitDocument[]>(`/exits/${id}/documents`, undefined, auth);
export const generateDocument = (id: number, doc_type: ExitDocType) => apiClient.post<ExitDocument>(`/exits/${id}/documents/generate`, { doc_type }, auth);
export const documentUrl = (id: number, docId: number) => apiClient.get<{ url: string }>(`/exits/${id}/documents/${docId}/download`, undefined, auth);

// Phase 2: clearance and settlement
export const clearanceTemplates = () => apiClient.get<ClearanceTemplate[]>('/exits/clearance-templates', undefined, auth);
export const saveClearanceTemplate = (id: number | null, body: Partial<ClearanceTemplateInput>) =>
  id ? apiClient.patch<ClearanceTemplate>(`/exits/clearance-templates/${id}`, body, auth) : apiClient.post<ClearanceTemplate>('/exits/clearance-templates', body, auth);
export const clearance = (id: number) => apiClient.get<ClearanceItem[]>(`/exits/${id}/clearance`, undefined, auth);
export const addClearanceItem = (id: number, body: { title: string; owner_type: string; owner_ref?: string | null }) =>
  apiClient.post<ClearanceItem>(`/exits/${id}/clearance/items`, body, auth);
export const updateClearanceItem = (id: number, itemId: number, body: { status: 'pending' | 'cleared' | 'waived'; recovery_amount?: number; note?: string }) =>
  apiClient.patch<ClearanceItem>(`/exits/${id}/clearance/items/${itemId}`, body, auth);
export const myClearance = async (): Promise<ClearanceItem[]> => {
  const r = await apiClient.get<ClearanceItem[] | { items: ClearanceItem[] }>('/exits/me/clearance', undefined, auth);
  return Array.isArray(r) ? r : r.items ?? [];
};
export const markMyClearance = (caseId: number, itemId: number) => apiClient.patch<ClearanceItem>(`/exits/${caseId}/clearance/items/${itemId}`, { status: 'cleared' }, auth);

export const settlement = (id: number) => apiClient.get<ExitSettlement | null>(`/exits/${id}/settlement`, undefined, auth);
export const computeSettlement = (id: number) => apiClient.post<ExitSettlement>(`/exits/${id}/settlement/compute`, {}, auth);
export const overrideSettlementLine = (id: number, lineId: number, body: { amount: number; reason: string }) =>
  apiClient.patch<ExitSettlement>(`/exits/${id}/settlement/lines/${lineId}`, body, auth);
export const submitSettlement = (id: number, body: { due_on?: string; pay_mode?: 'next_run' | 'off_cycle' }) =>
  apiClient.post<ExitSettlement>(`/exits/${id}/settlement/submit`, body, auth);
export const markSettlementPaid = (id: number, body: { paid_on?: string }) => apiClient.post<ExitSettlement>(`/exits/${id}/settlement/mark-paid`, body, auth);

// Phase 3: interview, insights, rehire
export const interviewForm = () => apiClient.get<InterviewForm>('/exits/interview-form', undefined, auth);
export const saveInterviewForm = (body: InterviewForm) => apiClient.put<InterviewForm>('/exits/interview-form', body, auth);
export const myInterview = () => apiClient.get<MyInterview>('/exits/me/interview', undefined, auth);
export const submitMyInterview = (body: { answers: InterviewResponse['answers']; hide_from_manager: boolean }) =>
  apiClient.post<InterviewResponse>('/exits/me/interview', body, auth);
export const insights = (p: { from?: string; to?: string }, signal?: AbortSignal) => apiClient.get<ExitInsights>('/exits/insights', p, { ...auth, signal });
export const rehire = (employeeId: number, body: RehireInput) => apiClient.post<{ employee_id: number }>(`/employees/${employeeId}/rehire`, body, auth);

export const career = async (employeeId: number): Promise<CareerStint[]> => {
  const r = await apiClient.get<CareerStint[] | { stints: CareerStint[] }>(`/employees/${employeeId}/career`, undefined, auth);
  return Array.isArray(r) ? r : r.stints ?? [];
};

// Approvals inbox (generic endpoint, filtered to exit cases)
export interface ExitInboxItem {
  id: number; requestType: string; typeLabel: string; subjectId: number; status: string;
  requester: { id: number; name: string; code: string | null };
  stepName: string | null; createdAt: string; decidedAt: string | null;
  summary: Record<string, unknown> | null;
}
export const exitInbox = (tab: 'pending' | 'history' | 'all', page: number, signal?: AbortSignal) =>
  apiClient.get<{ items: ExitInboxItem[]; page: number; pageSize: number; hasMore: boolean }>('/approvals/inbox', { tab, type: 'exit_case', page }, { ...auth, signal });

// Public, no login: the ex-employee document link
export const publicDocuments = (token: string, signal?: AbortSignal) =>
  apiClient.get<PublicExitDocuments>(`/public/exit-documents/${encodeURIComponent(token)}`, undefined, { signal, withCredentials: false });
export const publicDocumentUrl = (token: string, docId: number) =>
  apiClient.get<{ url: string }>(`/public/exit-documents/${encodeURIComponent(token)}/${docId}`, undefined, { withCredentials: false });
