'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SelectField, TextField, FieldMessage } from '@/components/ui/FormControls';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { RELATION_LABEL } from '../../constants/insurance.constants';
import type { Member, PlanCovers, Relation } from '../../types/insurance.types';

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

export function allowedRelations(covers: PlanCovers): Relation[] {
  const out: Relation[] = [];
  if (covers.spouse) out.push('spouse');
  if (covers.children) out.push('child');
  if (covers.parents) out.push('parent');
  if (covers.parentsInLaw) out.push('parent_in_law');
  return out;
}

interface FamilyEditorProps {
  covers: PlanCovers;
  members: Member[];
  onChange: (members: Member[]) => void;
  errors: Record<string, string>;
}

/** Dependents covered by the plan, and nominees with their share. Row errors arrive as `members.<i>.<field>`. */
export function FamilyEditor({ covers, members, onChange, errors }: FamilyEditorProps) {
  const relations = allowedRelations(covers);
  const indexed = members.map((m, i) => ({ m, i }));
  const dependents = indexed.filter((x) => x.m.role === 'dependent');
  const nominees = indexed.filter((x) => x.m.role === 'nominee');
  const share = nominees.reduce((s, x) => s + (Number(x.m.nominee_share) || 0), 0);

  const patch = (i: number, p: Partial<Member>) => onChange(members.map((m, j) => (j === i ? { ...m, ...p } : m)));
  const remove = (i: number) => onChange(members.filter((_, j) => j !== i));
  const add = (role: Member['role']) =>
    onChange([
      ...members,
      role === 'dependent'
        ? { role, name: '', relation: relations[0] ?? 'other', dob: null, gender: null, member_no: null, nominee_share: null }
        : { role, name: '', relation: 'parent', dob: null, gender: null, member_no: null, nominee_share: nominees.length ? 0 : 100 },
    ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-fg sm:text-[13px]">Family covered</p>
          {relations.length > 0 && <Btn onClick={() => add('dependent')} icon={<Plus className="h-3.5 w-3.5" />}>Add</Btn>}
        </div>
        {relations.length === 0 && <p className="text-xs text-fg-muted">This plan covers the employee only.</p>}
        <div className="flex flex-col gap-3">
          {dependents.map(({ m, i }) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField label="Name" required value={m.name} onChange={(v) => patch(i, { name: v })} error={errors[`members.${i}.name`]} />
                <SelectField<Relation>
                  label="Relation"
                  required
                  value={m.relation}
                  onChange={(v) => v && patch(i, { relation: v })}
                  options={relations.map((r) => ({ value: r, label: RELATION_LABEL[r] }))}
                  error={errors[`members.${i}.relation`]}
                />
                <TextField label="Date of birth" required type="date" value={m.dob ?? ''} onChange={(v) => patch(i, { dob: v || null })} error={errors[`members.${i}.dob`]} />
                <SelectField<string>
                  label="Gender"
                  value={m.gender}
                  onChange={(v) => patch(i, { gender: (v as Member['gender']) ?? null })}
                  options={GENDERS.map((g) => ({ ...g }))}
                  error={errors[`members.${i}.gender`]}
                />
              </div>
              <div className="mt-2 flex justify-end">
                <button type="button" onClick={() => remove(i)} className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-[var(--tt-danger)]">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <FieldMessage error={errors.members} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-fg sm:text-[13px]">Nominees</p>
          <Btn onClick={() => add('nominee')} icon={<Plus className="h-3.5 w-3.5" />}>Add</Btn>
        </div>
        <div className="flex flex-col gap-3">
          {nominees.map(({ m, i }) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <TextField label="Name" required value={m.name} onChange={(v) => patch(i, { name: v })} error={errors[`members.${i}.name`]} />
                <SelectField<Relation>
                  label="Relation"
                  required
                  value={m.relation}
                  onChange={(v) => v && patch(i, { relation: v })}
                  options={(Object.keys(RELATION_LABEL) as Relation[]).map((r) => ({ value: r, label: RELATION_LABEL[r] }))}
                  error={errors[`members.${i}.relation`]}
                />
                <TextField
                  label="Share"
                  required
                  inputMode="decimal"
                  suffix={<span className="text-xs font-semibold text-fg-muted">%</span>}
                  value={m.nominee_share === null ? '' : String(m.nominee_share)}
                  onChange={(v) => patch(i, { nominee_share: v === '' ? null : Number(v.replace(/[^\d.]/g, '')) })}
                  error={errors[`members.${i}.nominee_share`]}
                />
              </div>
              <div className="mt-2 flex justify-end">
                <button type="button" onClick={() => remove(i)} className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-[var(--tt-danger)]">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        {nominees.length > 0 && <p className="mt-2 text-[11px] text-fg-muted">Shares total {share}%</p>}
        <FieldMessage error={errors.nominees} />
      </div>
    </div>
  );
}
