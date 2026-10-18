'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { btn, fieldOf } from '@/features/recruitment/interviews/lib/ui';
import * as api from '../../api/documents.api';
import type { AssetDto, BlockType, DocTypeDto, TemplateBlock, TemplateBody, TemplateDto } from '../../types/documents.dto';
import { PdfFrame } from '../PdfFrame';
import { BLOCK_HINT, BLOCK_LABEL, newBlock, summary } from './blocks';
import { BlockEditor } from './BlockEditor';
import { InputsEditor } from './InputsEditor';

const ADDABLE: BlockType[] = ['text', 'table', 'title', 'meta', 'letterhead', 'signatures', 'acceptance', 'footer_note', 'spacer', 'page_break'];
const fieldCls = 'h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-[var(--tt-primary)]';

function bodyOf(t: TemplateDto): TemplateBody {
  return {
    doc_type: t.docType,
    name: t.name,
    sub_organization_id: t.subOrganizationId,
    is_default: t.isDefault,
    page: t.page || { margin: 'normal', fontSize: 10 },
    blocks: t.blocks,
    inputs: t.inputs || [],
    reference_format: t.referenceFormat,
  };
}

/**
 * The template designer: settings, blocks (add, reorder, edit) and the details asked at generation
 * on the left; a live PDF preview with sample data on the right, refreshed as HR types.
 */
