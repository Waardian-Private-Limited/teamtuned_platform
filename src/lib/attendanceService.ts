import { apiClient } from './apiClient';

export interface SessionRequest {
    id: number;
    employee_id: number;
    employee_name: string;
    request_type: 'break' | 'outside_work';
    reason: string;
    outside_location?: string;
    outside_location_lat?: number;
    outside_location_lng?: number;
    request_location_lat?: number;
    request_location_lng?: number;
    expected_duration_minutes?: number;
    expected_return_time?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    created_at: string;
    notes?: string;
    disable_geofence?: boolean | number;
    approved_duration_minutes?: number;
    approved_by_name?: string;
    approved_at?: string;
    strict_return?: boolean | number;
    strict_return_time?: string;
    site_name?: string;
    distance_from_site?: number;
    raised_from_within_site?: number | boolean;
}

export async function fetchPendingSessionRequests(status: string | 'All' = 'Pending', start?: string, end?: string, hq?: boolean, site_id?: number | null) {
    const params: Record<string, string> = {};
    // Only send status if it's not 'All' - let backend return all records when no status filter
    if (status && status !== 'All') params.status = status;
    if (start) params.start = start;
    if (end) params.end = end;
    if (hq) params.hq = '1';
    if (site_id) params.site_id = site_id.toString();

    return await apiClient<{ success: boolean; requests: SessionRequest[] }>('/attendance/session/pending-requests', {
        method: 'GET',
        params,
    });
}

export async function fetchMySessionRequests() {
    return await apiClient<{ success: boolean; requests: SessionRequest[] }>('/attendance/session/my-requests');
}

export async function approveSessionRequest(requestId: number, data: { approved_duration_minutes?: number; disable_geofence?: boolean }) {
    return await apiClient<{ success: boolean; message: string }>(`/attendance/session/approve/${requestId}`, {
        method: 'POST',
        body: data,
    });
}

export async function rejectSessionRequest(requestId: number, reason: string) {
    return await apiClient<{ success: boolean; message: string }>(`/attendance/session/reject/${requestId}`, {
        method: 'POST',
        body: { rejection_reason: reason },
    });
}
