'use client';

import { useEffect, useState } from 'react';
import { listDepartments } from '@/features/departments/api/departments.api';
import { listRoles } from '@/features/roles/api/roles.api';
import { listSites } from '@/features/sites/api/sites.api';
import { listEmploymentTypes } from '@/features/employees/api/employees.api';
import { listShiftTemplates } from '@/features/shift-templates/api/shiftTemplates.api';
import { listPatterns, listSkills } from '../api/roster.api';
import type { Pattern, Skill } from '../types/roster.types';

export interface Opt {
  value: number;
  label: string;
}

export interface ShiftOpt extends Opt {
  startTime: string;
  endTime: string;
  workingMinutes: number;
  crossesMidnight: boolean;
  startMin: number;
  isNight: boolean;
  code: string;
  status: string;
}

export interface TeamsCatalog {
  loading: boolean;
  sites: Opt[];
  departments: Opt[];
  roles: Opt[];
  employmentTypes: Opt[];
  shifts: ShiftOpt[];
  patterns: Pattern[];
  skills: Skill[];
}

async function allPages<T>(fetchPage: (page: number) => Promise<{ items: T[]; pages: number }>): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetchPage(page);
    out.push(...r.items);
    if (page >= r.pages) break;
  }
  return out;
}

function shortCode(name: string): string {
  const words = name.trim().split(/\s+/);
  return (words.length > 1 ? words.map((w) => w[0]).join('') : name.slice(0, 1)).toUpperCase().slice(0, 3);
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export async function loadShiftOptions(subOrgId?: number | null): Promise<ShiftOpt[]> {
  const rows = await allPages(async (page) => {
    const r = await listShiftTemplates({ page, pageSize: 100, status: 'active', subOrgId });
    return { items: r.shifts, pages: r.pages };
  });
  return rows.map((s) => {
    const startMin = toMin(s.start_time);
    return {
      value: s.id,
      label: s.name,
      startTime: s.start_time,
      endTime: s.end_time,
      workingMinutes: s.working_minutes,
      crossesMidnight: s.crosses_midnight,
      startMin,
      isNight: s.crosses_midnight || startMin >= 20 * 60 || startMin < 4 * 60,
      code: shortCode(s.name),
      status: s.status,
    };
  });
}

export function useTeamsCatalog(subOrgId?: number | null): TeamsCatalog {
  const [state, setState] = useState<TeamsCatalog>({
    loading: true, sites: [], departments: [], roles: [], employmentTypes: [], shifts: [], patterns: [], skills: [],
  });

  useEffect(() => {
    let alive = true;
    const soft = async <T,>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);
    (async () => {
      const [sites, departments, roles, employmentTypes, shifts, patterns, skills] = await Promise.all([
        soft(allPages(async (page) => {
          const r = await listSites({ page, pageSize: 100, status: 'active', subOrgId });
          return { items: r.sites, pages: r.pages };
        }), []),
        soft(allPages(async (page) => {
          const r = await listDepartments({ page, pageSize: 100, status: 'active', subOrgId });
          return { items: r.departments, pages: r.pages };
        }), []),
        soft(allPages(async (page) => {
          const r = await listRoles({ page, pageSize: 100, status: 'active', subOrgId });
          return { items: r.roles, pages: r.pages };
        }), []),
        soft(listEmploymentTypes().then((r) => r.employment_types), []),
        soft(loadShiftOptions(subOrgId), []),
        soft(listPatterns().then((r) => r.patterns), []),
        soft(listSkills().then((r) => r.skills), []),
      ]);
      if (!alive) return;
      setState({
        loading: false,
        sites: sites.map((s) => ({ value: s.id, label: s.name })),
        departments: departments.map((d) => ({ value: d.id, label: d.name })),
        roles: roles.map((r) => ({ value: r.id, label: r.name })),
        employmentTypes: employmentTypes.map((e) => ({ value: e.id, label: e.name })),
        shifts,
        patterns: patterns.filter((p) => p.status === 'active'),
        skills,
      });
    })();
    return () => {
      alive = false;
    };
  }, [subOrgId]);

  return state;
}
