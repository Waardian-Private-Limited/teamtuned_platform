import type { MyRosterDetailDto, MyRosterDto, MyRosterListDto, RosterSlotDto } from './roster.dto';
import type { MyRoster, MyRosterDetail, MyRosterList, RosterSlot } from './roster.model';

export function toSlot(d: RosterSlotDto): RosterSlot {
  return {
    rosterId: d.roster_id ?? null,
    date: d.date,
    seq: d.seq || 1,
    kind: d.kind,
    name: d.name ?? null,
    code: d.code ?? null,
    start: d.start ?? null,
    end: d.end ?? null,
    endsNextDay: !!d.ends_next_day,
    breakMinutes: d.break_minutes || 0,
    plannedMinutes: d.planned_minutes || 0,
    overtime: !!d.overtime,
    plannedOtMinutes: d.planned_ot_minutes || 0,
    earnsCompOff: !!d.earns_comp_off,
    team: d.team ?? null,
  };
}

export function toRoster(d: MyRosterDto): MyRoster {
  return {
    id: d.id,
    team: d.team ?? null,
    periodStart: d.period_start,
    periodEnd: d.period_end,
    state: d.state,
    version: d.version ?? null,
    publishedAt: d.published_at ?? null,
    shifts: d.shifts ?? 0,
    offs: d.offs ?? 0,
    leaves: d.leaves ?? 0,
    plannedMinutes: d.planned_minutes ?? 0,
  };
}

export function toRosterList(d: MyRosterListDto): MyRosterList {
  return { today: d.today, total: d.total, page: d.page, pageSize: d.page_size, items: (d.items || []).map(toRoster) };
}

export function toRosterDetail(d: MyRosterDetailDto): MyRosterDetail {
  return { today: d.today, roster: toRoster(d.roster), days: (d.days || []).map((x) => ({ date: x.date, slots: (x.slots || []).map(toSlot) })) };
}
