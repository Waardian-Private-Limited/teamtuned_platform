export type ExportStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled' | 'expired';

export interface ExportJobDto {
  id: number;
  kind: string;
  title: string;
  status: ExportStatus;
  progress: number;
  processed: number;
  total: number;
  queue_position: number | null;
  file_name: string | null;
  file_size: number | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  expires_at: string | null;
}

export interface OnboardingExportRequest {
  employeeIds: number[];
  layout?: 'combined' | 'separate';
  signature: 'digital' | 'manual';
  includeDocuments: boolean;
  includeSalary: boolean;
  revealSensitive: boolean;
}
