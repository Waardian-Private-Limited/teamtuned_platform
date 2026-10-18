'use client';

import React from 'react';
import { OptionCard } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { usePermission } from '@/lib/hooks/usePermission';
import * as api from '../../api/employees.api';

const VISIBILITY: Record<api.BirthdayVisibility, { title: string; description: string }> = {
  primary_site: { title: 'Primary site only', description: 'People who share the same primary site' },
  my_sites: { title: 'All their sites', description: 'People who share any assigned site' },
  sub_org: { title: 'Same company', description: 'Everyone in the same sub-organization' },
  organization: { title: 'Everyone', description: 'All employees across every sub-organization' },
};

function Row({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-line px-3 py-2.5">
      <div>
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="text-xs text-fg-muted">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export function BirthdaysPanel() {
  const { subOrgs } = useManageableSubOrgs();
  const { isOrgAdmin } = usePermission();
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  const [birthdays, setBirthdays] = React.useState<api.BirthdaySettingsDto | null>(null);
  const [options, setOptions] = React.useState<api.BirthdayVisibility[]>([]);
  const [inherited, setInherited] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!isOrgAdmin && subOrgs.length && subOrgId === null) setSubOrgId(subOrgs[0].id);
  }, [isOrgAdmin, subOrgs, subOrgId]);

  React.useEffect(() => {
    api.getEmployeeSettings(subOrgId)
      .then((d) => { setBirthdays(d.settings.birthdays); setOptions(d.birthday_visibility_options); setInherited(d.inherited); })
      .catch((e) => setError(messageOf(e)));
  }, [subOrgId]);

  if (!birthdays) return <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />;

  const set = (patch: Partial<api.BirthdaySettingsDto>) => setBirthdays({ ...birthdays, ...patch });
  // A saved choice stays listed even if the organization no longer has what it needs.
  const choices = options.includes(birthdays.visibility) ? options : [...options, birthdays.visibility];

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const d = await api.updateEmployeeSettings(subOrgId, { birthdays });
      setBirthdays(d.settings.birthdays);
      setInherited(false);
      showSuccess('Birthday settings saved');
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {subOrgs.length > 0 && (
        <select value={subOrgId ?? ''} onChange={(e) => setSubOrgId(e.target.value ? Number(e.target.value) : null)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg">
          {isOrgAdmin && <option value="">Organization default</option>}
          {subOrgs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      {inherited && subOrgId && <p className="text-xs text-fg-muted">Uses the organization default. Saving gives this sub-organization its own settings.</p>}
      <Row title="Show birthdays" description="Birthday card on the app home screen" checked={birthdays.show} onChange={(show) => set({ show })} />
      {birthdays.show && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-fg-muted">Who sees a birthday</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {choices.map((v) => (
                <OptionCard key={v} selected={birthdays.visibility === v} onClick={() => set({ visibility: v })} title={VISIBILITY[v].title} description={VISIBILITY[v].description} />
              ))}
            </div>
            {subOrgs.length > 0 && <p className="text-xs text-fg-muted">When two companies differ, the narrower choice applies to both.</p>}
          </div>
          <Row title="Likes" description="Colleagues can like a birthday" checked={birthdays.likes} onChange={(likes) => set({ likes })} />
          <Row title="Wishes" description="Colleagues can send a birthday wish message" checked={birthdays.wishes} onChange={(wishes) => set({ wishes })} />
        </>
      )}
      {error && <p className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      <div className="flex justify-end">
        <button type="button" disabled={busy} onClick={save} className="h-9 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] disabled:opacity-40 sm:text-sm">Save</button>
      </div>
    </div>
  );
}
