import { apiClient } from '@/lib/apiClient';
import type {
  AssetDto, GenerateBody, GenerateFormDto, IssueDto, SubjectPage, SubjectType, TemplateBody, TemplateDto, TypesDto,
} from '../types/documents.dto';

// /api/v1/documents — Document Centre (HR only). Letters come back as PDF blobs, never stored.

const auth = { withAuth: true } as const;
const BASE = '/documents';

export const getTypes = () => apiClient.get<TypesDto>(`${BASE}/types`, undefined, auth);

export const listTemplates = (docType?: string) => apiClient.get<{ items: TemplateDto[] }>(`${BASE}/templates`, docType ? { doc_type: docType } : undefined, auth);
export const getTemplate = (id: number) => apiClient.get<TemplateDto>(`${BASE}/templates/${id}`, undefined, auth);
export const createTemplate = (body: TemplateBody) => apiClient.post<TemplateDto>(`${BASE}/templates`, body, auth);
export const updateTemplate = (id: number, body: Partial<TemplateBody>) => apiClient.put<TemplateDto>(`${BASE}/templates/${id}`, body, auth);
export const duplicateTemplate = (id: number) => apiClient.post<TemplateDto>(`${BASE}/templates/${id}/duplicate`, {}, auth);
export const deleteTemplate = (id: number) => apiClient.delete(`${BASE}/templates/${id}`, auth);

/** The designer's preview: the unsaved draft rendered with sample data (or a real candidate). */
export function previewTemplate(body: TemplateBody & { subject_id?: number }, signal?: AbortSignal) {
  return apiClient<Blob>(`${BASE}/templates/preview`, { ...auth, method: 'POST', body, responseType: 'blob', signal });
}

export const listAssets = () => apiClient.get<{ items: AssetDto[] }>(`${BASE}/assets`, undefined, auth);
export function createAsset(fields: { kind: 'signature' | 'stamp'; name: string; designation?: string; sub_organization_id?: number | null }, image: File) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, String(v)); });
  fd.append('image', image);
  return apiClient.post<AssetDto>(`${BASE}/assets`, fd, auth);
}
export function updateAsset(id: number, fields: { name?: string; designation?: string | null; sub_organization_id?: number | null }, image?: File | null) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v === null || v === undefined ? '' : String(v)));
  if (image) fd.append('image', image);
  return apiClient.put<AssetDto>(`${BASE}/assets/${id}`, fd, auth);
}
export const deleteAsset = (id: number) => apiClient.delete(`${BASE}/assets/${id}`, auth);
export const assetImage = (id: number) => apiClient<Blob>(`${BASE}/assets/${id}/image`, { ...auth, responseType: 'blob' });

export const searchSubjects = (type: SubjectType, search: string, page = 1, pageSize = 20) =>
  apiClient.get<SubjectPage>(`${BASE}/subjects`, { type, search: search || undefined, page, pageSize }, auth);
export const getForm = (type: SubjectType, subjectId: number, templateId?: number | null) =>
  apiClient.get<GenerateFormDto>(`${BASE}/generate/form`, { subject_type: type, subject_id: subjectId, template_id: templateId ?? undefined }, auth);

/** Download or preview: a PDF blob. */
export function generatePdf(body: GenerateBody) {
  return apiClient<Blob>(`${BASE}/generate`, { ...auth, method: 'POST', body, responseType: 'blob' });
}

/** Email: the server sends the PDF and answers JSON. */
export function generateEmail(body: GenerateBody) {
  return apiClient.post<{ emailed: boolean; to: string; reference: string }>(`${BASE}/generate`, { ...body, delivery: 'email' }, auth);
}

export const listIssues = (type: SubjectType, subjectId: number) => apiClient.get<{ items: IssueDto[] }>(`${BASE}/issues`, { subject_type: type, subject_id: subjectId }, auth);
