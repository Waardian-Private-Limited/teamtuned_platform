import { apiClient } from '@/lib/apiClient';
import type { CatalogItemDto, CatalogListResponseDto } from '../types/jobCatalogs.dto';
import type { CatalogFormInput, CatalogKind } from '../types/jobCatalogs.model';
import { toCatalogBody } from '../types/jobCatalogs.mapper';

const auth = { withAuth: true };

export function listCatalog(kind: CatalogKind, status: 'active' | 'all' = 'all') {
  return apiClient.get<CatalogListResponseDto>(`/${kind}`, { status }, auth);
}

export function saveCatalogItem(kind: CatalogKind, id: number | null, input: CatalogFormInput) {
  const body = toCatalogBody(input);
  return id ? apiClient.put<CatalogItemDto>(`/${kind}/${id}`, body, auth) : apiClient.post<CatalogItemDto>(`/${kind}`, body, auth);
}

export function deleteCatalogItem(kind: CatalogKind, id: number) {
  return apiClient.delete<{ id: number }>(`/${kind}/${id}`, auth);
}
