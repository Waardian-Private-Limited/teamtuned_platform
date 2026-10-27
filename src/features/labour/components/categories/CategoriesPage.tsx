'use client';

import { LABOUR_ILLUSTRATIONS as ILL, LABOUR_VIEW_PERMS } from '../../constants/labour.constants';
import React, { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { LP, SKILL_LEVELS } from '../../constants/labour.constants';
import { useCatalog } from '../../hooks/useLabourLists';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import type { Category, Subcategory } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { EmptyPanel, Block, FormError, Gate, PageHeader, Pill, primaryBtn, secondaryBtn } from '../shared/Primitives';

type Editing = { kind: 'category'; item: Category | null } | { kind: 'subcategory'; category: Category; item: Subcategory | null };

export function CategoriesPage() {
  const { enabled, canAny } = useLabourAccess();
  return <Gate enabled={enabled} allowed={canAny(LABOUR_VIEW_PERMS)} what="categories"><Categories /></Gate>;
}

function Categories() {
  const { can } = useLabourAccess();
  const canManage = can(LP.CONTRACTORS);
  const [showInactive, setShowInactive] = useState(false);
  const { categories, loading, error, reload } = useCatalog(showInactive);
  const [editing, setEditing] = useState<Editing | null>(null);
  const skill = (v: string) => SKILL_LEVELS.find((s) => s.value === v)?.label || v;

  const toggleCategory = async (c: Category, isActive: boolean) => { await api.updateCategory(c.id, { isActive }); reload(); };
  const toggleSub = async (s: Subcategory, isActive: boolean) => { await api.updateSubcategory(s.id, { isActive }); reload(); };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Categories" description="Trades and skill levels used on labourers and in contractor rates.">
        <label className="flex items-center gap-2 text-xs font-semibold text-fg-muted">Show inactive<Switch label="Show inactive" checked={showInactive} onChange={setShowInactive} /></label>
        {canManage && <button type="button" className={primaryBtn} onClick={() => setEditing({ kind: 'category', item: null })}><Plus className="h-3.5 w-3.5" aria-hidden />Add category</button>}
      </PageHeader>
      <FormError message={error} />
      {loading ? <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Block key={i} className="h-40 rounded-xl" />)}</div> : categories.length === 0 ? (
        <EmptyPanel illustration={ILL.categories} title="No categories yet" text="Add one such as Mason or Electrician, then give it subcategories by skill level." action={canManage ? { label: 'Add category', onClick: () => setEditing({ kind: 'category', item: null }) } : undefined} />
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {categories.map((c) => (
            <section key={c.id} className="rounded-xl border border-line bg-surface">
              <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div className="min-w-0"><h3 className="truncate text-sm font-bold text-fg">{c.name}</h3>{c.code && <p className="text-[11px] text-fg-muted">{c.code}</p>}</div>
                <div className="flex items-center gap-2">
                  {!c.isActive && <Pill>Inactive</Pill>}
                  {canManage && (<>
                    <button type="button" aria-label={`Edit ${c.name}`} onClick={() => setEditing({ kind: 'category', item: c })} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"><Pencil className="h-3.5 w-3.5" /></button>
                    <Switch label={`${c.name} active`} checked={c.isActive} onChange={(v) => toggleCategory(c, v)} />
                  </>)}
                </div>
              </header>
              <ul className="divide-y divide-line/60">
                {c.subcategories.length === 0 && <li className="px-4 py-3 text-xs text-fg-muted">No subcategories.</li>}
                {c.subcategories.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <div className="min-w-0"><p className={`truncate text-sm font-semibold ${s.isActive ? 'text-fg' : 'text-fg-muted'}`}>{s.name}</p><p className="text-[11px] text-fg-muted">{skill(s.skillLevel)}</p></div>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button type="button" aria-label={`Edit ${s.name}`} onClick={() => setEditing({ kind: 'subcategory', category: c, item: s })} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"><Pencil className="h-3.5 w-3.5" /></button>
                        <Switch label={`${s.name} active`} checked={s.isActive} onChange={(v) => toggleSub(s, v)} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {canManage && <div className="border-t border-line p-3"><button type="button" className={secondaryBtn} onClick={() => setEditing({ kind: 'subcategory', category: c, item: null })}><Plus className="h-3.5 w-3.5" aria-hidden />Add subcategory</button></div>}
            </section>
          ))}
        </div>
      )}
      {editing && <EditDialog editing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function EditDialog({ editing, onClose, onSaved }: { editing: Editing; onClose: () => void; onSaved: () => void }) {
  const isCat = editing.kind === 'category';
  const item = editing.item;
  const [name, setName] = useState(item?.name || '');
  const [code, setCode] = useState((isCat && (item as Category | null)?.code) || '');
  const [level, setLevel] = useState<string | null>(!isCat ? (item as Subcategory | null)?.skillLevel || 'unskilled' : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) { setErrors({ name: 'Enter a name' }); return; }
    setBusy(true);
    setFormError('');
    try {
      if (isCat) {
        const b = { name: name.trim(), code: code.trim() || undefined };
        await (item ? api.updateCategory(item.id, b) : api.createCategory(b));
      } else {
        const b = { name: name.trim(), skillLevel: level || undefined };
        await (item ? api.updateSubcategory(item.id, b) : api.createSubcategory({ ...b, categoryId: editing.category.id }));
      }
      showSuccess('Saved');
      onSaved();
    } catch (err) {
      const p = placeError(err, (f) => ['name', 'code', 'skillLevel'].includes(f));
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`${item ? 'Edit' : 'Add'} ${isCat ? 'category' : `subcategory in ${editing.category.name}`}`}
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="space-y-4">
        <TextField label="Name" required value={name} error={errors.name} onChange={(v) => { setName(v); setErrors({}); }} />
        {isCat ? <TextField label="Code" value={code} error={errors.code} onChange={setCode} hint="Optional short code." /> : <SelectField label="Skill level" value={level} options={SKILL_LEVELS.map((s) => ({ value: s.value, label: s.label }))} error={errors.skillLevel} onChange={setLevel} />}
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}
