'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PublicApiError, sendTestEvents } from '../api/careers.api';
import type {
  TestAnswers,
  TestEvent,
  TestEventType,
  TestMetricTotals,
  TestMetrics,
  TestProctoring,
  TestQuestionMetrics,
  TestQuestionType,
} from '../types/careers.types';

/**
 * Test proctoring (RECRUITMENT_DESIGN.md §9.2). Records what the browser can observe while the
 * candidate takes the test, queues it and sends it every 10 s (and when the tab hides, and before
 * submit) together with an answers draft for server-side autosave. Also keeps per-question metrics
 * (time, visits, answer changes, typed vs pasted) that go with the submit.
 *
 * Browser signals are evidence, not proof: the server scores risk and HR decides.
 */

const FLUSH_MS = 10_000;
const MAX_BATCH = 100;
const MAX_QUEUE = 500;
/** keepalive requests share a 64 KB budget; stay well under it. */
const KEEPALIVE_BYTES = 60_000;
const DEVTOOLS_EVERY_MS = 60_000;
const DEVTOOLS_GAP = { w: 160, h: 200 };
const TICK_MS = 1000;

export const DEFAULT_PROCTORING: TestProctoring = {
  blockCopyPaste: true,
  requireFullscreen: false,
  maxTabSwitches: null,
  shuffleOptions: true,
};

const emptyTotals = (): TestMetricTotals => ({
  tabSwitches: 0,
  awayMs: 0,
  blurs: 0,
  fullscreenExits: 0,
  copies: 0,
  pastes: 0,
  contextMenus: 0,
  prints: 0,
  shortcutsBlocked: 0,
});

const emptyQuestion = (): TestQuestionMetrics => ({
  timeMs: 0,
  visits: 0,
  answerChanges: 0,
  typedChars: 0,
  pastedChars: 0,
  pasteCount: 0,
  keystrokes: 0,
  firstInputMs: null,
});

const metricsKey = (token: string) => `tt.careers.test.${token.slice(0, 64)}.m`;

function loadMetrics(token: string): TestMetrics {
  try {
    const raw = window.localStorage.getItem(metricsKey(token));
    const parsed = raw ? (JSON.parse(raw) as Partial<TestMetrics>) : null;
    if (parsed && typeof parsed === 'object' && parsed.questions && parsed.totals) {
      return { questions: { ...parsed.questions }, totals: { ...emptyTotals(), ...parsed.totals } };
    }
  } catch {
    /* ignore */
  }
  return { questions: {}, totals: emptyTotals() };
}

function saveMetrics(token: string, m: TestMetrics) {
  try {
    window.localStorage.setItem(metricsKey(token), JSON.stringify(m));
  } catch {
    /* storage unavailable */
  }
}

export function clearMetrics(token: string) {
  try {
    window.localStorage.removeItem(metricsKey(token));
  } catch {
    /* ignore */
  }
}

type FullscreenDoc = Document & { webkitFullscreenElement?: Element | null; webkitFullscreenEnabled?: boolean; webkitExitFullscreen?: () => void };
type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => void };

export function fullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const d = document as FullscreenDoc;
  return Boolean(d.fullscreenEnabled || d.webkitFullscreenEnabled);
}

export function isFullscreenNow(): boolean {
  if (typeof document === 'undefined') return false;
  const d = document as FullscreenDoc;
  return Boolean(d.fullscreenElement || d.webkitFullscreenElement);
}

/** Must run inside a click handler (user gesture). Never throws. */
export function requestFullscreen(): void {
  if (typeof document === 'undefined' || isFullscreenNow()) return;
  const el = document.documentElement as FullscreenEl;
  try {
    if (el.requestFullscreen) void el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    else el.webkitRequestFullscreen?.();
  } catch {
    /* not allowed */
  }
}

