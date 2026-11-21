'use client';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';
import Image from 'next/image';
import { GripVertical, LayoutDashboard, Pencil, Plus, Save, Settings2, Trash2, X } from 'lucide-react';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { usePermission } from '@/lib/hooks/usePermission';
import * as api from '../../../../api/dc.api';
import { DC_PERMISSIONS } from '../../../../constants/dc.constants';
import { useAsync } from '../../../../hooks/useAsync';
import type { Board, BoardLayout, InsightFilters, PaletteField, Widget, WidgetLayout } from '../../../../types/dc.types';
import { Btn, Card, Skeleton, inputCls } from '../../../shared/Ui';
import { WidgetConfig } from './WidgetConfig';
import { WidgetView } from './Widget';
import { countWidget, dataWidget, flatFields, runWidget, widgetFromField, RUN_STATS } from './widgetDefaults';

const Grid = WidthProvider(GridLayout);
const COLS = 12;

type Draft = { id: number | null; name: string; widgets: Widget[]; layout: WidgetLayout[] };
const layoutFor = (b: BoardLayout): WidgetLayout[] => b.widgets.map((w, i) => b.layout.find((l) => l.i === w.id) || { i: w.id, x: (i * 4) % COLS, y: Math.floor(i / 3) * 5, w: 4, h: 5 });

/** Saved audit boards for the form, shown on this assignment. View mode renders the grid; editors can build/arrange. */
type Opts = { sites: { id: number; name: string }[]; departments: { id: number; name: string }[]; people: { id: number; name: string; code: string | null }[] };

