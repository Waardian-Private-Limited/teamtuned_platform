'use client';

import { useCallback, useMemo, useState } from 'react';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import { useAuth } from '@/context/AuthContext';
import { cancelSwap, createSwap, getMySchedule, listSwaps } from '../api/roster.api';
import type { ScheduleDay } from '../types/roster.types';
import { addDays, monthRange, startOfWeek, todayLocal } from '../utils/rosterTime';
import { groupByDate, nowWall, relativeDay, shiftLabel, wallMinutes, workedMinutes } from '../utils/myRosterUtils';
import { clockOf } from '../utils/rosterTime';
import { useEmployeeRosterQuery } from './useEmployeeRosterQuery';

export function useMyRoster() {
  const { employee_id: myId } = useAuth();
  const today = todayLocal();
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));

  const gridRange = useMemo(() => {
    const { from, to } = monthRange(cursor.year, cursor.month);
    return { from: startOfWeek(from), to: addDays(startOfWeek(to), 6), monthFrom: from, monthTo: to };
  }, [cursor]);

  const schedule = useEmployeeRosterQuery(
    () => getMySchedule({ from: gridRange.from, to: gridRange.to }),
    `${gridRange.from}:${gridRange.to}`
  );
  const upcoming = useEmployeeRosterQuery(
    () => getMySchedule({ from: startOfWeek(today), to: addDays(today, 21) }),
    `upcoming:${today}`
  );
  const swaps = useEmployeeRosterQuery(() => listSwaps({ scope: 'mine' }), 'my-swaps');

  const byDate = useMemo(() => groupByDate(schedule.data?.days || []), [schedule.data]);
  const holidays = useMemo(() => new Map((schedule.data?.holidays || []).map((h) => [h.date, h.name])), [schedule.data]);

  const week = useMemo(() => {
    const from = startOfWeek(today);
    const to = addDays(from, 6);
    const rows = (upcoming.data?.days || []).filter((d) => d.work_date >= from && d.work_date <= to && d.kind === 'shift');
    return { shifts: rows.length, minutes: rows.reduce((s, d) => s + workedMinutes(d), 0) };
  }, [upcoming.data, today]);

  const nextShift = useMemo(() => {
    const now = nowWall();
    const next = (upcoming.data?.days || []).find((d) => d.kind === 'shift' && d.start_at && wallMinutes(d.start_at) > now);
    if (!next || !next.start_at) return null;
    return `${shiftLabel(next)}, ${relativeDay(next.work_date)} ${clockOf(next.start_at)}`;
  }, [upcoming.data]);

  const pendingFor = useCallback(
    (day: ScheduleDay) =>
      (swaps.data?.requests || []).find(
        (r) => r.status === 'pending' && r.from_employee_id === myId && r.from_date_str === day.work_date && r.from_seq === day.seq
      ) || null,
    [swaps.data, myId]
  );

  const prev = useCallback(() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 })), []);
  const next = useCallback(() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 })), []);
  const goToday = useCallback(() => setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }), [today]);

  const reloadAll = useCallback(() => {
    void schedule.reload();
    void upcoming.reload();
    void swaps.reload();
  }, [schedule, upcoming, swaps]);

  const submitSwap = useCallback(
    async (body: Parameters<typeof createSwap>[0]): Promise<string | null> => {
      try {
        const created = await createSwap(body);
        showSuccess(created.status === 'approved' ? 'Done. Your roster has been updated.' : 'Request sent. We will let you know once it is decided.');
        reloadAll();
        return null;
      } catch (err) {
        return messageOf(err);
      }
    },
    [reloadAll]
  );

  const cancelRequest = useCallback(
    async (id: number) => {
      try {
        await cancelSwap(id);
        showSuccess('Request cancelled');
        void swaps.reload();
      } catch (err) {
        showError(messageOf(err));
      }
    },
    [swaps]
  );

  return {
    cursor, gridRange, today, byDate, holidays, week, nextShift,
    loading: schedule.loading && !schedule.data,
    error: schedule.error,
    hasAnyRows: (schedule.data?.days.length || 0) > 0,
    reload: schedule.reload,
    prev, next, goToday, pendingFor, submitSwap, cancelRequest,
  };
}
