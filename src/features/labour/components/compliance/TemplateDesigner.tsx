'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/FormControls';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import type { FormBlock, FormCatalogue, FormTemplate } from '../../types/labour.types';
import { parseLabourError } from '../../utils/errors';
import { FormError, primaryBtn, secondaryBtn } from '../shared/Primitives';
import { BlockEditor } from './designer/BlockEditors';
import { BLOCK_LABEL, blankBlock, move, newId, summary } from './designer/blocks';
import { CatalogueContext } from './designer/PlaceholderField';
import { PdfPreview } from './designer/PdfPreview';

const BLANK: FormTemplate = { name: '', clientLabel: null, page: { margin: 36, fontSize: 9.5 }, blocks: [blankBlock('header'), blankBlock('fields')] };

/** Block-based form designer: ordered blocks on the left, live PDF preview on the right. */
export function TemplateDesigner({ id, onClose, onSaved }: { id: number | null; onClose: () => void; onSaved: () => void }) {
  const [tpl, setTpl] = useState<FormTemplate | null>(id ? null : BLANK);
  const [templateId, setTemplateId] = useState<number | null>(id);
  const [catalogue, setCatalogue] = useState<FormCatalogue | null>(null);
  const [open, setOpen] = useState<number | null>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [pane, setPane] = useState<'edit' | 'preview'>('edit');

  useEffect(() => { api.getCatalogueForForms().then(setCatalogue).catch(() => {}); }, []);
  useEffect(() => {
    if (id) api.getTemplate(id).then((t) => setTpl({ ...t, blocks: (t.blocks || []).map((b) => ({ ...b, id: b.id || newId() })) })).catch((e) => setFormError(parseLabourError(e).message));
  }, [id]);

  const blockTypes = useMemo(() => (catalogue?.blockTypes?.length ? catalogue.blockTypes : Object.keys(BLOCK_LABEL)), [catalogue]);
  if (!tpl) return formError ? <FormError message={formError} /> : <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;

  const setBlocks = (blocks: FormBlock[]) => { setTpl({ ...tpl, blocks }); setErrors({}); };
  const patchBlock = (i: number, patch: Partial<FormBlock>) => setBlocks(tpl.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const errFor = (i: number) => (path: string) => errors[`blocks.${i}.${path}`];

  const save = async () => {
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      const r = await api.saveTemplate(templateId, tpl);
      const nid = templateId ?? (r as { id: number }).id;
      setTemplateId(nid);
      setVersion((v) => v + 1);
      showSuccess('Form saved');
      onSaved();
    } catch (err) {
      const e = parseLabourError(err);
      if (e.field) {
        setErrors({ [e.field]: e.message });
        const m = e.field.match(/^blocks\.(\d+)\./);
        if (m) setOpen(Number(m[1]));
        if (!(e.field === 'name' || e.field === 'blocks' || m)) setFormError(e.message);
      } else setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const mb = (i: number, to: number) => { setBlocks(move(tpl.blocks, i, to)); setOpen(to); };

  return (
    <CatalogueContext.Provider value={catalogue?.fields || []}>
      <div className="flex min-h-full flex-col gap-4">
        <div className="lg:hidden"><SegmentedControl options={[{ value: 'edit', label: 'Edit' }, { value: 'preview', label: 'Preview' }]} value={pane} onChange={setPane} /></div>
        <div className="grid flex-1 gap-4 lg:grid-cols-2">
          <div className={cx('min-w-0 space-y-4', pane === 'preview' && 'hidden lg:block')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Form name" required value={tpl.name} error={errors.name} onChange={(name) => { setTpl({ ...tpl, name }); setErrors({}); }} />
              <TextField label="Client" value={tpl.clientLabel || ''} error={errors.clientLabel} hint="Optional, shown to tell client formats apart." onChange={(clientLabel) => setTpl({ ...tpl, clientLabel: clientLabel || null })} />
              <TextField label="Page margin (24–60)" inputMode="numeric" value={String(tpl.page.margin)} error={errors['page.margin']} onChange={(v) => setTpl({ ...tpl, page: { ...tpl.page, margin: Number(v) || 0 } })} />
              <TextField label="Font size (8–12)" inputMode="decimal" value={String(tpl.page.fontSize)} error={errors['page.fontSize']} onChange={(v) => setTpl({ ...tpl, page: { ...tpl.page, fontSize: Number(v) || 0 } })} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between"><h4 className="text-sm font-bold text-fg">Blocks</h4>{errors.blocks && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.blocks}</p>}</div>
              {tpl.blocks.map((b, i) => {
                const isOpen = open === i;
                const hasErr = Object.keys(errors).some((k) => k.startsWith(`blocks.${i}.`));
                return (
                  <div key={b.id} className={cx('rounded-xl border bg-surface', hasErr ? 'border-[var(--tt-danger)]' : 'border-line')}>
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-bg-subtle">
                        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" aria-hidden /> : <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />}
                        <span className="text-sm font-semibold text-fg">{BLOCK_LABEL[b.type] || b.type}</span>
                        <span className="truncate text-xs text-fg-muted">{summary(b)}</span>
                      </button>
                      <IconBtn label="Move up" disabled={i === 0} onClick={() => mb(i, i - 1)}><ArrowUp className="h-4 w-4" /></IconBtn>
                      <IconBtn label="Move down" disabled={i === tpl.blocks.length - 1} onClick={() => mb(i, i + 1)}><ArrowDown className="h-4 w-4" /></IconBtn>
                      <IconBtn label="Duplicate block" onClick={() => { const copy = { ...JSON.parse(JSON.stringify(b)), id: newId() }; setBlocks([...tpl.blocks.slice(0, i + 1), copy, ...tpl.blocks.slice(i + 1)]); setOpen(i + 1); }}><Copy className="h-4 w-4" /></IconBtn>
                      <IconBtn label="Delete block" onClick={() => { setBlocks(tpl.blocks.filter((_, j) => j !== i)); setOpen(null); }}><Trash2 className="h-4 w-4" /></IconBtn>
                    </div>
                    {isOpen && <div className="border-t border-line p-3"><BlockEditor block={b} set={(p) => patchBlock(i, p)} err={errFor(i)} /></div>}
                  </div>
                );
              })}
              <div className="rounded-xl border border-dashed border-line-strong p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-fg-muted"><Plus className="h-3.5 w-3.5" aria-hidden />Add a block</p>
                <div className="flex flex-wrap gap-1.5">
                  {blockTypes.map((t) => <button key={t} type="button" onClick={() => { setBlocks([...tpl.blocks, blankBlock(t)]); setOpen(tpl.blocks.length); }} className={cx(secondaryBtn, 'h-8')}>{BLOCK_LABEL[t] || t}</button>)}
                </div>
              </div>
            </div>
            <FormError message={formError} />
          </div>
          <div className={cx('min-w-0', pane === 'edit' && 'hidden lg:block')}>
            <div className="lg:sticky lg:top-0 lg:h-[calc(100vh-11rem)]"><PdfPreview templateId={templateId} version={version} /></div>
          </div>
        </div>
        <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-2 border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:px-6">
          <button type="button" className={secondaryBtn} onClick={onClose}>Close</button>
          <button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : templateId ? 'Save and refresh preview' : 'Save form'}</button>
        </div>
      </div>
    </CatalogueContext.Provider>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg disabled:opacity-30">{children}</button>;
}
