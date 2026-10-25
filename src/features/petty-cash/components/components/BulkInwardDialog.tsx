'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { splitError } from '@/features/expense-bills/utils/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/petty-cash.api';
import { BULK_INWARD_MAX } from '../../constants/petty-cash.constants';
import type { InwardResult } from '../../types/petty-cash.model';
import { toInwardResult, toPaperResult } from '../../types/petty-cash.mapper';
import { leftoverError } from '../../utils/formError';
import { AutoNumbersCheck } from './GoodsQtyTable';
import { FormError } from './Primitives';
import { InwardNos } from './StatusBadges';

interface BulkInwardDialogProps {
  open: boolean;
  /** `goods` receives everything still pending (one inward number per item); `paper` ticks the paper bill (no number). */
  kind: 'goods' | 'paper';
  ids: number[];
  /** Expense number by id, for the skipped list. */
  label: (id: number) => string;
  onClose: () => void;
  onDone: () => void;
  /** Paper bills only: takes the picked bills back to not received. */
  undo?: boolean;
}

/** Receives all goods (or, for paper bills, ticks or un-ticks the bill) of the picked expenses with one note; expenses that cannot change come back skipped. */
export function BulkInwardDialog({ open, kind, ids, label, onClose, onDone, undo = false }: BulkInwardDialogProps) {
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<{ fields: Record<string, string>; form: string } | null>(null);
  const [result, setResult] = React.useState<{ updated: number; skipped: Array<{ id: number; reason: string }> } | null>(null);
  const [numbers, setNumbers] = React.useState<InwardResult['items']>([]);
  const goods = kind === 'goods';
  const [typed, setTyped] = React.useState(false);
  const [autoAll, setAutoAll] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    setNote('');
    setError(null);
    setResult(null);
    setNumbers([]);
    setAutoAll(true);
    if (!goods) return;
    // Typed numbering decides whether the box shows; when the settings cannot be read it shows (the API ignores it in automatic mode).
    let live = true;
    api
      .getSettings()
      .then((dto) => live && setTyped([dto.default, dto.effective, ...(dto.overrides || [])].some((x) => x?.inward_numbering === 'typed')))
      .catch(() => live && setTyped(true));
    return () => {
      live = false;
    };
  }, [open, goods]);

  const tooMany = ids.length > BULK_INWARD_MAX;

  const submit = async () => {
    if (tooMany) return;
    setBusy(true);
    setError(null);
    try {
      const r = goods
        ? toInwardResult(await api.receiveGoodsBulk({ ids, ...(typed && autoAll ? { auto: true } : {}), note: note.trim() || undefined }))
        : toPaperResult(await api.setPaperCopyBulk({ ids, received: !undo, note: note.trim() || undefined }));
      onDone();
      if (!r.skipped.length) {
        showSuccess(goods ? `Goods of ${r.updated} ${r.updated === 1 ? 'expense' : 'expenses'} received` : `${r.updated} paper ${r.updated === 1 ? 'bill' : 'bills'} ${undo ? 'set back to not received' : 'received'}`);
        onClose();
      } else {
        if (goods) setNumbers((r as InwardResult).items);
        setResult(r);
      }
    } catch (err) {
      setError(splitError(err));
    } finally {
      setBusy(false);
    }
  };

  const n = ids.length;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title={result ? (goods ? 'Goods updated' : 'Paper bills updated') : goods ? 'Receive all goods' : undo ? 'Paper bills not received' : 'Receive paper bills'}
      footer={
        result ? (
          <Btn variant="primary" onClick={onClose}>
            Done
          </Btn>
        ) : (
          <>
            <Btn onClick={onClose}>Back</Btn>
            <Btn variant="primary" busy={busy} disabled={!n || tooMany} onClick={submit}>
              {undo ? `Set ${n} back` : goods ? `Receive goods of ${n}` : `Receive ${n}`}
            </Btn>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3 text-sm">
          <p className="text-fg">
            <span className="font-semibold">{result.updated}</span> {undo ? 'set back' : 'received'} · <span className="font-semibold">{result.skipped.length}</span> skipped
          </p>
          {goods && numbers.length > 0 && (
            <ul className="max-h-40 divide-y divide-line overflow-y-auto rounded-lg border border-line">
              {numbers.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-xs font-semibold text-fg">{label(i.id)}</span>
                  <InwardNos numbers={i.inwardNos} />
                </li>
              ))}
            </ul>
          )}
          <ul className="max-h-60 divide-y divide-line overflow-y-auto rounded-lg border border-line">
            {result.skipped.map((s) => (
              <li key={s.id} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <span className="shrink-0 text-xs font-semibold text-fg">{label(s.id)}</span>
                <span className="text-xs text-fg-muted sm:text-right">{s.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            {goods
              ? `Records that everything still pending on the ${n} selected ${n === 1 ? 'expense' : 'expenses'} has arrived, and numbers every item received. Expenses with no goods, or with all goods already received, are skipped. To receive part of a delivery, open the expense.`
              : undo
                ? `The paper bills of ${n} selected ${n === 1 ? 'expense' : 'expenses'} show as not received again. Bills that were not received are skipped.`
                : `Records that you have the original paper bills of ${n} selected ${n === 1 ? 'expense' : 'expenses'}. Paper bills have no number. Expenses that do not need a paper bill, or already have it, are skipped.`}
          </p>
          {goods && typed && <AutoNumbersCheck checked={autoAll} onChange={setAutoAll} disabled={busy} />}
          <Textarea label="Note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder={undo ? 'Why they are set back' : goods ? 'e.g. Delivered to the site store' : 'e.g. Received at the front desk'} error={error?.fields.note} />
          <FormError message={tooMany ? `Pick at most ${BULK_INWARD_MAX} expenses at a time.` : leftoverError(error, ['note'])} />
        </div>
      )}
    </Dialog>
  );
}
