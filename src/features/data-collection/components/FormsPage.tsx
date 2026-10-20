'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, Copy, Layers, Plus, Search, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { usePermission } from '@/lib/hooks/usePermission';
import * as api from '../api/dc.api';
import { DC_PERMISSIONS } from '../constants/dc.constants';
import { useAsync } from '../hooks/useAsync';
import { Btn, Card, Labeled, PageHeader, Pill, Skeleton, inputCls } from './shared/Ui';

type Tab = 'active' | 'draft' | 'archived';

export function FormsPage({ basePath }: { basePath: string }) {
  const router = useRouter();
  const { can } = usePermission();
  const canManage = can(DC_PERMISSIONS.FORMS);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  const { data, loading, error, refetch } = useAsync(() => api.listForms({ status: tab, search: query || undefined, page, pageSize: 20 }), [tab, query, page]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const create = async () => {
    if (!name.trim()) { setNameError('Give the form a name'); return; }
    setBusy(true);
    try { const f = await api.createForm({ name: name.trim() }); router.push(`${basePath}/forms/${f.id}`); } catch (e) { setNameError(messageOf(e)); } finally { setBusy(false); }
  };
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); showSuccess(ok); await refetch(); } catch (e) { showError(messageOf(e)); } };

  const items = data?.items || [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <PageHeader title="Forms" subtitle="Build checklists, audits and data sheets once, assign them anywhere."
        actions={canManage && <Btn variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setName(''); setNameError(''); setCreating(true); }}>New form</Btn>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedControl<Tab> value={tab} onChange={(t) => { setTab(t); setPage(1); }} options={[{ value: 'active', label: 'Live' }, { value: 'draft', label: 'Drafts' }, { value: 'archived', label: 'Archived' }]} />
        <div className="relative min-w-0 flex-1 basis-56 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" /><input aria-label="Search forms" className={`${inputCls()} pl-9`} placeholder="Search forms" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
      </div>
      {error && <p className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {loading && !data ? (
        <Card className="!p-0 overflow-hidden" aria-busy="true">
          <div className="hidden border-b border-line bg-bg-subtle px-4 py-2.5 md:block"><Skeleton className="h-4 w-1/3" /></div>
          <div className="divide-y divide-line">{Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3"><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div><Skeleton className="hidden h-5 w-10 md:block" /><Skeleton className="hidden h-4 w-12 md:block" /><Skeleton className="hidden h-4 w-16 md:block" /><Skeleton className="h-8 w-24" /></div>
          ))}</div>
        </Card>
      ) : items.length === 0 ? (
          <Card className="flex flex-col items-center py-10 text-center">
            <Image src="/vectors/patterns.svg" alt="" width={200} height={140} className="mb-4 h-auto max-h-36 w-auto" />
            <h3 className="text-sm font-bold text-fg">{search ? 'No forms match' : tab === 'active' ? 'No live forms yet' : tab === 'draft' ? 'No drafts' : 'Nothing archived'}</h3>
            <p className="mt-1 max-w-sm text-xs text-fg-muted">{canManage && tab !== 'archived' ? 'Create a form, add fields, and publish it to start assigning.' : 'Forms will appear here.'}</p>
          </Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="hidden border-b border-line bg-bg-subtle text-xs text-fg-muted md:table-header-group">
                <tr><th className="px-4 py-2.5 font-semibold">Form</th><th className="px-3 py-2.5 font-semibold">Version</th><th className="px-3 py-2.5 font-semibold">Fields</th><th className="px-3 py-2.5 font-semibold">Assignments</th><th className="px-3 py-2.5 font-semibold">Edited</th>{canManage && <th className="px-3 py-2.5 text-right font-semibold">Actions</th>}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((f) => (
                  <tr key={f.id} className="flex flex-wrap items-center gap-x-3 px-4 py-3 hover:bg-bg-subtle md:table-row md:p-0">
                    <td className="min-w-0 flex-1 basis-full md:max-w-md md:px-4 md:py-3">
                      <button type="button" onClick={() => router.push(`${basePath}/forms/${f.id}`)} className="block min-w-0 text-left">
                        <span className="block break-words font-semibold text-fg hover:underline">{f.name}</span>
                        <span className="line-clamp-1 text-xs text-fg-muted">{f.description || 'No description'}</span>
                      </button>
                    </td>
                    <td className="py-1 md:px-3 md:py-3">{f.version_no ? <Pill label={`v${f.version_no}`} tone="strong" /> : <Pill label="Draft" />}</td>
                    <td className="py-1 text-xs text-fg-muted md:px-3 md:py-3 md:text-sm"><span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5 md:hidden" />{f.field_count ?? 0}<span className="md:hidden"> fields</span></span></td>
                    <td className="py-1 text-xs text-fg-muted md:px-3 md:py-3 md:text-sm">{f.assignments}<span className="md:hidden"> assignment{f.assignments === 1 ? '' : 's'}</span></td>
                    <td className="py-1 text-xs text-fg-muted md:px-3 md:py-3 md:text-sm">{new Date(f.updated_at).toLocaleDateString()}</td>
                    {canManage && (
                      <td className="ml-auto py-1 md:px-3 md:py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" title="Duplicate" aria-label={`Duplicate ${f.name}`} onClick={() => act(() => api.duplicateForm(f.id), 'Form duplicated')} className="rounded-md p-2 text-fg-muted hover:bg-bg-subtle hover:text-fg"><Copy className="h-4 w-4" /></button>
                          {f.status === 'archived'
                            ? <button type="button" title="Restore" aria-label={`Restore ${f.name}`} onClick={() => act(() => api.unarchiveForm(f.id), 'Form restored')} className="rounded-md p-2 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArchiveRestore className="h-4 w-4" /></button>
                            : <button type="button" title="Archive" aria-label={`Archive ${f.name}`} onClick={() => act(() => api.archiveForm(f.id), 'Form archived')} className="rounded-md p-2 text-fg-muted hover:bg-bg-subtle hover:text-fg"><Archive className="h-4 w-4" /></button>}
                          <button type="button" title="Delete" aria-label={`Delete ${f.name}`} onClick={() => setConfirm({ title: `Delete “${f.name}”?`, danger: true, cta: 'Delete', body: 'Only a form with no assignments and no submissions can be deleted. Otherwise archive it.', run: () => act(() => api.deleteForm(f.id), 'Form deleted') })} className="rounded-md p-2 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      {data && data.total > 0 && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted"><span>{data.total} form{data.total === 1 ? '' : 's'}{loading ? ' · loading…' : ''}</span>{pages > 1 && <div className="flex items-center gap-2"><Btn disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</Btn><span>Page {page} of {pages}</span><Btn disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Next</Btn></div>}</div>}

      <Dialog open={creating} onClose={() => setCreating(false)} title="New form" footer={<><Btn onClick={() => setCreating(false)}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={create}>Create and open builder</Btn></>}>
        <Labeled label="Form name" required error={nameError}><input autoFocus className={inputCls(Boolean(nameError))} value={name} maxLength={150} onChange={(e) => { setName(e.target.value); setNameError(''); }} onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="e.g. Daily safety audit" /></Labeled>
      </Dialog>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
