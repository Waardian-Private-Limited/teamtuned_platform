'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTeamEditor, type TeamTab } from '../../../hooks/useTeamEditor';
import type { TeamsCatalog } from '../../../hooks/useTeamsCatalog';
import type { RosterUnit } from '../../../types/roster.types';
import { WideDrawer } from './WideDrawer';
import { BasicsTab } from './BasicsTab';
import { MembersTab } from './MembersTab';
import { ManagersTab } from './ManagersTab';
import { DemandTab } from './DemandTab';
import { ApprovalsTab } from './ApprovalsTab';
import { RulesTab } from './RulesTab';

const TABS: { value: TeamTab; label: string }[] = [
  { value: 'basics', label: 'Basics' },
  { value: 'members', label: 'Members' },
  { value: 'managers', label: 'Managers' },
  { value: 'demand', label: 'Demand' },
  { value: 'approvals', label: 'Approvals' },
  { value: 'rules', label: 'Rules' },
];

interface Props {
  open: boolean;
  unitId: number | null;
  units: RosterUnit[];
  catalog: TeamsCatalog;
  onClose: () => void;
  onChanged: () => void;
}

function Body({ unitId, units, catalog, onChanged }: Omit<Props, 'open'>) {
  const editor = useTeamEditor(unitId, onChanged);
  const [tab, setTab] = React.useState<TeamTab>('basics');
  const { detail } = editor;
  const unlocked = Boolean(detail);

  const show = (t: TeamTab) => (tab === t ? 'block' : 'hidden');
  const ctx = { editor, catalog, units };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1 overflow-x-auto tt-scroll-hidden">
          <SegmentedControl
            fitText
            options={TABS.map((t) => ({ value: t.value, label: t.label }))}
            value={tab}
            onChange={(v) => (v === 'basics' || unlocked) && setTab(v)}
          />
        </div>
        {!unlocked && (
          <span className="hidden shrink-0 items-center gap-1 text-[11px] text-fg-muted sm:inline-flex">
            <Lock className="h-3 w-3" /> Save the basics to unlock the other tabs
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto tt-scroll-hidden px-4 py-4 sm:px-6 sm:py-5">
        {editor.loading && <p className="py-10 text-center text-sm text-fg-muted">Loading team…</p>}
        {editor.loadError && <p role="alert" className="py-10 text-center text-sm text-[var(--tt-danger)]">{editor.loadError}</p>}
        {!editor.loading && !editor.loadError && (
          <>
            <div className={show('basics')}><BasicsTab {...ctx} /></div>
            {detail && (
              <>
                <div className={show('members')}><MembersTab {...ctx} detail={detail} /></div>
                <div className={show('managers')}><ManagersTab {...ctx} detail={detail} /></div>
                <div className={show('demand')}><DemandTab {...ctx} detail={detail} /></div>
                <div className={show('approvals')}><ApprovalsTab {...ctx} detail={detail} /></div>
                <div className={show('rules')}><RulesTab {...ctx} detail={detail} /></div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

export function TeamDrawer(props: Props) {
  const { open, unitId, onClose } = props;
  return (
    <WideDrawer
      open={open}
      onClose={onClose}
      title={unitId ? 'Edit team' : 'New team'}
      subtitle="Each tab saves on its own."
    >
      {open && <Body key={unitId ?? 'new'} {...props} />}
    </WideDrawer>
  );
}
