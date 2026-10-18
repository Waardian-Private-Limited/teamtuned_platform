'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PublicApiError, fetchTest, startTest, submitTest } from '../api/careers.api';
import type { TestAnswers, TestInfo, TestProctoring, TestQuestion } from '../types/careers.types';
import { isAnswered } from '../utils/testStatus';
import { DEFAULT_PROCTORING, clearMetrics, exitFullscreen, useTestMonitor } from './useTestMonitor';

/** Why the test was submitted without the candidate pressing Submit. */
export type AutoSubmitReason = 'time' | 'tab_switches' | 'server';

export type AssessmentPhase =
  | 'loading'
  | 'invalid'
  | 'error'
  | 'intro'
  | 'starting'
  | 'running'
  | 'submitting'
  | 'submitted'
  | 'expired'
  | 'cancelled';

const storageKey = (token: string) => `tt.careers.test.${token.slice(0, 64)}`;

function loadDraft(token: string): TestAnswers {
  try {
    const raw = window.localStorage.getItem(storageKey(token));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as TestAnswers) : {};
  } catch {
    return {};
  }
}

function saveDraft(token: string, answers: TestAnswers) {
  try {
    window.localStorage.setItem(storageKey(token), JSON.stringify(answers));
  } catch {
    /* storage unavailable (private mode, quota) — answers stay in memory */
  }
}

function clearDraft(token: string) {
  try {
    window.localStorage.removeItem(storageKey(token));
    window.localStorage.removeItem(flagsKey(token));
  } catch {
    /* ignore */
  }
}

/** Which questions the candidate has opened and which they marked for review. Device-only, like the draft. */
export interface QuestionFlags {
  visited: string[];
  marked: string[];
}

const flagsKey = (token: string) => `${storageKey(token)}.f`;

function loadFlags(token: string, ids: Set<string>): QuestionFlags {
  try {
    const raw = window.localStorage.getItem(flagsKey(token));
    const parsed = raw ? (JSON.parse(raw) as Partial<QuestionFlags>) : null;
    const keep = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && ids.has(x)) : []);
    return { visited: keep(parsed?.visited), marked: keep(parsed?.marked) };
  } catch {
    return { visited: [], marked: [] };
  }
}

function saveFlags(token: string, flags: QuestionFlags) {
  try {
    window.localStorage.setItem(flagsKey(token), JSON.stringify(flags));
  } catch {
    /* storage unavailable */
  }
}

/** Server clock offset in ms (server - client) from a server timestamp captured "now". */
function skewFrom(serverNow: string | null): number {
  if (!serverNow) return 0;
  const t = new Date(serverNow).getTime();
  return Number.isNaN(t) ? 0 : t - Date.now();
}

