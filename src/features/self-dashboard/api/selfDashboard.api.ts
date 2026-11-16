import { apiClient } from '@/lib/apiClient';
import { addDays } from '@/lib/datetime';
import type { RequestsPageDto } from '@/features/my-leave/types/leave.dto';
import type { CycleResponseDto, PermissionRowDto, PlaceCheckDto, RegularizationRowDto, SnapshotDto, UpcomingDto } from '../types/selfDashboard.dto';

const auth = { withAuth: true } as const;
// How far either side of today a pending short permission can sit; requests are made for near dates.
const PERMISSION_REACH_DAYS = 60;

// Everything is the signed-in employee's own: the server reads who is asking from the token.
export const getSnapshot = () => apiClient.get<SnapshotDto>('/attendance/me/snapshot', undefined, auth);
export const getCycle = () => apiClient.get<CycleResponseDto>('/attendance-records/me/cycle', undefined, auth);
/** My task and meeting-action numbers in one read; a section is null when its feature is off. */
export interface MyWork {
  today: string;
  /** `show`: false when there is nothing there and the person may not create or manage it, so the card is left out. */
  tasks: { todo: number; doing: number; review: number; overdue: number; show: boolean } | null;
  mom: { open: number; overdue: number; week: number; signoff: number; next_meeting: { id: number; title: string; starts_at: string; status: string; place: string | null } | null; show: boolean } | null;
}
export const getWork = () => apiClient.get<MyWork>('/me/work', undefined, auth);
export const getUpcoming = () => apiClient.get<UpcomingDto>('/attendance/me/upcoming', undefined, auth);

export const pendingLeave = () => apiClient.get<RequestsPageDto>('/leave/me/requests', { status: 'pending', page: 1, pageSize: 10 }, auth);
export const pendingRegularizations = () =>
  apiClient.get<{ regularizations: RegularizationRowDto[]; total: number }>('/attendance/me/regularizations', { status: 'pending', page: 1 }, auth);
export const permissionsAround = (today: string) =>
  apiClient.get<{ permissions: PermissionRowDto[] }>('/attendance/me/permissions', { from: addDays(today, -PERMISSION_REACH_DAYS), to: addDays(today, PERMISSION_REACH_DAYS) }, auth);

/** A location reading from the browser. */
export interface WebFix { lat: number; lng: number; accuracy: number | null }

// Web punches: the same endpoints as the app, marked source=web so the web check-in / check-out switches apply.
export const checkPlace = (fix: WebFix, exceptionReason?: string | null) =>
  apiClient.post<PlaceCheckDto>('/attendance/locations/resolve', { ...fix, exception_reason: exceptionReason || undefined, source: 'web' }, auth);

/** The selfie and two more frames of it (they feed the liveness check only). */
export const uploadCapture = (image: Blob, frames: Blob[]) => {
  const form = new FormData();
  form.append('source', 'web');
  form.append('image', image, 'selfie.jpg');
  frames.forEach((f, i) => form.append('frames', f, `frame-${i + 1}.jpg`));
  return apiClient.post<{ capture_id: string; face_result: string }>('/attendance/captures', form, auth);
};

export interface WebPunchInput {
  direction: 'in' | 'out';
  clientPunchId: string;
  fix: WebFix | null;
  captureId: string | null;
  exceptionReason: string | null;
}
export const punch = ({ direction, clientPunchId, fix, captureId, exceptionReason }: WebPunchInput) =>
  apiClient.post(direction === 'in' ? '/attendance/check-in' : '/attendance/check-out', {
    ...(fix || {}),
    capture_id: captureId || undefined,
    exception_reason: exceptionReason || undefined,
    client_punch_id: clientPunchId,
    client_ts: new Date().toISOString(),
    source: 'web',
  }, auth);
