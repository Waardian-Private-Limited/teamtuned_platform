'use client';

import React from 'react';
import { X } from 'lucide-react';
import { EmployeePicker } from '../../catalog-shared/EmployeePicker';
import { personName } from '../../catalog-shared/catalogUi';
import type { TeamDetailTabProps } from './TeamTabProps';
import { TabFooter } from './TabFooter';

export function ManagersTab({ editor, detail }: TeamDetailTabProps) {
  const [managers, setManagers] = React.useState<{ id: number; name: string }[]>(
    detail.managers.map((m) => ({ id: m.employee_id, name: m.name }))
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div>
        <h4 className="mb-2 text-sm font-bold text-fg">Team managers</h4>
        <EmployeePicker
          subOrgId={null}
          excludeIds={managers.map((m) => m.id)}
          onPick={(e) => setManagers((m) => [...m, { id: e.id, name: personName(e) }])}
          placeholder="Add a manager by name or code…"
        />
        {managers.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-fg-muted">
            No managers yet. Without a manager, approval steps for &ldquo;Team manager&rdquo; fall back to the parent team, if there is one.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line/70 rounded-lg border border-line bg-surface">
            {managers.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="truncate text-sm font-semibold text-fg">{m.name}</span>
                <button type="button" aria-label={`Remove ${m.name}`} onClick={() => setManagers((list) => list.filter((x) => x.id !== m.id))} className="rounded p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <TabFooter label="Save managers" saving={editor.saving === 'managers'} error={editor.errors.managers?.message} onSave={() => editor.saveManagerList(managers.map((m) => m.id))} />
      </div>
      <aside className="h-fit rounded-xl border border-line bg-bg-subtle/60 p-4 text-xs leading-relaxed text-fg-muted">
        <h4 className="text-sm font-bold text-fg">What managers do</h4>
        <ul className="mt-2 list-disc space-y-1.5 pl-4">
          <li>They receive swap and open-shift requests that need a team manager&apos;s approval.</li>
          <li>They are notified when a new roster draft is ready for review.</li>
          <li>Managers of a parent team also look after its sub-teams.</li>
        </ul>
      </aside>
    </div>
  );
}
