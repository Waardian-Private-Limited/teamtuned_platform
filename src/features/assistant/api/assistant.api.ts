import { apiClient } from '@/lib/apiClient';
import type { ConfigResponse, NewSessionResponse, TurnResponse } from '../types/assistant.types';

export function getAssistantConfig() {
  return apiClient.get<ConfigResponse>('/assistant/config', undefined, { withAuth: true });
}

export function sendTurn(input: { sessionId: string; text?: string; confirm?: boolean }) {
  return apiClient.post<TurnResponse>('/assistant/turn', input, { withAuth: true });
}

export function startNewSession() {
  return apiClient.post<NewSessionResponse>('/assistant/sessions', undefined, { withAuth: true });
}

export function clearSession(sessionId: string) {
  return apiClient.delete<{ success: boolean }>(`/assistant/sessions/${sessionId}`, { withAuth: true });
}
