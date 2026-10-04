'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf, statusOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/roster.api';
import type { CellChange, RosterBoard, RosterSummary, ShiftInfo, Violation } from '../types/roster.types';
import { applyChanges } from '../utils/rosterBoard';

export type SaveState = 'idle' | 'saving' | 'saved';
export interface GenerateOptions {
  seed?: number;
  keepLocked: boolean;
  allowOvertimeToCover: boolean;
  weights?: Record<string, number>;
}

const POLL_MS = 1500;
const VALIDATE_DEBOUNCE_MS = 1200;

export function useRosterBoard(rosterId: number) {
  const [board, setBoard] = useState<RosterBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [violations, setViolations] = useState<Violation[]>([]);
  const [summary, setSummary] = useState<RosterSummary | null>(null);
  const [validating, setValidating] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  const versionRef = useRef(0);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingRef = useRef(0);
  const validateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tempId = useRef(-1);
  const alive = useRef(true);
  const templatesRef = useRef<Map<number, ShiftInfo>>(new Map());

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (validateTimer.current) clearTimeout(validateTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const adopt = useCallback((next: RosterBoard) => {
    versionRef.current = next.roster.version;
    templatesRef.current = new Map(next.templates.map((t) => [t.id, t]));
    setBoard(next);
    setSummary(next.roster.summary);
    setViolations(next.roster.summary?.violations ?? []);
    setGenerating(next.roster.status === 'generating');
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const next = await api.getRoster(rosterId);
        if (!alive.current) return null;
        adopt(next);
        setLoadError('');
        return next;
      } catch (err) {
        if (alive.current) {
          if (silent) showError(messageOf(err));
          else setLoadError(messageOf(err));
        }
        return null;
      } finally {
        if (alive.current && !silent) setLoading(false);
      }
    },
    [rosterId, adopt]
  );

  useEffect(() => {
    load();
  }, [load]);

  const runValidate = useCallback(async () => {
    try {
      const res = await api.validateRoster(rosterId);
      if (!alive.current) return;
      setViolations(res.violations);
      setSummary(res.summary);
    } catch {
      return;
    }
  }, [rosterId]);

  const validateNow = useCallback(async () => {
    setValidating(true);
    try {
      const res = await api.validateRoster(rosterId);
      if (!alive.current) return;
      setViolations(res.violations);
      setSummary(res.summary);
    } catch (err) {
      showError(messageOf(err));
    } finally {
      if (alive.current) setValidating(false);
    }
  }, [rosterId]);

  const scheduleValidate = useCallback(() => {
    if (validateTimer.current) clearTimeout(validateTimer.current);
    validateTimer.current = setTimeout(() => {
      if (pendingRef.current === 0) runValidate();
      else scheduleValidate();
    }, VALIDATE_DEBOUNCE_MS);
  }, [runValidate]);

  const applyEdit = useCallback(
    (changes: CellChange[]): Promise<boolean> => {
      if (!changes.length) return Promise.resolve(true);
      setBoard((b) => (b ? { ...b, assignments: applyChanges(b.assignments, changes, templatesRef.current, () => tempId.current--) } : b));
      pendingRef.current++;
      setSaveState('saving');
      const job = queueRef.current.then(async () => {
        try {
          const res = await api.updateAssignments(rosterId, { version: versionRef.current, changes });
          versionRef.current = res.version;
          if (alive.current) {
            setBoard((b) => (b ? { ...b, roster: { ...b.roster, version: res.version, status: b.roster.status === 'draft' ? 'review' : b.roster.status } } : b));
          }
          return true;
        } catch (err) {
          if (statusOf(err) === 409) showError('This roster was changed somewhere else. Showing the latest version.');
          else showError(messageOf(err));
          await load(true);
          return false;
        } finally {
          pendingRef.current--;
          if (alive.current && pendingRef.current === 0) {
            setSaveState('saved');
            if (savedTimer.current) clearTimeout(savedTimer.current);
            savedTimer.current = setTimeout(() => alive.current && setSaveState('idle'), 2500);
          }
        }
      });
      queueRef.current = job;
      job.then((ok) => ok && scheduleValidate());
      return job;
    },
    [rosterId, load, scheduleValidate]
  );

  useEffect(() => {
    if (!generating) return;
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const s = await api.getRosterStatus(rosterId);
        if (stopped || s.status === 'generating') return;
        stopped = true;
        clearInterval(timer);
        if (s.status === 'failed') {
          setGenerateError(s.error || 'Generation failed');
          showError(s.error || 'Generation failed');
        } else {
          setGenerateError('');
          showSuccess('Roster generated');
        }
        await load(true);
      } catch {
        return;
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [generating, rosterId, load]);

  const generate = useCallback(
    async (opts: GenerateOptions) => {
      setGenerateError('');
      try {
        await queueRef.current;
        await api.generateRoster(rosterId, {
          seed: opts.seed,
          keepLocked: opts.keepLocked,
          allowOvertimeToCover: opts.allowOvertimeToCover,
          weights: opts.weights && Object.keys(opts.weights).length ? opts.weights : undefined,
        });
        setBoard((b) => (b ? { ...b, roster: { ...b.roster, status: 'generating' } } : b));
        setGenerating(true);
        return true;
      } catch (err) {
        showError(messageOf(err));
        return false;
      }
    },
    [rosterId]
  );

  const archive = useCallback(async () => {
    try {
      await api.archiveRoster(rosterId);
      showSuccess('Roster archived');
      await load(true);
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    }
  }, [rosterId, load]);

  return {
    board,
    loading,
    loadError,
    violations,
    summary,
    validating,
    saveState,
    generating,
    generateError,
    load,
    applyEdit,
    validateNow,
    generate,
    archive,
  };
}
