'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { cx } from '@/theme/tokens';
import { EmploymentTypesPanel } from './EmploymentTypesPanel';
import { CodeFormatPanel } from './CodeFormatPanel';

const TABS = [
  { key: 'types', label: 'Employment types' },
  { key: 'code', label: 'Employee code' },
] as const;

export function EmployeeSettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = React.useState<(typeof TABS)[number]['key']>('types');
  return (
    <Drawer open={open} onClose={onClose} title="Employee settings">
      <div className="mb-4 inline-flex rounded-lg border border-line bg-bg-subtle p-0.5">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cx('rounded-md px-3 py-1.5 text-xs font-semibold', tab === t.key ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted')}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'types' ? <EmploymentTypesPanel /> : <CodeFormatPanel />}
    </Drawer>
  );
}
