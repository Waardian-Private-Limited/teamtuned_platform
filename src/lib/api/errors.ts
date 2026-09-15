export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly code?: string;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = typeof (data as { code?: unknown })?.code === 'string'
      ? (data as { code: string }).code
      : undefined;
  }
}

export function statusOf(err: unknown): number | undefined {
  return err instanceof ApiError ? err.status : (err as { status?: number })?.status;
}

const REJECTED_INPUT_STATUSES = new Set([400, 404, 422]);

export function isRejectedInput(err: unknown): boolean {
  const status = statusOf(err);
  return status !== undefined && REJECTED_INPUT_STATUSES.has(status);
}

export function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}
