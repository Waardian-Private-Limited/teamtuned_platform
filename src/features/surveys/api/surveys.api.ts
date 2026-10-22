import { apiClient } from '@/lib/apiClient';

const B = '/surveys';
const auth = { withAuth: true };

export type QuestionType = 'rating' | 'enps' | 'choice' | 'text';
export interface Question { id: string; type: QuestionType; text: string; required?: boolean; options?: string[] }
export type SurveyStatus = 'draft' | 'open' | 'closed';
export interface Survey {
  id: number; sub_organization_id: number | null; title: string; intro: string | null; questions: Question[]; audience: { department_ids: number[] };
  opens_on: string | null; closes_on: string; status: SurveyStatus; min_group: number; invited_count: number; responded_count?: number;
}
export interface SurveyList { items: Survey[]; departments: { id: number; name: string }[]; starters: { key: string; title: string; questions: Question[] }[] }
export interface MySurvey { id: number; title: string; intro: string | null; closes_on: string; responded: boolean; question_count: number }
export interface SurveyForm { id: number; title: string; intro: string | null; closes_on: string; open: boolean; responded: boolean; min_group: number; questions: Question[] }
export interface QuestionResult {
  id: string; type: QuestionType; text: string; count: number; average?: number | null; favourable?: number | null; distribution?: number[];
  enps?: { score: number; promoters: number; passives: number; detractors: number; count: number } | null; options?: { option: string; count: number }[]; comments?: string[];
}
export interface Summary { count: number; visible: boolean; questions?: QuestionResult[]; engagement?: number | null; enps?: number | null }
export interface Results {
  survey: { id: number; title: string; status: SurveyStatus; closes_on: string; invited: number; responded: number; min_group: number }; response_rate: number; overall: Summary;
  departments: { rows: { department_id: number | null; name: string; count: number; engagement: number | null; enps: number | null; pooled?: boolean }[]; hidden: number } | null;
}

export const list = () => apiClient.get<SurveyList>(B, undefined, auth);
export const trend = () => apiClient.get<{ points: { id: number; title: string; date: string; count: number; enps: number | null; engagement: number | null }[] }>(`${B}/trend`, undefined, auth);
export const create = (body: unknown) => apiClient.post<Survey>(B, body, auth);
export const update = (id: number, body: unknown) => apiClient.put<Survey>(`${B}/${id}`, body, auth);
export const remove = (id: number) => apiClient.delete<{ ok: true }>(`${B}/${id}`, auth);
export const action = (id: number, what: 'open' | 'close' | 'remind') => apiClient.post<Survey & { reminded?: number }>(`${B}/${id}/${what}`, {}, auth);
export const results = (id: number, departmentId?: number | null) => apiClient.get<Results>(`${B}/${id}/results`, departmentId ? { department_id: departmentId } : undefined, auth);
export const mine = () => apiClient.get<{ items: MySurvey[] }>(`${B}/mine`, undefined, auth);
export const form = (id: number) => apiClient.get<SurveyForm>(`${B}/mine/${id}`, undefined, auth);
export const respond = (id: number, answers: Record<string, string | number>) => apiClient.post<{ ok: true }>(`${B}/mine/${id}/respond`, { answers }, auth);
