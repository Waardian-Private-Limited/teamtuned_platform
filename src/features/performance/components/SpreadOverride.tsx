'use client';

import React from 'react';
import { ApiError } from '@/lib/api/errors';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/FormControls';
import type { SpreadBlock } from '../types/perf.types';
import { Btn, Table, td } from './ui';

/** The rows an enforced calibration guide refused, when that is what the error is. */
export function spreadBlockOf(err: unknown): SpreadBlock | null {
  if (!(err instanceof ApiError) || err.code !== 'PERF_DISTRIBUTION') return null;
  const data = err.data as Partial<SpreadBlock> | null;
  return { violations: data?.violations || [], total: data?.total ?? 0, can_override: Boolean(data?.can_override), message: err.message };
}

/** Shows how the spread is off the company guide and, for someone who runs the cycle, asks for the reason to go ahead anyway. */
export function SpreadOverrideDialog({ block, action, bandName, onClose, onConfirm }: {
  block: SpreadBlock | null; action: string; bandName: (code: string) => string; onClose: () => void; onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  React.useEffect(() => { setReason(''); setError(''); }, [block]);

  const go = async () => {
    if (reason.trim().length < 3) { setError('Write why the spread is right this time'); return; }
    setBusy(true);
    try { await onConfirm(reason.trim()); } finally { setBusy(false); }
  };

  return (
    <Dialog open={Boolean(block)} onClose={onClose} title="The ratings are off the company spread" maxWidthClassName="max-w-xl"
      footer={<><Btn variant="secondary" onClick={onClose}>{block?.can_override ? 'Cancel' : 'Close'}</Btn>{block?.can_override && <Btn variant="danger" loading={busy} onClick={go}>{action} anyway</Btn>}</>}>
      {block && (
        <div className="space-y-3">
          <p className="text-sm text-fg">{block.message}</p>
          <div className="overflow-hidden rounded-lg border border-line">
            <Table minWidth={420} head={[{ label: 'Rating' }, { label: 'People', className: 'w-20' }, { label: 'Share', className: 'w-24' }, { label: 'Guide', className: 'w-24' }]}>
              {block.violations.map((v) => (
                <tr key={v.code}>
                  <td className={td}><span className="font-semibold">{bandName(v.code)}</span></td>
                  <td className={td}>{v.count}</td>
                  <td className={`${td} font-semibold text-[var(--tt-danger)]`}>{v.percent}% · {v.flag === 'over' ? 'too many' : 'too few'}</td>
                  <td className={`${td} text-fg-muted`}>{v.target ?? '—'}%</td>
                </tr>
              ))}
            </Table>
          </div>
          <p className="text-[11px] text-fg-muted">Counted over {block.total} people. Your company enforces this guide in Performance setup, Settings.</p>
          {block.can_override && <TextField label="Reason to go ahead" required value={reason} onChange={(v) => { setReason(v); setError(''); }} maxLength={500} error={error} placeholder="For example: a small launch team, agreed with the leadership" />}
        </div>
      )}
    </Dialog>
  );
}
