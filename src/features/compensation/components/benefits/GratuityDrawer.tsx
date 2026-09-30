'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { InfoRow, SelectField, TextField } from '@/components/ui/FormControls';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/compensation.api';
import { EXIT_REASONS } from '../../constants/compensation.constants';
import type { GratuityCalcDto } from '../../types/compensation.dto';
import { currentMonth, date, inr, today } from '../../utils/format';
import { Btn } from '../shared/Buttons';

export function GratuityDrawer({ employeeId, canAdd, onClose, onCreated }: { employeeId: number | null; canAdd: boolean; onClose: () => void; onCreated: () => void }) {
  const [asOf, setAsOf] = React.useState(today());
  const [reason, setReason] = React.useState('resignation');
  const [payoutMonth, setPayoutMonth] = React.useState(currentMonth());
  const [calc, setCalc] = React.useState<GratuityCalcDto | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!employeeId) return;
    let active = true;
    setError('');
    api.employeeGratuity(employeeId, { as_of: asOf, reason })
      .then((d) => active && setCalc(d))
      .catch((e) => active && setError(messageOf(e)));
    return () => { active = false; };
  }, [employeeId, asOf, reason]);

  const create = async () => {
    if (!employeeId) return;
    setBusy(true);
    try {
      const res = await api.createGratuityPayout({ employee_id: employeeId, as_of: asOf, reason, payout_month: payoutMonth });
      showSuccess(`Gratuity ${inr(res.amount)} added to ${res.payout_month} payroll`);
      onCreated();
      onClose();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={employeeId !== null} onClose={onClose} title={calc ? `${calc.employee.name} · Gratuity` : 'Gratuity'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Last working day" type="date" value={asOf} onChange={setAsOf} />
          <SelectField<string> label="Exit reason" value={reason} onChange={(v) => setReason(v || 'resignation')} options={EXIT_REASONS.map((r) => ({ value: r.value, label: r.label }))} />
        </div>
        {error && <p className="text-sm text-[var(--tt-danger)]">{error}</p>}
        {calc && (
          <>
            <div className="rounded-lg border border-line p-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{calc.eligible ? 'Gratuity payable' : 'Not eligible'}</p>
              <p className="mt-1 text-2xl font-bold text-fg">{inr(calc.amount)}</p>
              <p className="mt-1 text-xs text-fg-muted">{calc.reason}</p>
            </div>
            <div className="divide-y divide-line/60 rounded-lg border border-line px-3">
              <InfoRow label="Joined" value={date(calc.joining_date)} />
              <InfoRow label="Service" value={`${calc.service.years}y ${calc.service.months}m ${calc.service.days}d`} />
              <InfoRow label="Years counted" value={calc.counted_years} />
              <InfoRow label="Last drawn wage" value={`${inr(calc.monthly_wage)} (${calc.wage_components.join(' + ') || '—'})`} />
              <InfoRow label="Formula" value={calc.formula} />
              <InfoRow label="Calculated" value={inr(calc.calculated)} />
              {calc.capped && <InfoRow label="Capped at" value={inr(calc.cap)} />}
              <InfoRow label="Monthly provision" value={inr(calc.monthly_provision)} />
            </div>
            {canAdd && calc.eligible && calc.amount > 0 && (
              <div className="flex items-end gap-2">
                <div className="flex-1"><TextField label="Pay in payroll month" type="month" value={payoutMonth} onChange={setPayoutMonth} /></div>
                <Btn variant="primary" busy={busy} onClick={create}>Add to payroll</Btn>
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
