import { apiClient } from '@/lib/apiClient';
import type { ConfigResponse, NewSessionResponse, TurnResponse } from '../types/assistant.types';

export function getAssistantConfig() {
  return apiClient.get<ConfigResponse>('/assistant/config', undefined, { withAuth: true });
}

/** `page` is the path the user has open, so Tuner understands "this page". */
export function sendTurn(input: { sessionId: string; text?: string; confirm?: boolean; page?: string }) {
  return apiClient.post<TurnResponse>('/assistant/turn', input, { withAuth: true });
}

export function startNewSession() {
  return apiClient.post<NewSessionResponse>('/assistant/sessions', undefined, { withAuth: true });
}

export function clearSession(sessionId: string) {
  return apiClient.delete<{ success: boolean }>(`/assistant/sessions/${sessionId}`, { withAuth: true });
}
