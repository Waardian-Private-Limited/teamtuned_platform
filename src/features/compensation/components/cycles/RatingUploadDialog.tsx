'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { messageOf } from '@/lib/api/errors';
import { csvRecords } from '@/lib/csv';
import { cx } from '@/theme/tokens';
import * as api from '../../api/compensation.api';
import type { RatingLevel, RatingUploadDto } from '../../types/compensation.dto';
import { Btn } from '../shared/Buttons';

/** HR's rating file: one row per person, matched by employee code. A missing increment takes the guide's. */
export function RatingUploadDialog({ cycleId, scale, onClose, onDone }: { cycleId: number; scale: RatingLevel[]; onClose: () => void; onDone: () => Promise<unknown> }) {
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState<RatingUploadDto | null>(null);
  const [busy, setBusy] = React.useState(false);

  const read = async (file: File | undefined) => {
    if (!file) return;
    const { rows: r, error: e } = csvRecords(await file.text(), ['employee_code', 'rating']);
    setRows(r);
    setError(e);
  };

  const upload = async () => {
    if (!rows.length) { setError(error || 'Choose the CSV file'); return; }
    setBusy(true);
    try {
      const r = await api.uploadRatings(cycleId, rows);
      setResult(r);
      await onDone();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      title={<h2 className="text-sm font-bold text-fg sm:text-base">Upload ratings</h2>}
      footer={result ? <Btn variant="primary" onClick={onClose}>Done</Btn> : <><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={upload}>Upload</Btn></>}
    >
      {result ? (
        <div className="space-y-2 text-sm text-fg">
          <p>Saved {result.saved} rating{result.saved === 1 ? '' : 's'}.{result.error_count ? ` ${result.error_count} not loaded:` : ''}</p>
          {result.error_count > 0 && <ul className="max-h-60 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-fg-muted">{result.errors.map((x) => <li key={x.row}>Row {x.row + 2}: {x.message}</li>)}</ul>}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="rounded-lg bg-bg-subtle p-2 font-mono text-xs text-fg">employee_code, rating, increment_percent, comment</p>
          <p className="text-xs text-fg-muted">
            <b>rating</b> must be one of {scale.map((s) => s.rating).join(', ')}. Leave <b>increment_percent</b> empty to use the guide; <b>comment</b> is kept as the reason. Only employees already in this cycle are updated.
          </p>
          <input type="file" accept=".csv,text/csv" onChange={(e) => read(e.target.files?.[0])} className={cx('block w-full rounded-lg border p-2 text-sm text-fg', error ? 'border-[var(--tt-danger)]' : 'border-line')} />
          {rows.length > 0 && !error && <p className="text-xs text-fg-muted">{rows.length} rows read.</p>}
          {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
        </div>
      )}
    </Dialog>
  );
}
