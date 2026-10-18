import type { TestAnswers } from '../types/careers.types';

export function isAnswered(a: TestAnswers[string] | undefined): boolean {
  return Array.isArray(a) ? a.length > 0 : typeof a === 'string' && a.trim().length > 0;
}

/** Palette state of one question, as on a standard exam portal. */
export type QuestionState = 'not_visited' | 'not_answered' | 'answered' | 'marked' | 'answered_marked';

export function questionState(answer: TestAnswers[string] | undefined, visited: boolean, marked: boolean): QuestionState {
  const answered = isAnswered(answer);
  if (marked) return answered ? 'answered_marked' : 'marked';
  if (answered) return 'answered';
  return visited ? 'not_answered' : 'not_visited';
}

export const QUESTION_STATE_LABEL: Record<QuestionState, string> = {
  answered: 'Answered',
  not_answered: 'Not answered',
  not_visited: 'Not visited',
  marked: 'Marked for review',
  answered_marked: 'Answered & marked',
};
