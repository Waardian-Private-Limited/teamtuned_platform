'use client';

import React from 'react';
import { Switch } from '@/components/ui/Switch';
import { showError } from '@/lib/toast';
import { enablePush, pushPermission, pushSupported } from '../push/webPush';
import { loadPreferences, setPreference, useNotificationState } from '../store/notificationStore';
import { CATEGORY_LABEL } from '../types';

/** Which categories push and make a sound, and whether this browser may show pushes at all. */
export function PreferencesPanel() {
  const { preferences } = useNotificationState();
  const [permission, setPermission] = React.useState<ReturnType<typeof pushPermission>>('unsupported');

  React.useEffect(() => {
    setPermission(pushPermission());
    if (preferences.length === 0) void loadPreferences().catch(() => showError('Could not load your settings'));
  }, [preferences.length]);

  const allow = async () => setPermission(await enablePush({ ask: true }).catch(() => pushPermission()));

  return (
    <div className="space-y-4">
      {pushSupported() && permission !== 'granted' && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-bg-subtle p-4">
          <div>
            <p className="text-sm font-semibold text-fg">Browser notifications</p>
            <p className="text-xs text-fg-muted">{permission === 'denied' ? 'Blocked in this browser. Allow notifications for this site in its settings.' : 'Get alerts even when TeamTuned is closed.'}</p>
          </div>
          {permission !== 'denied' && (
            <button type="button" onClick={allow} className="shrink-0 rounded-lg bg-[var(--tt-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--tt-on-primary)]">Allow</button>
          )}
        </div>
      )}
      <div className="divide-y divide-line rounded-2xl border border-line">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-fg-muted">
          <span>Category</span><span>Push</span><span>Sound</span>
        </div>
        {preferences.map((p) => (
          <div key={p.category} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-4 py-2.5">
            <span className="text-sm font-medium text-fg">{CATEGORY_LABEL[p.category]}</span>
            <Switch label={`${CATEGORY_LABEL[p.category]} push`} checked={p.push} onChange={(push) => setPreference({ ...p, push }).catch(() => showError('Could not save'))} />
            <Switch label={`${CATEGORY_LABEL[p.category]} sound`} checked={p.push && p.sound} disabled={!p.push} onChange={(sound) => setPreference({ ...p, sound }).catch(() => showError('Could not save'))} />
          </div>
        ))}
      </div>
    </div>
  );
}
