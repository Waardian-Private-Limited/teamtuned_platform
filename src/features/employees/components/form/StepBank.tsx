'use client';

import React from 'react';
import { Search } from 'lucide-react';
import * as employeesApi from '../../api/employees.api';
import { messageOf } from '@/lib/api/errors';
import { IFSC } from '../../utils/validators';
import { Section, TextField } from '@/components/ui/FormControls';
import type { EmployeeFormController } from './types';

const upper = (v: string) => v.replace(/\s+/g, '').toUpperCase();

export function StepBank({ c }: { c: EmployeeFormController }) {
  const { form, set, errors } = c;
  const [ifscState, setIfscState] = React.useState<{ loading: boolean; error: string; resolved: string }>({ loading: false, error: '', resolved: '' });
  const lastLookup = React.useRef('');
  const esiSelected = c.plan.debits.some((d) => d.rule.category === 'esi' && d.selected);
  const pfSelected = c.plan.debits.some((d) => d.rule.category === 'epf' && d.selected);

  const lookup = React.useCallback(async (raw: string) => {
    const code = upper(raw);
    if (!IFSC.test(code)) {
      setIfscState({ loading: false, error: 'Enter a valid 11-character IFSC', resolved: '' });
      return;
    }
    lastLookup.current = code;
    setIfscState({ loading: true, error: '', resolved: '' });
    try {
      const dto = await employeesApi.lookupIfsc(code);
      if (lastLookup.current !== code) return;
      set('bankName', dto.bank || '');
      set('branchName', dto.branch || '');
      setIfscState({ loading: false, error: '', resolved: [dto.city, dto.state].filter(Boolean).join(', ') });
    } catch (err) {
      if (lastLookup.current === code) setIfscState({ loading: false, error: messageOf(err), resolved: '' });
    }
  }, [set]);

  const onIfscChange = (v: string) => {
    const code = upper(v).slice(0, 11);
    set('ifscCode', code);
    setIfscState((s) => ({ ...s, error: '' }));
    if (code.length === 11 && IFSC.test(code) && code !== lastLookup.current) lookup(code);
  };

  return (
    <div className="space-y-4">
      <Section title="Bank account" description="Optional now. The employee can add it during onboarding.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Account number"
            inputMode="numeric"
            autoComplete="off"
            value={form.bankAccountNo}
            onChange={(v) => set('bankAccountNo', v.replace(/\D/g, '').slice(0, 18))}
            error={errors.bank_account_no}
          />
          <TextField
            label="IFSC"
            autoComplete="off"
            value={form.ifscCode}
            onChange={onIfscChange}
            error={errors.ifsc_code || ifscState.error}
            hint={ifscState.loading ? 'Fetching bank details…' : ifscState.resolved || 'Bank and branch fill in automatically'}
            placeholder="SBIN0001234"
            suffix={
              <button
                type="button"
                onClick={() => lookup(form.ifscCode)}
                disabled={ifscState.loading || !form.ifscCode}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-line px-2 text-[11px] font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-40"
              >
                {ifscState.loading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Search className="h-3 w-3" />}
                Fetch
              </button>
            }
          />
          <TextField label="Bank name" value={form.bankName} onChange={(v) => set('bankName', v)} error={errors.bank_name} maxLength={150} />
          <TextField label="Branch" value={form.branchName} onChange={(v) => set('branchName', v)} error={errors.branch_name} maxLength={100} />
        </div>
      </Section>

      <Section title="Identity and statutory numbers" description="Used for TDS, PF and ESI filings">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="PAN" autoComplete="off" value={form.panNumber} onChange={(v) => set('panNumber', upper(v).slice(0, 10))} error={errors.pan_number} placeholder="ABCDE1234F" />
          <TextField label="Aadhaar" inputMode="numeric" autoComplete="off" value={form.aadhaarNumber} onChange={(v) => set('aadhaarNumber', v.replace(/\D/g, '').slice(0, 12))} error={errors.aadhaar_number} />
          <TextField
            label="PF UAN"
            inputMode="numeric"
            autoComplete="off"
            value={form.pfUan}
            onChange={(v) => set('pfUan', v.replace(/\D/g, '').slice(0, 12))}
            error={errors.pf_uan}
            hint={pfSelected ? 'Needed for PF filing. Leave empty for a first job.' : undefined}
          />
          {esiSelected && (
            <TextField
              label="ESIC IP number"
              inputMode="numeric"
              autoComplete="off"
              value={form.esicIpNumber}
              onChange={(v) => set('esicIpNumber', v.replace(/\D/g, '').slice(0, 10))}
              error={errors.esic_ip_number}
            />
          )}
        </div>
      </Section>
    </div>
  );
}