export function exitFullscreen(): void {
  if (typeof document === 'undefined' || !isFullscreenNow()) return;
  const d = document as FullscreenDoc;
  try {
    if (d.exitFullscreen) void d.exitFullscreen().catch(() => {});
    else d.webkitExitFullscreen?.();
  } catch {
    /* ignore */
  }
}

export interface MonitorNotice {
  id: number;
  text: string;
}

interface Options {
  token: string;
  /** Listeners run only while the test is in progress. */
  enabled: boolean;
  proctoring: TestProctoring;
  getAnswers: () => TestAnswers;
  /** The server answered 409/410: the attempt is closed (auto-submitted or expired). */
  onTerminal: (err: PublicApiError) => void;
  /** Tab switches went past the allowed number. */
  onTabLimit: () => void;
}

export function useTestMonitor({ token, enabled, proctoring, getAnswers, onTerminal, onTabLimit }: Options) {
  const queue = useRef<TestEvent[]>([]);
  const metrics = useRef<TestMetrics>({ questions: {}, totals: emptyTotals() });
  const loadedFor = useRef<string | null>(null);
  const active = useRef<string | null>(null);
  /** The question whose view was last recorded while monitoring ran, so a view is not counted twice. */
  const viewed = useRef<string | null>(null);
  const lastSentAnswers = useRef<TestAnswers | null>(null);
  const inFlight = useRef(false);
  const closed = useRef(false);
  const hiddenAt = useRef<number | null>(null);
  const wasFullscreen = useRef(false);
  const lastDevtools = useRef(0);
  const pendingPaste = useRef<Map<string, number>>(new Map());
  const firstSelected = useRef<Set<string>>(new Set());

  const proctoringRef = useRef(proctoring);
  proctoringRef.current = proctoring;
  const getAnswersRef = useRef(getAnswers);
  getAnswersRef.current = getAnswers;
  const onTerminalRef = useRef(onTerminal);
  onTerminalRef.current = onTerminal;
  const onTabLimitRef = useRef(onTabLimit);
  onTabLimitRef.current = onTabLimit;

  const [notice, setNotice] = useState<MonitorNotice | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);

  if (typeof window !== 'undefined' && loadedFor.current !== token) {
    loadedFor.current = token;
    metrics.current = loadMetrics(token);
    Object.entries(metrics.current.questions).forEach(([qid, m]) => {
      if (m.answerChanges > 0 || m.firstInputMs !== null) firstSelected.current.add(qid);
    });
  }

  const q = useCallback((qid: string) => {
    const all = metrics.current.questions;
    if (!all[qid]) all[qid] = emptyQuestion();
    return all[qid];
  }, []);

  const record = useCallback((type: TestEventType, data?: TestEvent['data'], questionId?: string | null) => {
    const qid = questionId === undefined ? active.current : questionId;
    const ev: TestEvent = { type, at: new Date().toISOString() };
    if (qid) ev.question_id = qid;
    if (data && Object.keys(data).length) ev.data = data;
    queue.current.push(ev);
    if (queue.current.length > MAX_QUEUE) queue.current.splice(0, queue.current.length - MAX_QUEUE);
  }, []);

  const say = useCallback((text: string) => setNotice({ id: Date.now(), text }), []);

  /**
   * Send queued events (≤100 per call) plus the answers draft when it changed.
   * keepalive (tab hiding / closing) sends one bounded batch and does not wait.
   */
  const flush = useCallback(
    async ({ keepalive = false }: { keepalive?: boolean } = {}) => {
      if (closed.current) return;
      if (inFlight.current && !keepalive) return;
      const answers = getAnswersRef.current();
      const answersDirty = answers !== lastSentAnswers.current && Object.keys(answers).length > 0;
      if (!queue.current.length && !answersDirty) return;

      saveMetrics(token, metrics.current);
      // keepalive sends are fire-and-forget beside a normal flush; only normal flushes hold the lock.
      if (!keepalive) inFlight.current = true;
      try {
        let sendAnswers = answersDirty;
        do {
          const batch = queue.current.slice(0, MAX_BATCH);
          let body: { events: TestEvent[]; answers?: TestAnswers } = sendAnswers ? { events: batch, answers } : { events: batch };
          if (keepalive && JSON.stringify(body).length > KEEPALIVE_BYTES) {
            body = { events: batch };
            sendAnswers = false;
          }
          queue.current.splice(0, batch.length);
          try {
            await sendTestEvents(token, body, { keepalive });
            if (body.answers) lastSentAnswers.current = answers;
          } catch (err) {
            if (err instanceof PublicApiError && (err.status === 409 || err.status === 410)) {
              closed.current = true;
              onTerminalRef.current(err);
              return;
            }
            // Network / rate limit: put the batch back (newest kept if the queue overflows).
            queue.current = [...batch, ...queue.current].slice(-MAX_QUEUE);
            return;
          }
          sendAnswers = false;
        } while (!keepalive && queue.current.length > 0);
      } finally {
        if (!keepalive) inFlight.current = false;
      }
    },
    [token]
  );

  /** Final flush before submit: waits for the in-flight batch, then sends the rest. Throws nothing. */
  const flushAll = useCallback(async () => {
    for (let i = 0; i < 20 && inFlight.current; i += 1) await new Promise((r) => setTimeout(r, 100));
    await flush();
    saveMetrics(token, metrics.current);
  }, [flush, token]);

  /** The question on screen; counts a visit and records question_view when it changes. */
  const setActiveQuestion = useCallback(
    (qid: string | null) => {
      if (active.current === qid) return;
      active.current = qid;
      if (!qid || !enabled) return;
      viewed.current = qid;
      q(qid).visits += 1;
      record('question_view', undefined, qid);
    },
    [enabled, q, record]
  );

  // Re-count the visible question when monitoring (re)starts, unless the page already did.
  useEffect(() => {
    if (!enabled) {
      viewed.current = null;
      return;
    }
    const qid = active.current;
    if (qid && viewed.current !== qid) {
      viewed.current = qid;
      q(qid).visits += 1;
      record('question_view', undefined, qid);
    }
  }, [enabled, q, record]);

  // ---- time on question: only while the tab is visible and focused ----
  useEffect(() => {
    if (!enabled) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - last, TICK_MS * 2); // a sleeping laptop does not add hours
      last = now;
      const qid = active.current;
      if (qid && document.visibilityState === 'visible' && document.hasFocus()) q(qid).timeMs += Math.round(delta);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled, q]);

  // ---- periodic flush ----
  useEffect(() => {
    if (!enabled) return;
    closed.current = false;
    const id = window.setInterval(() => void flush(), FLUSH_MS);
    return () => window.clearInterval(id);
  }, [enabled, flush]);

  // ---- browser listeners ----
  useEffect(() => {
    if (!enabled) return;
    const totals = metrics.current.totals;
    const blockCP = () => proctoringRef.current.blockCopyPaste;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
        totals.tabSwitches += 1;
        setTabSwitches(totals.tabSwitches);
        record('visibility_hidden');
        void flush({ keepalive: true });
      } else {
        const awayMs = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
        hiddenAt.current = null;
        totals.awayMs += awayMs;
        record('visibility_visible', { awayMs });
        const max = proctoringRef.current.maxTabSwitches;
        const n = totals.tabSwitches;
        if (max && n > max) {
          say(`You left the test more than ${max} time${max === 1 ? '' : 's'}, so it is being submitted.`);
          onTabLimitRef.current();
        } else {
          // Only a test with a limit warns: the candidate needs to know how close they are.
          if (max) say(`You have left the test ${n} of ${max} times. After ${max} it is submitted automatically.`);
        }
      }
    };
    const onBlur = () => {
      totals.blurs += 1;
      record('window_blur');
    };
    const onFocus = () => record('window_focus');
    const onPageHide = () => void flush({ keepalive: true });

    const clip = (type: 'copy' | 'cut' | 'paste') => (e: ClipboardEvent) => {
      const blocked = blockCP();
      if (blocked) e.preventDefault();
      if (type === 'paste') {
        totals.pastes += 1;
        const chars = e.clipboardData?.getData('text')?.length ?? 0;
        record('paste', { chars, blocked });
      } else {
        totals.copies += 1;
        record(type, { blocked });
      }
      if (blocked) say('Copy and paste are turned off for this test.');
    };
    const onCopy = clip('copy');
    const onCut = clip('cut');
    const onPaste = clip('paste');
    const onContext = (e: MouseEvent) => {
      const blocked = blockCP();
      if (blocked) e.preventDefault();
      totals.contextMenus += 1;
      record('context_menu', { blocked });
    };
    const onDrop = (e: DragEvent) => {
      if (!blockCP()) return;
      e.preventDefault();
      totals.pastes += 1;
      record('paste', { chars: e.dataTransfer?.getData('text')?.length ?? 0, blocked: true, drop: true });
    };
    const onPrint = () => {
      totals.prints += 1;
      record('print');
    };
    const onKey = (e: KeyboardEvent) => {
      // e.code, not e.key: Option+I on a Mac types "ˆ" as the key.
      const k = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const mod = e.ctrlKey || e.metaKey;
      let blocked: string | null = null;
      if (k === 'F12') blocked = 'F12';
      else if (mod && (e.shiftKey || e.altKey) && ['i', 'j', 'c'].includes(k)) blocked = `${e.metaKey ? 'Cmd' : 'Ctrl'}+${e.shiftKey ? 'Shift' : 'Alt'}+${k.toUpperCase()}`;
      else if (mod && !e.shiftKey && !e.altKey && ['p', 's', 'u'].includes(k)) blocked = `${e.metaKey ? 'Cmd' : 'Ctrl'}+${k.toUpperCase()}`;
      else if (mod && !e.shiftKey && !e.altKey && ['c', 'v', 'x'].includes(k) && blockCP()) blocked = `${e.metaKey ? 'Cmd' : 'Ctrl'}+${k.toUpperCase()}`;
      if (!blocked) return;
      e.preventDefault();
      e.stopPropagation();
      totals.shortcutsBlocked += 1;
      record('shortcut_blocked', { key: blocked });
      if (['c', 'v', 'x'].includes(k) && !e.shiftKey && !e.altKey) say('Copy and paste are turned off for this test.');
    };
    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => record('resize', { w: window.innerWidth, h: window.innerHeight }), 800);
    };
    const onOffline = () => record('offline');
    const onOnline = () => {
      record('online');
      void flush();
    };
    const onFullscreen = () => {
      const now = isFullscreenNow();
      setIsFullscreen(now);
      if (now) {
        wasFullscreen.current = true;
        record('fullscreen_enter');
      } else if (wasFullscreen.current) {
        wasFullscreen.current = false;
        totals.fullscreenExits += 1;
        record('fullscreen_exit');
      }
    };

    // Developer tools heuristic: a large gap between the window and the page (docked tools), at most once a minute.
    const devtoolsTimer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || isFullscreenNow()) return;
      const gapW = window.outerWidth - window.innerWidth;
      const gapH = window.outerHeight - window.innerHeight;
      if ((gapW > DEVTOOLS_GAP.w || gapH > DEVTOOLS_GAP.h) && Date.now() - lastDevtools.current > DEVTOOLS_EVERY_MS) {
        lastDevtools.current = Date.now();
        record('devtools', { gapW, gapH });
      }
    }, 3000);

    // Multiple screens, once (Chromium exposes screen.isExtended without a permission prompt).
    const scr = window.screen as Screen & { isExtended?: boolean };
    if (scr.isExtended === true) record('multi_screen', { screens: 2 });

    setIsFullscreen(isFullscreenNow());
    wasFullscreen.current = isFullscreenNow();

    const opts = { capture: true } as const;
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('copy', onCopy, opts);
    document.addEventListener('cut', onCut, opts);
    document.addEventListener('paste', onPaste, opts);
    document.addEventListener('contextmenu', onContext, opts);
    document.addEventListener('drop', onDrop, opts);
    window.addEventListener('beforeprint', onPrint);
    window.addEventListener('keydown', onKey, opts);
    window.addEventListener('resize', onResize);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('webkitfullscreenchange', onFullscreen);
    return () => {
      window.clearInterval(devtoolsTimer);
      window.clearTimeout(resizeTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('copy', onCopy, opts);
      document.removeEventListener('cut', onCut, opts);
      document.removeEventListener('paste', onPaste, opts);
      document.removeEventListener('contextmenu', onContext, opts);
      document.removeEventListener('drop', onDrop, opts);
      window.removeEventListener('beforeprint', onPrint);
      window.removeEventListener('keydown', onKey, opts);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('webkitfullscreenchange', onFullscreen);
    };
  }, [enabled, flush, record, say]);

  // ---- per-question answer metrics ----

  const markFirstInput = useCallback((qid: string) => {
    const m = q(qid);
    if (m.firstInputMs === null) m.firstInputMs = m.timeMs;
  }, [q]);

  /** Call on every answer change, with the value before and after. */
  const recordAnswer = useCallback(
    (qid: string, type: TestQuestionType, prev: number[] | string | undefined, next: number[] | string) => {
      const m = q(qid);
      markFirstInput(qid);
      if (type === 'text') {
        const before = typeof prev === 'string' ? prev.length : 0;
        const after = typeof next === 'string' ? next.length : 0;
        const added = Math.max(0, after - before);
        const pasted = pendingPaste.current.get(qid);
        if (pasted !== undefined) {
          pendingPaste.current.delete(qid);
          const fromPaste = Math.min(added, pasted);
          m.pastedChars += fromPaste;
          m.typedChars += added - fromPaste;
        } else {
          m.typedChars += added;
        }
        return;
      }
      const prevSel = Array.isArray(prev) ? prev : [];
      const nextSel = Array.isArray(next) ? next : [];
      if (!firstSelected.current.has(qid)) {
        if (nextSel.length) firstSelected.current.add(qid);
        return;
      }
      if (type === 'single') {
        if (prevSel.join(',') !== nextSel.join(',')) m.answerChanges += 1;
      } else if (nextSel.length < prevSel.length) {
        // Multiple choice: adding picks is answering; taking one back is a change of mind.
        m.answerChanges += 1;
      }
    },
    [q, markFirstInput]
  );

  /** Props for a written-answer textarea: keystrokes and paste size per question. */
  const textHandlers = useCallback(
    (qid: string) => ({
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.ctrlKey || e.metaKey) return;
        const m = q(qid);
        m.keystrokes += 1;
        markFirstInput(qid);
      },
      onPaste: (e: React.ClipboardEvent) => {
        if (proctoringRef.current.blockCopyPaste || e.defaultPrevented || e.nativeEvent.defaultPrevented) return;
        const len = e.clipboardData.getData('text').length;
        if (!len) return;
        const m = q(qid);
        m.pasteCount += 1;
        pendingPaste.current.set(qid, len);
      },
    }),
    [q, markFirstInput]
  );

  const snapshot = useCallback((): TestMetrics => {
    const m = metrics.current;
    return { questions: JSON.parse(JSON.stringify(m.questions)) as TestMetrics['questions'], totals: { ...m.totals } };
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  return {
    notice,
    dismissNotice,
    isFullscreen,
    tabSwitches,
    setActiveQuestion,
    recordAnswer,
    textHandlers,
    flushAll,
    snapshot,
    /** Stop sending (after submit). */
    close: useCallback(() => {
      closed.current = true;
    }, []),
  };
}
