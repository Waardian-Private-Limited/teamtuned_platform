'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { usePermission } from '@/lib/hooks/usePermission';
import { PAYROLL_TABS, COMPONENT_PERMISSIONS, DEBIT_PERMISSIONS, type PayrollTab } from '../constants/payroll-setup.constants';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useComponentList } from '../hooks/useComponentList';
import { useComponentMutations } from '../hooks/useComponentMutations';
import { useDebitList } from '../hooks/useDebitList';
import { useDebitMutations } from '../hooks/useDebitMutations';
import { ComponentsTab } from './components/ComponentsTab';
import { DebitRulesTab } from './components/DebitRulesTab';
import { TdsTab } from './components/TdsTab';
import type { SalaryComponent, DebitRule } from '../types/payroll-setup.model';

export function PayrollSetupPage({ initialTab: initialTabProp }: { initialTab?: PayrollTab }) {
  const params = useSearchParams();
  const queryTab = (params.get('tab') as PayrollTab | null) || null;
  const [tab, setTab] = React.useState<PayrollTab>(
    PAYROLL_TABS.some((t) => t.value === (initialTabProp || queryTab)) ? (initialTabProp || queryTab)! : 'components'
  );

  const { can } = usePermission();
  const componentPerms = {
    canAdd: can(COMPONENT_PERMISSIONS.ADD),
    canEdit: can(COMPONENT_PERMISSIONS.EDIT),
    canDelete: can(COMPONENT_PERMISSIONS.DELETE),
  };
  const debitPerms = {
    canAdd: can(DEBIT_PERMISSIONS.ADD),
    canEdit: can(DEBIT_PERMISSIONS.EDIT),
    canDelete: can(DEBIT_PERMISSIONS.DELETE),
  };

  const componentsList = useComponentList();
  const componentMutations = useComponentMutations(componentsList.refetch);

  const debitsList = useDebitList();
  const debitMutations = useDebitMutations(debitsList.refetch);

  const [componentForm, setComponentForm] = React.useState<{ mode: 'create' | 'edit'; component?: SalaryComponent } | null>(null);
  const [componentDeleteTarget, setComponentDeleteTarget] = React.useState<SalaryComponent | null>(null);

  const [ruleForm, setRuleForm] = React.useState<{ mode: 'create' | 'edit'; rule?: DebitRule } | null>(null);
  const [ruleDeleteTarget, setRuleDeleteTarget] = React.useState<DebitRule | null>(null);
  const [assignmentsRule, setAssignmentsRule] = React.useState<DebitRule | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 2xl:p-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Payroll Setup</h1>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted 2xl:text-sm">
            {tab === 'components' ? componentsList.total : debitsList.total}
          </span>
        </div>
        <div className="w-full lg:w-auto lg:min-w-[420px]">
          <SegmentedControl options={PAYROLL_TABS} value={tab} onChange={(v) => setTab(v as PayrollTab)} />
        </div>
      </div>

      {tab === 'components' && (
        <ComponentsTab
          list={componentsList}
          mutations={componentMutations}
          perms={componentPerms}
          onOpenCreate={() => setComponentForm({ mode: 'create' })}
          onOpenEdit={(component) => setComponentForm({ mode: 'edit', component })}
          onDelete={setComponentDeleteTarget}
          formState={componentForm}
          deleteTarget={componentDeleteTarget}
          onCloseForm={() => {
            setComponentForm(null);
            componentMutations.clearFieldError();
          }}
          onCloseDelete={() => {
            setComponentDeleteTarget(null);
            componentMutations.clearDeleteBlockedMessage();
          }}
        />
      )}

      {tab === 'debits' && (
        <DebitRulesTab
          list={debitsList}
          mutations={debitMutations}
          perms={debitPerms}
          components={componentsList.allComponents}
          onOpenCreate={() => setRuleForm({ mode: 'create' })}
          onOpenEdit={(rule) => setRuleForm({ mode: 'edit', rule })}
          onDelete={setRuleDeleteTarget}
          onOpenAssignments={setAssignmentsRule}
          formState={ruleForm}
          deleteTarget={ruleDeleteTarget}
          assignmentsTarget={assignmentsRule}
          onCloseForm={() => {
            setRuleForm(null);
            debitMutations.clearFieldError();
          }}
          onCloseDelete={() => {
            setRuleDeleteTarget(null);
            debitMutations.clearDeleteBlockedMessage();
          }}
          onCloseAssignments={() => setAssignmentsRule(null)}
        />
      )}

      {tab === 'tds' && (
        <TdsTab
          canEdit={debitPerms.canEdit}
          // The tab is controlled React state, so steps 3 and 4 move it directly —
          // a link to ?tab=debits would not change it after mount.
          onNavigateToRules={() => setTab('debits')}
        />
      )}
    </div>
  );
}

export default PayrollSetupPage;
