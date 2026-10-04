'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import type { Skill } from '../../../types/roster.types';
import { useSkillsEmployee } from '../../../hooks/useSkillsEmployee';
import { EmployeePicker } from '../../catalog-shared/EmployeePicker';
import { btnPrimary, iconBtn, miniInput, personName } from '../../catalog-shared/catalogUi';
import { Spinner } from '../../catalog-shared/Spinner';

interface Props {
  skills: Skill[];
  canEdit: boolean;
  onSaved: () => void;
}

export function EmployeeSkillsPanel({ skills, canEdit, onSaved }: Props) {
  const [person, setPerson] = React.useState<{ id: number; name: string; detail: string } | null>(null);
  const state = useSkillsEmployee(person?.id ?? null, onSaved);
  const free = skills.filter((s) => !state.rows.some((r) => r.skillId === s.id));

  return (
    <div className="rounded-xl border border-line bg-surface">
      <div className="border-b border-line p-3.5">
        <h2 className="text-sm font-bold text-fg">People and skills</h2>
        <p className="mt-0.5 text-[11px] text-fg-muted">Find a person to see and change their skills. A skill can have an end date, for example when a certificate expires.</p>
        <div className="mt-3">
          <EmployeePicker onPick={(e) => setPerson({ id: e.id, name: personName(e), detail: [e.employee_code, e.role_name].filter(Boolean).join(' · ') })} placeholder="Search a person by name or code…" />
        </div>
      </div>

      {!person ? (
        <p className="px-4 py-12 text-center text-xs text-fg-muted">Search for a person above to manage their skills.</p>
      ) : (
        <div className="p-3.5">
          <p className="text-sm font-bold text-fg">{person.name}</p>
          {person.detail && <p className="text-[11px] text-fg-muted">{person.detail}</p>}

          {state.loading ? (
            <p className="py-6 text-xs text-fg-muted">Loading skills…</p>
          ) : (
            <>
              {state.rows.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-fg-muted">No skills yet.</p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {state.rows.map((r) => (
                    <li key={r.skillId} className="rounded-lg border border-line bg-bg-subtle/50 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-fg">{r.name}</span>
                        {canEdit && <button type="button" onClick={() => state.change((rows) => rows.filter((x) => x.skillId !== r.skillId))} aria-label={`Remove ${r.name}`} className={iconBtn}><X className="h-4 w-4" /></button>}
                      </div>
                      <label className="mt-1.5 block text-[11px] text-fg-muted">
                        Valid until (optional)
                        <input
                          type="date"
                          disabled={!canEdit}
                          value={r.validUntil}
                          onChange={(e) => state.change((rows) => rows.map((x) => (x.skillId === r.skillId ? { ...x, validUntil: e.target.value } : x)))}
                          className={`${miniInput} mt-1 h-8`}
                        />
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              {canEdit && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value=""
                    disabled={free.length === 0}
                    onChange={(e) => {
                      const s = skills.find((x) => x.id === Number(e.target.value));
                      if (s) state.change((rows) => [...rows, { skillId: s.id, name: s.name, validUntil: '' }]);
                    }}
                    className={`${miniInput} w-56`}
                    aria-label="Add a skill"
                  >
                    <option value="">{skills.length === 0 ? 'No skills created yet' : free.length === 0 ? 'Has every skill' : 'Add a skill…'}</option>
                    {free.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button type="button" disabled={!state.dirty || state.saving} onClick={state.save} className={btnPrimary}>
                    {state.saving ? <Spinner /> : <Check className="h-3.5 w-3.5" />} Save skills
                  </button>
                </div>
              )}
              {state.error && <p role="alert" className="mt-2 text-xs font-medium text-[var(--tt-danger)]">{state.error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
