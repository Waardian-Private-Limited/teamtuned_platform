import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type { MyPayslipListResponseDto } from '../types/myPayslips.dto';

const auth = { withAuth: true };

export function listMyPayslips(year: number) {
  return apiClient.get<MyPayslipListResponseDto>('/payroll-runs/me/payslips', { year }, auth);
}

export function exportMyPayslips(body: { itemIds?: number[]; year?: number }) {
  return apiClient.post<ExportJobDto>('/exports/my-payslips', body, auth);
}
