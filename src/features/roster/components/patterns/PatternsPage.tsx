'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { Alert } from '@/components/ui/Alert';
import { ROSTER_PERMISSIONS } from '../../constants/roster.constants';
import { usePatternsList } from '../../hooks/usePatternsList';
import type { Pattern } from '../../types/roster.types';
import { ConfirmDeleteDialog } from '../catalog-shared/ConfirmDeleteDialog';
import { AddButton, PageHeader, SearchBox } from '../catalog-shared/ToolbarShell';
import { PatternCard } from './components/PatternCard';
import { PatternDialog } from './components/PatternDialog';
import { PatternsEmptyState } from './components/PatternsEmptyState';

export function PatternsPage() {
  const { can } = usePermission();
  const canAdd = can(ROSTER_PERMISSIONS.ADD);
  const canEdit = can(ROSTER_PERMISSIONS.EDIT);
  const canDelete = can(ROSTER_PERMISSIONS.DELETE);
  const list = usePatternsList();
  const [form, setForm] = React.useState<{ open: boolean; pattern: Pattern | null }>({ open: false, pattern: null });
  const [target, setTarget] = React.useState<Pattern | null>(null);

  const closeForm = () => {
    setForm((f) => ({ ...f, open: false }));
    list.clearFormError();
  };
  const closeDelete = () => {
    setTarget(null);
    list.clearDeleteError();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Rotation patterns" count={list.patterns.length} hint="Repeating cycles of shifts and days off, such as 4 on 4 off or 2 mornings, 2 evenings, 2 nights.">
        <SearchBox value={list.searchInput} onChange={list.setSearch} placeholder="Search patterns…" />
        {canAdd && <AddButton label="New pattern" onClick={() => setForm({ open: true, pattern: null })} />}
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {list.error && <Alert message={list.error} tone="error" />}
        {list.loading ? (
          <div className="grid animate-pulse gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-xl border border-line bg-bg-subtle/60" />)}
          </div>
        ) : list.visible.length === 0 ? (
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
            <PatternsEmptyState
              canAdd={canAdd}
              onAdd={() => setForm({ open: true, pattern: null })}
              searchTerm={list.searchInput}
              onClear={() => list.setSearch('')}
            />
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.visible.map((p) => (
              <PatternCard key={p.id} pattern={p} shifts={list.shifts} canEdit={canEdit} canDelete={canDelete} onEdit={(x) => setForm({ open: true, pattern: x })} onDelete={setTarget} />
            ))}
          </ul>
        )}
      </div>

      <PatternDialog
        open={form.open}
        pattern={form.pattern}
        presets={list.presets}
        shifts={list.shifts}
        saving={list.saving}
        error={list.formError}
        onClose={closeForm}
        onSave={async (input) => {
          if (await list.save(form.pattern?.id ?? null, input)) closeForm();
        }}
      />

      <ConfirmDeleteDialog
        open={Boolean(target)}
        title="Delete pattern"
        subject={target?.name ?? ''}
        body="A pattern that people are using cannot be deleted; move them to another schedule first."
        isDeleting={list.saving}
        error={list.deleteError}
        onClose={closeDelete}
        onConfirm={async () => {
          if (target && (await list.remove(target))) closeDelete();
        }}
      />
    </div>
  );
}
