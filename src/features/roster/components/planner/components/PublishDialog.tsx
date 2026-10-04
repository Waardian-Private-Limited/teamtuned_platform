'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { KIND_LABELS } from '../../../constants/roster.constants';
import type { BoardEmployee, DiffChange, ShiftInfo } from '../../../types/roster.types';
import { useRosterBoardPublish } from '../../../hooks/useRosterBoardPublish';
import { describeCell } from '../../../utils/rosterBoard';
import { formatDay } from '../../../utils/rosterTime';

interface Props {
  open: boolean;
  onClose: () => void;
  rosterId: number;
  version: number;
  errorCount: number;
  employees: Map<number, BoardEmployee>;
  templates: Map<number, ShiftInfo>;
  onPublished: () => Promise<unknown>;
}

const LINE_CAP = 50;

function kindOf(c: DiffChange): 'added' | 'removed' | 'changed' {
  if (!c.before) return 'added';
  if (!c.after) return 'removed';
  return 'changed';
}

export function PublishDialog({ open, onClose, rosterId, version, errorCount, employees, templates, onPublished }: Props) {
  const [notify, setNotify] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const pub = useRosterBoardPublish(rosterId, open, version, onPublished);

  useEffect(() => {
    if (open) {
      setNotify(true);
      setConfirmed(false);
    }
  }, [open]);

  const counts = useMemo(() => {
    const c = { added: 0, changed: 0, removed: 0 };
    for (const ch of pub.changes) c[kindOf(ch)]++;
    return c;
  }, [pub.changes]);

  const grouped = useMemo(() => {
    const m = new Map<number, DiffChange[]>();
    for (const ch of pub.changes) {
      const l = m.get(ch.employeeId);
      if (l) l.push(ch);
      else m.set(ch.employeeId, [ch]);
    }
    return [...m.entries()];
  }, [pub.changes]);

  const lines: { id: number; text: string; name: string }[] = [];
  let shown = 0;
  for (const [empId, list] of grouped) {
    for (const ch of list) {
      if (shown >= LINE_CAP) break;
      const before = ch.before ? describeCell(ch.before, templates, KIND_LABELS) : 'Nothing';
      const after = ch.after ? describeCell(ch.after, templates, KIND_LABELS) : 'Removed';
      lines.push({ id: shown, name: employees.get(empId)?.name || `Employee ${empId}`, text: `${formatDay(ch.date, { weekday: 'short', day: 'numeric', month: 'short' })}: ${before} → ${after}` });
      shown++;
    }
  }
  const total = pub.changes.length;
  const blocked = errorCount > 0 && !confirmed;
  const noChanges = !pub.loading && !pub.loadError && total === 0;

  const go = async () => {
    if (await pub.publish(notify)) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Publish roster"
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <Button variant="secondary" className="!h-10 !w-auto px-4 !text-sm" onClick={onClose} disabled={pub.publishing}>Cancel</Button>
          <Button className="!h-10 !w-auto px-5 !text-sm" loading={pub.publishing} disabled={pub.loading || Boolean(pub.loadError) || blocked} onClick={go}>
            Publish
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {pub.loading && <div className="h-24 animate-pulse rounded-lg bg-bg-subtle" />}
        {pub.loadError && <p className="text-sm font-medium text-[var(--tt-danger)]">{pub.loadError}</p>}
        {noChanges && <p className="text-sm text-fg-muted">Nothing has changed since the last publish. Employees already see this schedule.</p>}
        {!pub.loading && total > 0 && (
          <>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ['Added', counts.added],
                ['Changed', counts.changed],
                ['Removed', counts.removed],
                ['People', pub.employeeIds.length],
              ].map(([l, n]) => (
                <div key={l} className="rounded-lg border border-line bg-bg-subtle px-2 py-2.5">
                  <p className="text-lg font-bold text-fg">{n}</p>
                  <p className="text-[11px] font-medium text-fg-muted">{l}</p>
                </div>
              ))}
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-line tt-scroll-hidden">
              {lines.map((l, i) => (
                <div key={l.id} className={`flex items-baseline justify-between gap-3 px-3 py-1.5 text-xs ${i ? 'border-t border-line/60' : ''}`}>
                  <span className="shrink-0 font-semibold text-fg">{l.name}</span>
                  <span className="truncate text-right text-fg-muted">{l.text}</span>
                </div>
              ))}
              {total > LINE_CAP && <p className="border-t border-line/60 px-3 py-2 text-center text-xs text-fg-muted">and {total - LINE_CAP} more changes</p>}
            </div>
          </>
        )}

        <div className="flex items-start justify-between gap-3 rounded-lg border border-line p-3">
          <div>
            <p className="text-sm font-semibold text-fg">Notify people whose schedule changed</p>
            <p className="text-xs text-fg-muted">They get a message with their updated shifts.</p>
          </div>
          <Switch checked={notify} onChange={setNotify} label="Notify people" />
        </div>

        {errorCount > 0 && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--tt-danger)] p-3">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--tt-danger)]" />
            <span className="text-sm text-fg">
              <b className="text-[var(--tt-danger)]">{errorCount} rule {errorCount === 1 ? 'issue is' : 'issues are'} still open.</b> I understand and want to publish anyway.
            </span>
          </label>
        )}

        {pub.publishError && (
          <div>
            <p className="text-sm font-medium text-[var(--tt-danger)]">{pub.publishError}</p>
            {pub.clashes.length > 0 && (
              <ul className="mt-2 max-h-40 divide-y divide-line/60 overflow-y-auto rounded-lg border border-[var(--tt-danger)] text-xs">
                {pub.clashes.map((c, i) => (
                  <li key={`${c.employee_id}:${c.work_date}:${i}`} className="flex justify-between gap-3 px-3 py-1.5">
                    <span className="font-semibold text-fg">{employees.get(c.employee_id)?.name || `Employee ${c.employee_id}`}</span>
                    <span className="text-fg-muted">{formatDay(c.work_date, { weekday: 'short', day: 'numeric', month: 'short' })} is already on another team&apos;s published roster</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
