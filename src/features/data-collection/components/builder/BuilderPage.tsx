'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ArrowLeft, Eye, History, Save, Send } from 'lucide-react';
import { TunerIcon } from '../shared/TunerIcon';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { usePermission } from '@/lib/hooks/usePermission';
import * as api from '../../api/dc.api';
import { DC_PERMISSIONS, TYPE_INFO } from '../../constants/dc.constants';
import { useAsync } from '../../hooks/useAsync';
import type { Errors, FieldDef, FieldType, FormDetail } from '../../types/dc.types';
import { clone, errorUids, fieldsAbove, insertAt, locate, makeField, moveField, patchField, removeField, shift, toSchema, uid, withUids } from '../../utils/schema';
import { Btn, Labeled, Pill, Skeleton, inputCls } from '../shared/Ui';
import { Canvas } from './Canvas';
import { Palette } from './Palette';
import { Properties } from './Properties';
import { PreviewDialog, PublishDialog, TunerDialog, VersionsDrawer } from './BuilderDialogs';
import { cx } from '@/theme/tokens';

type Tab = 'fields' | 'canvas' | 'settings';

export function BuilderPage({ formId, basePath }: { formId: number; basePath: string }) {
  const router = useRouter();
  const { can } = usePermission();
  const canEdit = can(DC_PERMISSIONS.FORMS);
  const { data: form, loading, error, setData } = useAsync(() => api.getForm(formId), [formId]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [baseline, setBaseline] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [tab, setTab] = useState<Tab>('canvas');
  const [dialog, setDialog] = useState<'preview' | 'publish' | 'versions' | 'tuner' | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const snapshot = useCallback((n: string, d: string, f: FieldDef[]) => JSON.stringify({ n, d, s: toSchema(f) }), []);
  const load = useCallback((f: FormDetail) => {
    const list = withUids(clone(f.schema.fields));
    setName(f.name); setDescription(f.description || ''); setFields(list); setBaseline(snapshot(f.name, f.description || '', list)); setSelected(null); setServerErrors({});
  }, [snapshot]);
  useEffect(() => { if (form && !baseline) load(form); }, [form, baseline, load]);

  const dirty = Boolean(baseline) && snapshot(name, description, fields) !== baseline;
  const bad = useMemo(() => errorUids(fields, serverErrors), [fields, serverErrors]);
  const picked = selected ? locate(fields, selected) : null;
  const pickedField = picked ? picked.list[picked.index] : null;

  // Leaving the tab or window with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // Pointer-first: the smallest target under the pointer wins, so a field inside a subform (or the subform's body)
  // beats the subform card that contains it. Away from any target, fall back to the closest one.
  const collision: CollisionDetection = (args) => {
    const hits = pointerWithin(args).filter((c) => c.id !== args.active.id);
    if (hits.length) {
      const area = (id: string | number) => { const r = args.droppableRects.get(id); return r ? r.width * r.height : Infinity; };
      return [...hits].sort((a, b) => area(a.id) - area(b.id));
    }
    return closestCenter(args);
  };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // Clicking a field while a subform is selected puts it inside that subform.
  const defaultTarget = () => (selected && typeOf(selected) === 'group' ? { groupId: selected } : { overId: selected });
  const typeOf = (id: string) => locate(fields, id)?.list[locate(fields, id)!.index]?.type;
  const add = (type: FieldType, target: { overId?: string | null; groupId?: string | null; before?: boolean } = defaultTarget()) => {
    const f = makeField(type, fields.flatMap((x) => [x, ...(x.fields || [])]), TYPE_INFO[type].label);
    setFields((cur) => insertAt(cur, f, target));
    setSelected(f.uid as string);
    setTab('settings');
  };

  const onDragStart = (e: DragStartEvent) => setActive(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const { active: a, over } = e;
    if (!over || !canEdit) return;
    const overId = String(over.id);
    const target = overId.startsWith('group:') ? { groupId: overId.slice(6) } : overId === 'canvas-end' ? {} : { overId };
    const id = String(a.id);
    if (id.startsWith('palette:')) {
      const rect = a.rect.current.translated; const o = over.rect;
      const before = Boolean(rect && 'overId' in target && rect.top + rect.height / 2 < o.top + o.height / 2);
      add(id.slice(8) as FieldType, { ...target, before });
      return;
    }
    setFields((cur) => moveField(cur, id, target));
  };

  const copy = (id: string) => {
    const s = locate(fields, id);
    if (!s) return;
    const src = s.list[s.index];
    const all = fields.flatMap((x) => [x, ...(x.fields || [])]);
    const dup: FieldDef = { ...clone(src), uid: uid(), key: makeField(src.type, all, '').key, label: `${src.label} copy` };
    if (dup.fields) dup.fields = dup.fields.map((k, i) => ({ ...k, uid: uid(), key: `${dup.key}_${i + 1}` }));
    setFields((cur) => insertAt(cur, dup, { overId: id }));
    setSelected(dup.uid as string);
  };

  const remove = (id: string) => {
    const s = locate(fields, id);
    if (!s) return;
    const f = s.list[s.index];
    setConfirm({
      title: 'Delete this field?', danger: true, cta: 'Delete',
      body: <>“{f.label || 'Untitled'}”{f.fields?.length ? ` and its ${f.fields.length} fields` : ''} will be removed from the draft. Forms already filled keep their answers.</>,
      run: () => { setFields((cur) => removeField(cur, id)); if (selected === id) setSelected(null); },
    });
  };

  const save = async (): Promise<FormDetail | null> => {
    if (!canEdit) return null;
    setSaving(true); setServerErrors({});
    try {
      const out = await api.saveDraft(formId, { name: name.trim() || 'Untitled form', description, schema: toSchema(fields) });
      setBaseline(snapshot(name.trim() || 'Untitled form', description, fields));
      setName(name.trim() || 'Untitled form');
      setData(out);
      showSuccess('Draft saved');
      return out;
    } catch (e) { showError(messageOf(e)); return null; } finally { setSaving(false); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty && !saving) void save(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const publish = async (note: string) => {
    if (dirty) { const ok = await save(); if (!ok) throw new Error('Could not save the draft first'); }
    try {
      const out = await api.publishForm(formId, note);
      setData(out);
      showSuccess(`Published version ${out.version_no}`);
    } catch (e) {
      const details = (e instanceof ApiError ? (e.data as { details?: { errors?: Errors } })?.details?.errors : undefined) || {};
      setServerErrors(details);
      throw e;
    }
  };

  const goBack = () => (dirty ? setConfirm({ title: 'Leave without saving?', cta: 'Leave', danger: true, body: 'You have changes that are not saved. They will be lost.', run: () => router.push(basePath) }) : router.push(basePath));

  const restore = (versionId: number, no: number) => setConfirm({
    title: `Restore version ${no} as the draft?`, cta: 'Restore', body: 'The current draft is replaced. Publish again to make it the live version.',
    run: async () => { const out = await api.restoreVersion(formId, versionId); setData(out); load(out); setDialog(null); showSuccess(`Version ${no} restored as draft`); },
  });

  if (loading && !form) return <div className="space-y-3 p-4"><Skeleton className="h-12" /><Skeleton className="h-[60vh]" /></div>;
  if (error || !form) return <div className="p-6 text-sm text-[var(--tt-danger)]">{error || 'Form not found'}</div>;

  const overlayType = active?.startsWith('palette:') ? (active.slice(8) as FieldType) : null;
  const overlayField = active && !overlayType ? (() => { const s = locate(fields, active); return s ? s.list[s.index] : null; })() : null;
  const tabs: { id: Tab; label: string }[] = [{ id: 'fields', label: 'Fields' }, { id: 'canvas', label: 'Form' }, { id: 'settings', label: 'Settings' }];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2.5 sm:px-5">
        <button type="button" aria-label="Back to forms" onClick={goBack} className="rounded-lg p-2 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1 basis-48">
          <input aria-label="Form name" disabled={!canEdit} value={name} onChange={(e) => setName(e.target.value)} className="w-full min-w-0 truncate border-none bg-transparent text-base font-bold text-fg outline-none focus:ring-0 sm:text-lg" />
          <div className="flex items-center gap-2 text-[11px] text-fg-muted">
            <Pill label={form.status === 'archived' ? 'Archived' : form.version_no ? `Live v${form.version_no}` : 'Draft'} tone={form.version_no ? 'strong' : 'neutral'} />
            <span>{dirty ? 'Unsaved changes' : form.has_unpublished_changes ? 'Saved, not published' : 'Up to date'}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && <Btn icon={<TunerIcon />} onClick={() => (fields.length ? setConfirm({ title: 'Replace the fields?', cta: 'Continue', body: 'Tuner will draft new fields in place of the ones on the canvas.', run: () => setDialog('tuner') }) : setDialog('tuner'))}>Build with Tuner</Btn>}
          <Btn icon={<Eye className="h-4 w-4" />} onClick={() => setDialog('preview')}>Preview</Btn>
          <Btn icon={<History className="h-4 w-4" />} onClick={() => setDialog('versions')}>Versions</Btn>
          {canEdit && <Btn icon={<Save className="h-4 w-4" />} busy={saving} disabled={!dirty} onClick={() => void save()}>Save draft</Btn>}
          {canEdit && <Btn variant="primary" icon={<Send className="h-4 w-4" />} disabled={!dirty && !form.has_unpublished_changes} onClick={() => setDialog('publish')}>Publish</Btn>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-line bg-surface px-3 py-1.5 lg:hidden">
        {tabs.map((t) => <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cx('h-8 flex-1 rounded-lg text-xs font-semibold', tab === t.id ? 'bg-fg text-[var(--tt-on-primary)]' : 'text-fg-muted')}>{t.label}</button>)}
      </div>

      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
          <aside className={cx('min-h-0 overflow-y-auto border-r border-line bg-surface p-3', tab === 'fields' ? 'block' : 'hidden', 'lg:block')}>
            {canEdit ? <Palette onAdd={(t) => add(t)} /> : <p className="text-xs text-fg-muted">You can view this form but not change it.</p>}
          </aside>
          <main className={cx('min-h-0 overflow-y-auto bg-bg-subtle/40 p-3 sm:p-5', tab === 'canvas' ? 'block' : 'hidden', 'lg:block')}>
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2">
                <Labeled label="Form name" required><input disabled={!canEdit} className={inputCls(!name.trim())} value={name} onChange={(e) => setName(e.target.value)} /></Labeled>
                <Labeled label="Description"><input disabled={!canEdit} className={inputCls()} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this form for?" /></Labeled>
              </div>
              {Object.keys(serverErrors).length > 0 && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{serverErrors.fields || 'Fix the fields marked “Needs attention”, then publish again.'}</p>}
              <Canvas fields={fields} selected={selected} bad={bad} onSelect={(id) => { setSelected(id); setTab('settings'); }} onMove={(id, d) => setFields((c) => shift(c, id, d))} onRemove={remove} onCopy={copy} />
            </div>
          </main>
          <aside className={cx('min-h-0 overflow-y-auto border-l border-line bg-surface p-4', tab === 'settings' ? 'block' : 'hidden', 'lg:block')}>
            {pickedField && canEdit
              ? <Properties field={pickedField} above={fieldsAbove(fields, pickedField.uid as string)} onChange={(patch) => setFields((c) => patchField(c, pickedField.uid as string, patch))} />
              : <p className="text-xs text-fg-muted">{canEdit ? 'Select a field to change its settings.' : 'Read only.'}</p>}
          </aside>
        </div>
        <DragOverlay>
          {overlayType ? <div className="rounded-lg border border-fg bg-surface px-3 py-2 text-xs font-semibold shadow-lg">{TYPE_INFO[overlayType].label}</div>
            : overlayField ? <div className="rounded-lg border border-fg bg-surface px-3 py-2 text-sm font-semibold shadow-lg">{overlayField.label}</div> : null}
        </DragOverlay>
      </DndContext>

      <PreviewDialog open={dialog === 'preview'} schema={toSchema(fields)} onClose={() => setDialog(null)} />
      <PublishDialog open={dialog === 'publish'} hasChanges={dirty || form.has_unpublished_changes} onClose={() => setDialog(null)} onPublish={publish} />
      <VersionsDrawer open={dialog === 'versions'} formId={formId} currentId={form.current_version_id} onClose={() => setDialog(null)} onRestore={restore} />
      <TunerDialog open={dialog === 'tuner'} onClose={() => setDialog(null)} onUse={(r) => { setFields(withUids(r.schema.fields)); if (!name.trim() || name === 'Untitled form') setName(r.name || name); if (!description) setDescription(r.description || ''); setSelected(null); }} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
