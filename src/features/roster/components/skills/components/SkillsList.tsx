'use client';

import React from 'react';
import { Check, Plus, SquarePen, Trash2, X } from 'lucide-react';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import type { Skill } from '../../../types/roster.types';
import { btnPrimary, iconBtn, miniInput } from '../../catalog-shared/catalogUi';
import { Spinner } from '../../catalog-shared/Spinner';

interface Props {
  skills: Skill[];
  busy: boolean;
  rowError: { id: number | 'new'; message: string } | null;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAdd: (name: string, subOrgId: number | null) => Promise<boolean>;
  onRename: (id: number, name: string) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
}

function ErrorText({ message }: { message: string }) {
  return <p role="alert" className="mt-1 text-xs font-medium text-[var(--tt-danger)]">{message}</p>;
}

export function SkillsList({ skills, busy, rowError, canAdd, canEdit, canDelete, onAdd, onRename, onDelete }: Props) {
  const { isOrgAdmin } = usePermission();
  const [name, setName] = React.useState('');
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  const [editing, setEditing] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState('');
  const [confirm, setConfirm] = React.useState<number | null>(null);
  const addError = rowError?.id === 'new' ? rowError.message : '';

  const submitAdd = async () => {
    if (name.trim() && (await onAdd(name, subOrgId))) setName('');
  };
  const submitRename = async (id: number) => {
    if (draft.trim() && (await onRename(id, draft))) setEditing(null);
  };

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-line bg-surface">
      <div className="border-b border-line p-3.5">
        <h2 className="text-sm font-bold text-fg">Skills</h2>
        <p className="mt-0.5 text-[11px] text-fg-muted">Certifications or abilities you can require on a shift, such as First Aid, Forklift or Cash handling.</p>
        {canAdd && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
                placeholder="New skill name"
                aria-invalid={Boolean(addError) || undefined}
                className={cx(miniInput, addError && 'border-[var(--tt-danger)] focus:border-[var(--tt-danger)] focus:ring-[var(--tt-danger)]')}
              />
              <button type="button" disabled={busy || !name.trim()} onClick={submitAdd} className={btnPrimary}><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
            {addError && <ErrorText message={addError} />}
            <SubOrgPicker value={subOrgId} onChange={setSubOrgId} allowShared={isOrgAdmin} />
          </div>
        )}
      </div>

      {skills.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs text-fg-muted">No skills yet. Add your first one above, then assign it to people on the right.</p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-line/70 overflow-y-auto">
          {skills.map((s) => {
            const err = rowError?.id === s.id ? rowError.message : '';
            const count = s.employee_count ?? 0;
            return (
              <li key={s.id} className="px-3.5 py-2.5">
                {editing === s.id ? (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename(s.id);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        className={cx(miniInput, err && 'border-[var(--tt-danger)]')}
                        aria-label="Skill name"
                      />
                      <button type="button" disabled={busy} onClick={() => submitRename(s.id)} aria-label="Save name" className={iconBtn}>{busy ? <Spinner /> : <Check className="h-4 w-4" />}</button>
                      <button type="button" onClick={() => setEditing(null)} aria-label="Cancel" className={iconBtn}><X className="h-4 w-4" /></button>
                    </div>
                    {err && <ErrorText message={err} />}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg">{s.name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-fg-muted">
                          {count === 0 ? 'No one has it' : `${count} ${count === 1 ? 'person' : 'people'}`}
                          <SubOrgBadge subOrgId={s.sub_organization_id} />
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center">
                        {canEdit && <button type="button" onClick={() => { setEditing(s.id); setDraft(s.name); }} aria-label={`Rename ${s.name}`} className={iconBtn}><SquarePen className="h-4 w-4" /></button>}
                        {canDelete && (confirm === s.id ? (
                          <>
                            <button type="button" disabled={busy} onClick={async () => { await onDelete(s.id); setConfirm(null); }} className="h-7 rounded-md bg-[var(--tt-danger)] px-2 text-[11px] font-semibold text-[var(--tt-on-primary)]">Delete</button>
                            <button type="button" onClick={() => setConfirm(null)} aria-label="Cancel" className={iconBtn}><X className="h-4 w-4" /></button>
                          </>
                        ) : (
                          <button type="button" onClick={() => { setConfirm(s.id); }} aria-label={`Delete ${s.name}`} className={cx(iconBtn, 'hover:text-[var(--tt-danger)]')}><Trash2 className="h-4 w-4" /></button>
                        ))}
                      </div>
                    </div>
                    {err && <ErrorText message={err} />}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
