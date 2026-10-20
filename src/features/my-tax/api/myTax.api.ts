import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type { FileLinkDto, TaxProofDocumentDto, TaxProofDocumentsDto, TaxProofSectionDto } from '@/features/payroll-setup/types/payroll-setup.dto';
import type { MyTaxDto, MyTaxEligibilityDto, SaveMyTaxBodyDto, SaveMyTaxResponseDto } from '../types/myTax.dto';

const auth = { withAuth: true };

/** Whether TDS applies to the signed-in employee; decides if the page shows at all. */
export function getMyTaxEligibility() {
  return apiClient.get<MyTaxEligibilityDto>('/payroll/tax/me/eligibility', undefined, auth);
}

export function getMyTax(fy?: string) {
  return apiClient.get<MyTaxDto>('/payroll/tax/me', { fy: fy || undefined }, auth);
}

export function saveMyTax(body: SaveMyTaxBodyDto) {
  return apiClient.put<SaveMyTaxResponseDto>('/payroll/tax/me', body, auth);
}

/** Queued in the Download Centre like payroll's own Form 16. 403 until payroll releases it. */
export function exportMyForm16(employeeId: number, fy: string, company: number | null) {
  return apiClient.post<ExportJobDto>(
    '/exports/form16',
    { employeeIds: [employeeId], financialYear: fy, company: company === null ? 'org' : company },
    auth
  );
}

export function listMyProofs(fy?: string) {
  return apiClient.get<TaxProofDocumentsDto>('/payroll/tax/me/proofs', { fy: fy || undefined }, auth);
}

/** One PDF, JPG or PNG up to 5 MB. 403 outside the proof window. */
export function uploadMyProof(section: TaxProofSectionDto, file: File, fy?: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('section', section);
  if (fy) form.append('financial_year', fy);
  return apiClient.post<TaxProofDocumentDto>('/payroll/tax/me/proofs', form, auth);
}

/** Refused once HR has accepted the file. */
export function deleteMyProof(id: number) {
  return apiClient.delete<{ success: boolean }>(`/payroll/tax/me/proofs/${id}`, auth);
}

export function getMyProofUrl(id: number) {
  return apiClient.get<FileLinkDto>(`/payroll/tax/me/proofs/${id}/url`, undefined, auth);
}