export function BoardsTab({ formId, assignmentId, filters, scheduled, options }: { formId: number; assignmentId: number; filters: InsightFilters; scheduled: boolean; options: Opts }) {
  const { can } = usePermission();
  const canManage = can(DC_PERMISSIONS.FORMS);
  const { data, loading, error, refetch } = useAsync(() => api.listDashboards(formId), [formId]);
  const [selId, setSelId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [saving, setSaving] = useState(false);

  const boards = data?.items || [];
  const columns = useMemo<PaletteField[]>(() => data?.columns || [], [data]);
  useEffect(() => { if (boards.length && selId === null) setSelId((boards.find((b) => b.is_default) || boards[0]).id); }, [boards, selId]);
  const selected = boards.find((b) => b.id === selId) || null;
  const editing = draft !== null;
  const widgets = editing ? draft.widgets : selected?.layout.widgets || [];
  const layout = editing ? draft.layout : selected ? layoutFor(selected.layout) : [];

  const startNew = () => setDraft({ id: null, name: '', widgets: [], layout: [] });
  const startEdit = (b: Board) => setDraft({ id: b.id, name: b.name, widgets: b.layout.widgets, layout: layoutFor(b.layout) });
  const addWidget = (w: Widget) => setDraft((d) => d && ({ ...d, widgets: [...d.widgets, w], layout: [...d.layout, { i: w.id, x: (d.widgets.length * 4) % COLS, y: Infinity, w: w.type === 'kpi' ? 3 : 4, h: w.type === 'kpi' ? 4 : 5 }] }));
  const patchWidget = (w: Widget) => setDraft((d) => d && ({ ...d, widgets: d.widgets.map((x) => (x.id === w.id ? w : x)) }));
  const removeWidget = (id: string) => setDraft((d) => d && ({ ...d, widgets: d.widgets.filter((x) => x.id !== id), layout: d.layout.filter((l) => l.i !== id) }));

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { showError('Give the board a name'); return; }
    setSaving(true);
    try {
      const body = { name: draft.name.trim(), layout: { widgets: draft.widgets, layout: draft.layout } as BoardLayout };
      const saved = draft.id ? await api.updateDashboard(formId, draft.id, body) : await api.createDashboard(formId, body);
      showSuccess('Board saved');
      setDraft(null); setSelId(saved.id); await refetch();
    } catch (e) { showError(messageOf(e)); } finally { setSaving(false); }
  };
  const del = (b: Board) => setConfirm({ title: 'Delete this board?', danger: true, cta: 'Delete', body: `"${b.name}" will be removed for everyone.`, run: async () => {
    try { await api.deleteDashboard(formId, b.id); showSuccess('Board deleted'); if (selId === b.id) setSelId(null); await refetch(); } catch (e) { showError(messageOf(e)); }
  } });

  if (loading && !data) return <Skeleton className="h-96" />;
  if (error) return <p className="text-sm text-[var(--tt-danger)]">{error}</p>;

  if (!editing && !boards.length) {
    return (
      <Card className="flex flex-col items-center py-12 text-center">
        <Image src="/vectors/flow.svg" alt="" width={200} height={140} className="mb-4 h-auto max-h-36 w-auto" />
        <h3 className="text-sm font-bold text-fg">No audit boards yet</h3>
        <p className="mt-1 max-w-sm text-xs text-fg-muted">Build a board of charts and tables from this form&apos;s fields. It shows on every assignment of the form.</p>
        {canManage && <Btn variant="primary" icon={<Plus className="h-4 w-4" />} className="mt-4" onClick={startNew}>New board</Btn>}
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {!editing ? (<>
          <select aria-label="Board" className={`${inputCls()} !h-9 !w-56`} value={selId ?? ''} onChange={(e) => setSelId(Number(e.target.value))}>
            {boards.map((b) => <option key={b.id} value={b.id}>{b.name}{b.is_default ? ' (default)' : ''}</option>)}
          </select>
          {canManage && selected && <Btn icon={<Pencil className="h-4 w-4" />} onClick={() => startEdit(selected)}>Edit</Btn>}
          {canManage && <Btn icon={<Plus className="h-4 w-4" />} onClick={startNew}>New</Btn>}
          {canManage && selected && <Btn variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => del(selected)}>Delete</Btn>}
        </>) : (<>
          <input aria-label="Board name" className={`${inputCls()} !h-9 !w-56`} placeholder="Board name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Btn variant="primary" icon={<Save className="h-4 w-4" />} busy={saving} onClick={save}>Save board</Btn>
          <Btn icon={<X className="h-4 w-4" />} onClick={() => setDraft(null)}>Cancel</Btn>
        </>)}
      </div>

      <div className={editing ? 'grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]' : ''}>
        {editing && <Palette columns={columns} scheduled={scheduled} onAdd={addWidget} />}
        <BoardGrid assignmentId={assignmentId} filters={filters} columns={columns} scheduled={scheduled} options={options} widgets={widgets} layout={layout}
          editing={editing} onLayout={(l) => setDraft((d) => d && ({ ...d, layout: l }))} onPatch={patchWidget} onRemove={removeWidget} />
      </div>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

/** Field palette: click a field (or a count / progress stat) to add a widget. */
function Palette({ columns, scheduled, onAdd }: { columns: PaletteField[]; scheduled: boolean; onAdd: (w: Widget) => void }) {
  const fields = flatFields(columns);
  const Item = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-1.5 rounded-md border border-line px-2 py-1.5 text-left text-xs font-medium text-fg hover:border-line-strong hover:bg-bg-subtle"><Plus className="h-3 w-3 shrink-0 text-fg-muted" /><span className="truncate">{label}</span></button>
  );
  return (
    <aside className="h-max rounded-xl border border-line bg-surface p-3 lg:sticky lg:top-28">
      <h3 className="mb-2 text-xs font-bold text-fg">Add a widget</h3>
      <div className="space-y-1.5">
        <Item label="Submission count" onClick={() => onAdd(countWidget())} />
        <Item label="Data (raw rows)" onClick={() => onAdd(dataWidget())} />
        {scheduled && <Item label="Compliance %" onClick={() => onAdd(runWidget('compliance', 'Compliance'))} />}
        {scheduled && RUN_STATS.filter((r) => r.value !== 'compliance').slice(0, 3).map((r) => <Item key={r.value} label={r.label} onClick={() => onAdd(runWidget(r.value, r.label))} />)}
      </div>
      <h3 className="mb-2 mt-3 text-xs font-bold text-fg">From a field</h3>
      <div className="max-h-[50vh] space-y-1.5 overflow-auto pr-1">
        {fields.length ? fields.map((f) => <Item key={f.key} label={f.label} onClick={() => onAdd(widgetFromField(f))} />) : <p className="text-xs text-fg-muted">This form has no fields</p>}
      </div>
    </aside>
  );
}

/** The grid of widgets. Fetches board data for the shown widgets and renders each tile. */
function BoardGrid({ assignmentId, filters, columns, scheduled, options, widgets, layout, editing, onLayout, onPatch, onRemove }: {
  assignmentId: number; filters: InsightFilters; columns: PaletteField[]; scheduled: boolean; options: Opts; widgets: Widget[]; layout: WidgetLayout[];
  editing: boolean; onLayout: (l: WidgetLayout[]) => void; onPatch: (w: Widget) => void; onRemove: (id: string) => void;
}) {
  const [configOf, setConfigOf] = useState<string | null>(null);
  // Debounce so dragging/typing in config does not fire a request per keystroke.
  const specKey = JSON.stringify(widgets.map((w) => ({ ...w })));
  const [debounced, setDebounced] = useState(specKey);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { clearTimeout(timer.current); timer.current = setTimeout(() => setDebounced(specKey), 350); return () => clearTimeout(timer.current); }, [specKey]);
  const fkey = JSON.stringify(filters);
  const { data, loading } = useAsync(() => api.boardData(assignmentId, widgets, filters), [assignmentId, debounced, fkey], widgets.length > 0);

  if (!widgets.length) return <Card className="flex items-center justify-center py-16 text-center text-xs text-fg-muted"><div><LayoutDashboard className="mx-auto mb-2 h-6 w-6 text-fg-subtle" />{editing ? 'Add widgets from the left.' : 'This board has no widgets.'}</div></Card>;

  return (
    <Grid className="layout" cols={COLS} rowHeight={40} margin={[12, 12]} isDraggable={editing} isResizable={editing} draggableHandle=".drag-handle"
      layout={layout as Layout[]} onLayoutChange={(l: Layout[]) => editing && onLayout(l.map((x) => ({ i: x.i, x: x.x, y: x.y, w: x.w, h: x.h })))}>
      {widgets.map((w) => (
        <div key={w.id} className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface p-3 shadow-[var(--tt-shadow-sm)]">
          <div className="mb-2 flex items-center gap-1">
            {editing && <span className="drag-handle cursor-move text-fg-subtle hover:text-fg-muted"><GripVertical className="h-4 w-4" /></span>}
            <h4 className="min-w-0 flex-1 truncate text-xs font-bold text-fg" title={w.title}>{w.title}</h4>
            {editing && <>
              <button type="button" aria-label="Configure" onClick={() => setConfigOf(configOf === w.id ? null : w.id)} className="rounded p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><Settings2 className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="Remove" onClick={() => onRemove(w.id)} className="rounded p-1 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]"><Trash2 className="h-3.5 w-3.5" /></button>
            </>}
          </div>
          {editing && configOf === w.id
            ? <div className="min-h-0 flex-1 overflow-auto"><WidgetConfig widget={w} columns={columns} scheduled={scheduled} options={options} onChange={onPatch} onRemove={() => onRemove(w.id)} /></div>
            : <WidgetView widget={w} result={data?.results[w.id]} loading={loading} />}
        </div>
      ))}
    </Grid>
  );
}
