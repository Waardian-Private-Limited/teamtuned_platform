'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import * as api from '../api/approvals.api';
import type { Coverage } from '../types/approvals';

export function CoveragePanel({ requestType }: { requestType: string }) {
  const [data, setData] = React.useState<Coverage | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    api.getCoverage(requestType).then((d) => live && setData(d)).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [requestType]);

  if (error) return <Alert message={error} />;
  if (!data) return <TableSkeleton rows={6} columns={4} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-fg-muted">{data.total} active employees</span>
        <span className="inline-flex items-center gap-1 font-medium text-fg"><CheckCircle2 className="h-4 w-4" />{data.covered} have an approver</span>
        <span className={data.uncovered ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted'}>{data.uncovered} with a gap</span>
      </div>
      {data.rows.length === 0 ? (
        <p className="rounded-lg border border-line bg-bg-subtle p-4 text-sm text-fg-muted">Every employee&apos;s request resolves to an approver.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-subtle text-xs uppercase tracking-wide text-fg-muted">
              <tr><th className="px-4 py-2">Employee</th><th className="px-4 py-2">Flow</th><th className="px-4 py-2">Step</th><th className="px-4 py-2">Gap</th></tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.employeeId} className="border-t border-line">
                  <td className="px-4 py-2 text-fg">{r.name}<span className="ml-2 text-xs text-fg-muted">{r.employeeCode}</span></td>
                  <td className="px-4 py-2 text-fg-muted">{r.flowName || 'Default'}</td>
                  <td className="px-4 py-2 text-fg-muted">{r.step}</td>
                  <td className="px-4 py-2 font-medium text-[var(--tt-danger)]">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
