// Mirrors src/modules/assistant/presentation/controllers/AssistantController.js
// on the backend. Keep in sync with that file, not the other way round —
// the backend is the source of truth for this shape.

export type TurnStatus = 'reply' | 'needs_confirmation';

export interface ConfigResponse {
  enabled: boolean;
  greeting?: string;
  allowedCategories?: string[];
}

/** A create action held until the user confirms; values are exactly what will be saved. */
export interface PendingAction {
  action: string;
  details: Record<string, unknown>;
}

export interface TurnResponse {
  status: TurnStatus;
  reply: string;
  pending?: PendingAction;
}

export interface NewSessionResponse {
  sessionId: string;
}

/** A single line in the widget's chat transcript. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  status?: TurnStatus;
}