function deadlineFrom(deadline: string | null, startedAt: string | null, durationMinutes: number): number | null {
  if (deadline) {
    const t = new Date(deadline).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (startedAt && durationMinutes > 0) {
    const t = new Date(startedAt).getTime();
    if (!Number.isNaN(t)) return t + durationMinutes * 60_000;
  }
  return null;
}

function phaseForError(err: unknown): AssessmentPhase | null {
  if (!(err instanceof PublicApiError)) return null;
  if (err.status === 404) return 'invalid';
  if (err.status === 410) return 'expired';
  const code = (err.code ?? '').toUpperCase();
  if (code.includes('EXPIRED')) return 'expired';
  if (code.includes('SUBMITTED') || (err.status === 409 && !code.includes('EXPIRED'))) return 'submitted';
  if (code.includes('CANCEL')) return 'cancelled';
  return null;
}

/**
 * Candidate assessment flow. The server owns the clock: the countdown runs
 * against the server deadline (corrected for client clock skew when the server
 * sends its time), answers autosave to localStorage per token, and the attempt
 * is submitted automatically when time runs out.
 */
export function useAssessment(token: string) {
  const [phase, setPhase] = useState<AssessmentPhase>('loading');
  const [info, setInfo] = useState<TestInfo | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<TestAnswers>({});
  const [deadline, setDeadline] = useState<number | null>(null);
  const [skew, setSkew] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState<AutoSubmitReason | null>(null);
  const [submittedHere, setSubmittedHere] = useState(false);
  const [sessionProctoring, setSessionProctoring] = useState<TestProctoring | null>(null);
  const [flags, setFlags] = useState<QuestionFlags>({ visited: [], marked: [] });

  const answersRef = useRef<TestAnswers>({});
  const questionsRef = useRef<TestQuestion[]>([]);
  const submittingRef = useRef(false);
  const autoTriedRef = useRef(false);
  const submitRef = useRef<(reason: AutoSubmitReason | null) => Promise<void>>(async () => {});
  answersRef.current = answers;
  questionsRef.current = questions;

  const proctoring: TestProctoring = sessionProctoring ?? info?.proctoring ?? DEFAULT_PROCTORING;

  const finishClosed = useCallback(() => {
    clearDraft(token);
    clearMetrics(token);
    exitFullscreen();
  }, [token]);

  const monitor = useTestMonitor({
    token,
    enabled: phase === 'running',
    proctoring,
    getAnswers: () => answersRef.current,
    // The server closed the attempt (auto-submitted on tab switches, or past the deadline).
    onTerminal: (err) => {
      const p = phaseForError(err);
      if (p === 'submitted' || (err.status === 409 && !p)) {
        finishClosed();
        setAutoSubmitted('server');
        setSubmittedHere(true);
        setPhase('submitted');
      } else if (p) {
        exitFullscreen();
        setPhase(p);
      }
    },
    onTabLimit: () => void submitRef.current('tab_switches'),
  });

  const begin = useCallback(
    async (base: TestInfo | null) => {
      setPhase('starting');
      setError(null);
      try {
        const session = await startTest(token);
        if (!session.questions.length) {
          setError('This assessment has no questions. Please contact the recruiter.');
          setPhase('error');
          return;
        }
        const draft = loadDraft(token);
        const ids = new Set(session.questions.map((q) => q.id));
        const kept: TestAnswers = {};
        Object.entries(draft).forEach(([k, v]) => {
          if (ids.has(k)) kept[k] = v;
        });
        setQuestions(session.questions);
        setAnswers(kept);
        setFlags(loadFlags(token, ids));
        if (session.proctoring) setSessionProctoring(session.proctoring);
        // A fresh start's startedAt is the server's "now"; prefer an explicit server time when sent.
        const sessionSkew = session.serverNow
          ? skewFrom(session.serverNow)
          : session.startedAt && !base?.startedAt
            ? skewFrom(session.startedAt)
            : null;
        if (sessionSkew !== null) setSkew(sessionSkew);
        setDeadline(deadlineFrom(session.deadline ?? base?.deadline ?? null, session.startedAt ?? base?.startedAt ?? null, base?.durationMinutes ?? 0));
        setPhase('running');
      } catch (err) {
        const p = phaseForError(err);
        if (p) {
          setPhase(p);
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not start the assessment.');
        setPhase(base?.status === 'started' ? 'error' : 'intro');
      }
    },
    [token]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    fetchTest(token, ctrl.signal)
      .then((res) => {
        setInfo(res);
        if (res.serverNow) setSkew(skewFrom(res.serverNow));
        if (res.status === 'submitted') setPhase('submitted');
        else if (res.status === 'expired') setPhase('expired');
        else if (res.status === 'cancelled') setPhase('cancelled');
        else if (res.status === 'started') void begin(res); // resume after reload
        else setPhase('intro');
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        const p = phaseForError(err);
        if (p) setPhase(p);
        else {
          setError(err instanceof Error ? err.message : 'Could not load the assessment.');
          setPhase('error');
        }
      });
    return () => ctrl.abort();
  }, [token, begin]);

  const { flushAll, snapshot, close: closeMonitor } = monitor;
  const submit = useCallback(
    async (auto: AutoSubmitReason | null = null) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setPhase('submitting');
      setError(null);
      try {
        // Last monitoring batch first, so the server scores integrity on everything.
        await flushAll();
        await submitTest(token, answersRef.current, snapshot());
        closeMonitor();
        finishClosed();
        setAutoSubmitted(auto);
        setSubmittedHere(true);
        setPhase('submitted');
      } catch (err) {
        const p = phaseForError(err);
        if (p === 'submitted') {
          closeMonitor();
          finishClosed();
          // Submitted by the server (e.g. too many tab switches) before ours arrived.
          if (auto) {
            setAutoSubmitted(auto);
            setSubmittedHere(true);
          }
          setPhase('submitted');
        } else if (p === 'expired' || p === 'invalid' || p === 'cancelled') {
          closeMonitor();
          exitFullscreen();
          setPhase(p);
        } else {
          setError(err instanceof Error ? err.message : 'Could not submit. Please try again.');
          setPhase('running');
        }
      } finally {
        submittingRef.current = false;
      }
    },
    [token, flushAll, snapshot, closeMonitor, finishClosed]
  );
  submitRef.current = submit;

  // Countdown + auto-submit at the deadline.
  useEffect(() => {
    if (phase !== 'running' || deadline === null) return;
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - (Date.now() + skew)) / 1000));
      setRemaining(left);
      // Auto-submit once; if that fails the candidate retries by hand (no retry loop).
      if (left <= 0 && !autoTriedRef.current) {
        autoTriedRef.current = true;
        void submit('time');
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase, deadline, skew, submit]);

  const { recordAnswer } = monitor;
  const setAnswer = useCallback(
    (questionId: string, value: number[] | string) => {
      const q = questionsRef.current.find((x) => x.id === questionId);
      if (q) recordAnswer(questionId, q.type, answersRef.current[questionId], value);
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: value };
        saveDraft(token, next);
        return next;
      });
    },
    [token, recordAnswer]
  );

  const updateFlags = useCallback(
    (fn: (prev: QuestionFlags) => QuestionFlags) => {
      setFlags((prev) => {
        const next = fn(prev);
        if (next !== prev) saveFlags(token, next);
        return next;
      });
    },
    [token]
  );

  /** The candidate opened this question (palette: "not answered" instead of "not visited"). */
  const visit = useCallback(
    (questionId: string) => updateFlags((f) => (f.visited.includes(questionId) ? f : { ...f, visited: [...f.visited, questionId] })),
    [updateFlags]
  );

  const toggleMark = useCallback(
    (questionId: string) =>
      updateFlags((f) => ({
        ...f,
        marked: f.marked.includes(questionId) ? f.marked.filter((x) => x !== questionId) : [...f.marked, questionId],
      })),
    [updateFlags]
  );

  const clearAnswer = useCallback(
    (questionId: string) => {
      const q = questionsRef.current.find((x) => x.id === questionId);
      if (q && isAnswered(answersRef.current[questionId])) setAnswer(questionId, q.type === 'text' ? '' : []);
    },
    [setAnswer]
  );

  const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;

  return {
    phase,
    info,
    questions,
    answers,
    remaining,
    error,
    autoSubmitted,
    submittedHere,
    answeredCount,
    start: () => begin(info),
    submit: () => submit(null),
    setAnswer,
    clearAnswer,
    flags,
    visit,
    toggleMark,
    proctoring,
    monitor,
  };
}
