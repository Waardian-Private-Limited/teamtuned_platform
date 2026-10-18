'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { btn } from '@/features/recruitment/interviews/lib/ui';
import * as api from '../../api/documents.api';
import type { AssetDto, DocTypeDto, TemplateDto, TypesDto } from '../../types/documents.dto';
import { newBlock } from './blocks';
import { TemplateDesigner } from './TemplateDesigner';

/** Templates by letter type, with the designer for one. */
export function TemplatesPanel({ types, assets }: { types: TypesDto; assets: AssetDto[] }) {
  const { subOrgs } = useManageableSubOrgs();
  const [items, setItems] = useState<TemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TemplateDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await api.listTemplates()).items); } catch (err) { showError(messageOf(err)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function open(t: TemplateDto) {
    try { setEditing(await api.getTemplate(t.id)); } catch (err) { showError(messageOf(err)); }
  }

  function create(type: DocTypeDto) {
    setEditing({
      id: 0, docType: type.code, docTypeLabel: type.label, name: `New ${type.label.toLowerCase()}`, subOrganizationId: null, isDefault: false,
      page: { margin: 'normal', fontSize: 10 },
      blocks: [newBlock('letterhead'), newBlock('meta'), { ...newBlock('title'), text: type.label } as TemplateDto['blocks'][number], newBlock('text'), newBlock('signatures')],
      inputs: [{ key: 'letter_date', label: 'Letter date', type: 'date', default: 'today', required: true }],
      referenceFormat: type.referenceFormat, version: 0, updatedAt: '',
    });
  }

  async function duplicate(t: TemplateDto) {
    try { await api.duplicateTemplate(t.id); showSuccess('Template copied'); load(); } catch (err) { showError(messageOf(err)); }
  }

  async function remove(t: TemplateDto) {
    if (!window.confirm(`Delete “${t.name}”? Letters already issued are not affected.`)) return;
    try { await api.deleteTemplate(t.id); showSuccess('Template deleted'); load(); } catch (err) { showError(messageOf(err)); }
  }

  if (editing) {
    const type = types.types.find((x) => x.code === editing.docType)!;
    return <TemplateDesigner template={editing} type={type} assets={assets} onClose={() => setEditing(null)} onSaved={(t) => { setEditing(t); load(); }} />;
  }

  const company = (id: number | null) => (id ? subOrgs.find((s) => s.id === id)?.name || 'One company' : 'All companies');

  return (
    <div className="space-y-3">
      {types.types.map((type) => {
        const list = items.filter((t) => t.docType === type.code);
        return (
          <section key={type.code} className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-fg">{type.label}</h2>
                <p className="text-xs text-fg-muted">{type.description}</p>
              </div>
              <button type="button" onClick={() => create(type)} className={btn.small}><Plus className="h-3.5 w-3.5" /> New template</button>
            </div>
            {loading && !items.length ? (
              <div className="h-14 animate-pulse rounded-lg bg-bg-subtle" />
            ) : list.length === 0 ? (
              <p className="text-xs text-fg-muted">No template yet.</p>
            ) : (
              <ul className="divide-y divide-line/70 rounded-lg border border-line">
                {list.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                    <button type="button" onClick={() => open(t)} className="min-w-0 text-left">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                        {t.name}
                        {t.isDefault && <span className="inline-flex items-center gap-1 rounded border border-fg bg-fg px-1.5 text-[10px] font-bold text-[var(--tt-on-primary)]"><Star className="h-2.5 w-2.5" fill="currentColor" /> Default</span>}
                      </span>
                      <span className="text-xs text-fg-muted">{company(t.subOrganizationId)} · {t.blockCount ?? 0} blocks · ref {t.referenceFormat || 'none'}</span>
                    </button>
                    <span className="flex items-center gap-1">
                      <button type="button" onClick={() => open(t)} className={btn.small}><Pencil className="h-3.5 w-3.5" /> Design</button>
                      <button type="button" onClick={() => duplicate(t)} aria-label={`Copy ${t.name}`} className={btn.icon}><Copy className="h-4 w-4" /></button>
                      <button type="button" onClick={() => remove(t)} aria-label={`Delete ${t.name}`} className={btn.icon}><Trash2 className="h-4 w-4" /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <section className="rounded-xl border border-dashed border-line bg-surface p-4">
        <h2 className="text-sm font-bold text-fg">Coming next</h2>
        <p className="mt-0.5 text-xs text-fg-muted">For existing employees: {types.planned.join(', ')}.</p>
      </section>
    </div>
  );
}
