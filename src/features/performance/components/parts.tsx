'use client';

import React from 'react';
import { Archive, ArchiveRestore, Pencil, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import type { StatusFilter } from '../types/perf.types';
import { Btn, IconBtn, SearchBox, Table, td } from './ui';

interface ShellProps<T extends { id: number; sub_organization_id: number | null }> {
  title: string;
  intro: string;
  noun: string;
  items: T[] | null;
  loadError: string;
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (item: T) => void;
  onArchive: (id: number, archived: boolean) => Promise<string>;
  /** Left side of a row: the name line and a line of detail. */
  row: (item: T) => { name: React.ReactNode; detail?: React.ReactNode };
  /** Extra buttons on the right of a row, before edit and archive. */
  actions?: (item: T) => React.ReactNode;
}

/** The list every setup tab shares: search, active/archived switch, add button, then a table with edit and archive per row. */
export function ListShell<T extends { id: number; sub_organization_id: number | null }>(p: ShellProps<T>) {
  const [rowError, setRowError] = React.useState<{ id: number; message: string } | null>(null);
  const [q, setQ] = React.useState('');
  const archive = async (item: T) => {
    setRowError(null);
    const message = await p.onArchive(item.id, p.status === 'active');
    if (message) setRowError({ id: item.id, message });
  };
  const term = q.trim().toLowerCase();
  const shown = p.items?.filter((item) => !term || String((item as { name?: unknown }).name ?? '').toLowerCase().includes(term));
  const noun = p.noun.charAt(0).toUpperCase() + p.noun.slice(1);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-2xl text-xs text-fg-muted">{p.intro}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
          <SearchBox value={q} onChange={setQ} placeholder={`Search ${p.noun}s…`} />
          <SegmentedControl<StatusFilter>
            options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]}
            value={p.status}
            onChange={p.onStatus}
            fitText
          />
          {p.canEdit && <Btn icon={Plus} onClick={p.onAdd}>Add {p.noun}</Btn>}
        </div>
      </div>

      {p.loadError ? (
        <p role="alert" className="text-sm text-[var(--tt-danger)]">{p.loadError}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          {shown === undefined && <TableSkeleton rows={4} columns={3} />}
          {shown?.length === 0 && (
            <EmptyState
              compact={p.status !== 'active' || Boolean(term)}
              illustration={{ src: '/vectors/patterns.svg', width: 220, height: 160, alt: '' }}
              title={term ? 'Nothing matches' : p.status === 'active' ? `No ${p.noun}s yet` : `No archived ${p.noun}s`}
              description={term ? 'Try another name.' : p.status === 'active' ? (p.canEdit ? `Add one, or import a starter pack to get a ready set you can edit.` : `Nothing has been set up here yet.`) : undefined}
              action={term ? { label: 'Clear search', onClick: () => setQ('') } : p.status === 'active' && p.canEdit ? { label: `Add ${p.noun}`, onClick: p.onAdd } : undefined}
            />
          )}
          {shown && shown.length > 0 && (
            <Table minWidth={520} head={[{ label: noun }, ...(p.canEdit ? [{ label: 'Actions', className: 'w-32 text-right' }] : [])]}>
              {shown.map((item) => {
                const r = p.row(item);
                return (
                  <tr key={item.id} className="transition-colors hover:bg-bg-subtle/50">
                    <td className={td}>
                      <span className="inline-flex flex-wrap items-center gap-2 font-semibold">{r.name}<SubOrgBadge subOrgId={item.sub_organization_id} /></span>
                      {r.detail && <span className="mt-0.5 block text-[11px] text-fg-muted">{r.detail}</span>}
                      {rowError?.id === item.id && <span role="alert" className="mt-1 block text-xs font-medium text-[var(--tt-danger)]">{rowError.message}</span>}
                    </td>
                    {p.canEdit && (
                      <td className={`${td} text-right`}>
                        <div className="flex items-center justify-end gap-1">
                          {p.actions?.(item)}
                          {p.status === 'active' && <IconBtn label={`Edit ${p.noun}`} onClick={() => p.onEdit(item)}><Pencil className="h-4 w-4" /></IconBtn>}
                          <IconBtn label={p.status === 'active' ? `Archive ${p.noun}` : `Restore ${p.noun}`} onClick={() => archive(item)}>
                            {p.status === 'active' ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                          </IconBtn>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </Table>
          )}
        </div>
      )}
    </div>
  );
}

/** Dialog footer used by every setup form. */
export function FormFooter({ onCancel, onSave, saving, label = 'Save' }: { onCancel: () => void; onSave: () => void; saving: boolean; label?: string }) {
  return (
    <>
      <Btn type="button" variant="secondary" onClick={onCancel}>Cancel</Btn>
      <Btn type="button" onClick={onSave} loading={saving}>{label}</Btn>
    </>
  );
}

/** Text for a number box -> number or null. */
export const num = (v: string): number | null => (v.trim() === '' || Number.isNaN(Number(v)) ? null : Number(v));
export const numText = (v: number | string | null | undefined): string => (v === null || v === undefined ? '' : String(v));