export function TemplateDesigner({ template, type, assets, onClose, onSaved }: {
  template: TemplateDto;
  type: DocTypeDto;
  assets: AssetDto[];
  onClose: () => void;
  onSaved: (t: TemplateDto) => void;
}) {
  const { subOrgs } = useManageableSubOrgs();
  const [draft, setDraft] = useState<TemplateBody>(() => bodyOf(template));
  const [open, setOpen] = useState<string | null>(template.blocks[0]?.id ?? null);
  const [tab, setTab] = useState<'blocks' | 'inputs' | 'settings'>('blocks');
  const [preview, setPreview] = useState<Blob | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(template.id === 0);
  const abort = useRef<AbortController | null>(null);
  const isNew = template.id === 0;

  const update = (patch: Partial<TemplateBody>) => { setDraft((d) => ({ ...d, ...patch })); setDirty(true); };
  const setBlocks = (blocks: TemplateBlock[]) => update({ blocks });
  const ctx = useMemo(() => ({
    fields: type.fields,
    inputs: draft.inputs.map((i) => ({ key: i.key, label: i.label || i.key })),
    signatories: assets.filter((a) => a.kind === 'signature'),
    error: (p: string) => errors[p],
  }), [type.fields, draft.inputs, assets, errors]);

  // Live preview, debounced; a newer edit cancels the older request.
  useEffect(() => {
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setPreviewing(true);
      try {
        const blob = await api.previewTemplate({ ...draft, name: draft.name || 'Untitled' }, ctrl.signal);
        setPreview(blob);
        setPreviewError(null);
        setErrors({});
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        const f = fieldOf(err);
        setPreviewError(messageOf(err));
        if (f) setErrors({ [f]: messageOf(err) });
      } finally {
        if (abort.current === ctrl) setPreviewing(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [draft]);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= draft.blocks.length) return;
    const next = [...draft.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  }

  async function save() {
    if (!draft.name.trim()) { setErrors({ name: 'Name the template' }); setTab('settings'); return; }
    setSaving(true);
    try {
      const saved = isNew ? await api.createTemplate(draft) : await api.updateTemplate(template.id, draft);
      showSuccess('Template saved');
      setDirty(false);
      onSaved(saved);
    } catch (err) {
      const f = fieldOf(err);
      if (f) setErrors({ [f]: messageOf(err) });
      showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  const blockError = (b: TemplateBlock, i: number) => Object.keys(errors).some((k) => k.startsWith(`blocks.${i}.`)) || errors.blocks;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={() => { if (!dirty || window.confirm('Leave without saving?')) onClose(); }} aria-label="Back to templates" className={btn.icon}><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-fg">{draft.name || 'Untitled template'}</p>
            <p className="text-[11px] text-fg-muted">{type.label}{dirty ? ' · unsaved changes' : ''}</p>
          </div>
        </div>
        <button type="button" onClick={save} disabled={saving} className={btn.primary}>
          {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />} Save template
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="min-h-0 overflow-y-auto rounded-xl border border-line bg-surface p-3 tt-scroll-hidden">
          <SegmentedControl options={[{ value: 'blocks', label: 'Layout' }, { value: 'inputs', label: 'Ask when generating' }, { value: 'settings', label: 'Settings' }] as const} value={tab} onChange={setTab} />

          {tab === 'blocks' && (
            <div className="mt-3 space-y-2">
              {draft.blocks.map((b, i) => {
                const expanded = open === b.id;
                return (
                  <div key={b.id} className={cx('rounded-lg border', blockError(b, i) ? 'border-[var(--tt-danger)]' : 'border-line')}>
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <button type="button" onClick={() => setOpen(expanded ? null : b.id)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-bg-subtle">
                        <ChevronDown className={cx('h-4 w-4 shrink-0 text-fg-muted transition-transform', !expanded && '-rotate-90')} />
                        <span className="shrink-0 text-xs font-bold text-fg">{BLOCK_LABEL[b.type]}</span>
                        <span className="truncate text-xs text-fg-muted">{summary(b)}</span>
                      </button>
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className={btn.icon}><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === draft.blocks.length - 1} aria-label="Move down" className={btn.icon}><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setBlocks(draft.blocks.filter((x) => x.id !== b.id))} disabled={draft.blocks.length === 1} aria-label={`Remove ${BLOCK_LABEL[b.type]}`} className={btn.icon}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {expanded && (
                      <div className="space-y-2 border-t border-line px-3 py-3">
                        <p className="text-[11px] text-fg-subtle">{BLOCK_HINT[b.type]}</p>
                        <BlockEditor block={b} index={i} ctx={ctx} onChange={(nb) => setBlocks(draft.blocks.map((x) => (x.id === b.id ? nb : x)))} />
                      </div>
                    )}
                  </div>
                );
              })}
              <label className="relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 text-xs font-semibold text-fg-muted hover:text-fg">
                <Plus className="h-4 w-4" /> Add block
                <select value="" aria-label="Add block" onChange={(e) => { if (!e.target.value) return; const nb = newBlock(e.target.value as BlockType); setBlocks([...draft.blocks, nb]); setOpen(nb.id); }} className="absolute inset-0 cursor-pointer opacity-0">
                  <option value="">Add block</option>
                  {ADDABLE.map((t) => <option key={t} value={t}>{BLOCK_LABEL[t]}</option>)}
                </select>
              </label>
              {errors.blocks && <p className="text-[11px] font-medium text-[var(--tt-danger)]">{errors.blocks}</p>}
            </div>
          )}

          {tab === 'inputs' && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-fg-muted">Details HR fills in each time this letter is generated, prefilled where possible. Use them in the layout with “Insert field”.</p>
              <InputsEditor inputs={draft.inputs} onChange={(inputs) => update({ inputs })} fields={type.fields} error={(p) => errors[p]} />
            </div>
          )}

          {tab === 'settings' && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-fg">Template name</label>
                <input value={draft.name} onChange={(e) => update({ name: e.target.value })} maxLength={120} className={cx(fieldCls, errors.name && 'border-[var(--tt-danger)]')} />
                {errors.name && <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{errors.name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-fg">Used for</label>
                <select value={draft.sub_organization_id ?? ''} onChange={(e) => update({ sub_organization_id: e.target.value ? Number(e.target.value) : null })} className={fieldCls}>
                  <option value="">All companies</option>
                  {subOrgs.map((s) => <option key={s.id} value={s.id}>{s.name} only</option>)}
                </select>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm text-fg">
                <span>Default {type.label.toLowerCase()}<span className="block text-[11px] text-fg-muted">Picked first when generating, and used for offers.</span></span>
                <Switch checked={draft.is_default} onChange={(v) => update({ is_default: v })} label="Default template" />
              </label>
              <div>
                <label className="mb-1 block text-xs font-semibold text-fg">Reference number format</label>
                <input value={draft.reference_format ?? ''} onChange={(e) => update({ reference_format: e.target.value || null })} placeholder={type.referenceFormat} className={cx(fieldCls, 'font-mono', errors.reference_format && 'border-[var(--tt-danger)]')} />
                <p className="mt-1 text-[11px] text-fg-muted">{errors.reference_format || 'Use {FY} (2026-27), {YYYY}, {MM} and {SEQ:4} (0001, 0002…). Empty = no reference.'}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg">Margins</label>
                  <SegmentedControl options={[{ value: 'narrow', label: 'Narrow' }, { value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Wide' }] as const} value={draft.page.margin} onChange={(v) => update({ page: { ...draft.page, margin: v } })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg">Text size</label>
                  <SegmentedControl options={[{ value: '9', label: 'S' }, { value: '10', label: 'M' }, { value: '11', label: 'L' }, { value: '12', label: 'XL' }] as const} value={String(Math.round(draft.page.fontSize)) as '9' | '10' | '11' | '12'} onChange={(v) => update({ page: { ...draft.page, fontSize: Number(v) } })} />
                </div>
              </div>
            </div>
          )}
        </div>

        <PdfFrame blob={preview} loading={previewing} error={preview ? null : previewError} title="Template preview" className="min-h-[70vh] xl:min-h-0" />
      </div>
      {preview && previewError && <p className="text-xs font-medium text-[var(--tt-danger)]">{previewError}</p>}
    </div>
  );
}
