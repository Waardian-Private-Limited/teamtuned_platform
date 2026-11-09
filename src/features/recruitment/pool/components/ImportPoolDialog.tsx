'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, OptionCard, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import { importPool } from '../api/pool.api';
import type { ImportResult } from '../types/pool.types';
import { autoMap, downloadTemplate, IMPORT_FIELDS, readFile, toApiRows, type ParsedFile } from '../utils/importFile';

const CHUNK = 500;
const MAX_ROWS = 5000;
const PREVIEW = 4;

type Step = 'file' | 'map' | 'done';

/**
 * Brings old candidate records or a lead list in from a CSV / Excel file: pick the file, check how its
 * columns map, choose whether they are past records or leads to call, import. Sent in batches of 500.
 */
export function ImportPoolDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [step, setStep] = useState<Step>('file');
  const [file, setFile] = useState<{ name: string; parsed: ParsedFile } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<'records' | 'leads'>('records');
  const [source, setSource] = useState('');
  const [updateExisting, setUpdateExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep('file'); setFile(null); setMapping({}); setKind('records'); setSource(''); setUpdateExisting(true);
    setError(null); setBusy(false); setProgress(0); setResult(null);
  }, [open]);

  const pick = async (f: File | null) => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { setError('Use an Excel (.xlsx, .xls) or CSV file'); return; }
    setBusy(true);
    setError(null);
    try {
      const parsed = await readFile(f);
      if (!parsed.rows.length) { setError('The first sheet has no rows under the header'); return; }
      if (parsed.rows.length > MAX_ROWS) { setError(`Import at most ${MAX_ROWS.toLocaleString()} rows at a time; split the file`); return; }
      setFile({ name: f.name, parsed });
      setMapping(autoMap(parsed.headers));
      setSource(f.name.replace(/\.[^.]+$/, '').slice(0, 80));
      setStep('map');
    } catch {
      setError('Could not read this file. Save it as .xlsx or .csv and try again.');
    } finally {
      setBusy(false);
    }
  };

  const mapped = new Set(Object.values(mapping).filter(Boolean));
  const ready = mapped.has('first_name') && (mapped.has('phone') || mapped.has('email'));
  const rows = useMemo(() => (file ? toApiRows(file.parsed.rows, mapping) : []), [file, mapping]);

  const run = async () => {
    if (!file || !ready) return;
    setBusy(true);
    setError(null);
    const total: ImportResult = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [], warnings: [] };
    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const res = await importPool({
          rows: rows.slice(i, i + CHUNK),
          lead_source: source.trim() || undefined,
          lead_status: kind === 'leads' ? 'new' : null,
          update_existing: updateExisting,
        });
        total.created += res.created; total.updated += res.updated; total.skipped += res.skipped; total.failed += res.failed;
        total.errors.push(...res.errors.map((e) => ({ ...e, row: e.row + i + 1 })));
        total.warnings.push(...(res.warnings || []).map((w) => ({ ...w, row: w.row + i + 1 })));
        setProgress(Math.min(i + CHUNK, rows.length));
      }
      setResult(total);
      setStep('done');
      onImported();
    } catch (err) {
      setError(`${messageOf(err)}${progress ? ` (stopped after ${progress} rows; the rows before were saved)` : ''}`);
      if (total.created || total.updated) onImported();
    } finally {
      setBusy(false);
    }
  };

  const footer = step === 'done' ? (
    <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]">Done</button>
  ) : (
    <>
      {step === 'map' && <button type="button" onClick={() => setStep('file')} disabled={busy} className="mr-auto inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-fg-muted hover:text-fg disabled:opacity-50">Choose another file</button>}
      <button type="button" onClick={onClose} disabled={busy} className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3.5 text-sm font-semibold text-fg hover:bg-bg-subtle disabled:opacity-50">Cancel</button>
      {step === 'map' && (
        <button type="button" onClick={run} disabled={busy || !ready} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:opacity-50">
          {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          {busy ? `Importing ${progress}/${rows.length}…` : `Import ${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`}
        </button>
      )}
    </>
  );

  return (
    <Dialog open={open} onClose={busy ? () => {} : onClose} title="Import candidates" maxWidthClassName="max-w-2xl" footer={footer}>
      {step === 'file' && (
        <div className="space-y-4">
          <p className="text-xs text-fg-muted">Bring in candidates from earlier hiring or a lead list from a job board, so you can reach them again for new positions. People already in the pool (same email or phone) are not added twice.</p>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { pick(e.target.files?.[0] || null); e.target.value = ''; }} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0] || null); }}
            disabled={busy}
            className={cx('flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-10 text-xs text-fg-muted hover:bg-bg-subtle/50', error ? 'border-[var(--tt-danger)]' : 'border-line-strong')}
          >
            {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Upload className="h-5 w-5" />}
            <span><span className="font-semibold text-fg">Choose a file</span> or drop it here</span>
            <span className="text-[11px] text-fg-subtle">Excel or CSV, first row is the header, up to {MAX_ROWS.toLocaleString()} rows</span>
          </button>
          <button type="button" onClick={() => downloadTemplate()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg hover:underline">
            <Download className="h-3.5 w-3.5" />Download a template
          </button>
        </div>
      )}

      {step === 'map' && file && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span className="truncate font-semibold text-fg">{file.name}</span>
            <span className="shrink-0">· {file.parsed.rows.length} rows</span>
          </div>

          <div>
            <FieldLabel label="Columns" aside={<span className="text-[11px] text-fg-subtle">Needs a name and a phone or email</span>} />
            <div className="divide-y divide-line rounded-xl border border-line">
              {file.parsed.headers.map((h) => (
                <div key={h} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{h}</p>
                    <p className="truncate text-[11px] text-fg-subtle">{file.parsed.rows.slice(0, PREVIEW).map((r) => r[h]).filter(Boolean).join(' · ') || 'empty'}</p>
                  </div>
                  <select
                    aria-label={`Field for ${h}`}
                    value={mapping[h] || ''}
                    onChange={(e) => setMapping((m) => {
                      const next = { ...m };
                      // One column per field: picking a field takes it off any other column.
                      if (e.target.value) for (const k of Object.keys(next)) if (next[k] === e.target.value) delete next[k];
                      if (e.target.value) next[h] = e.target.value; else delete next[h];
                      return next;
                    })}
                    className={cx('h-9 w-44 shrink-0 rounded-lg border bg-surface px-2 text-xs font-semibold outline-none sm:text-sm', mapping[h] ? 'border-fg/30 text-fg' : 'border-line text-fg-subtle')}
                  >
                    <option value="">Don&apos;t import</option>
                    {IMPORT_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {!ready && <p className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">Map a column to First name, and one to Phone or Email.</p>}
          </div>

          <div>
            <FieldLabel label="Bring them in as" />
            <div className="grid gap-2 sm:grid-cols-2">
              <OptionCard selected={kind === 'records'} onClick={() => setKind('records')} title="Past records" description="Kept for reference and search when a new position opens." />
              <OptionCard selected={kind === 'leads'} onClick={() => setKind('leads')} title="Leads to call" description="Start as New, so the team calls and follows them up." />
            </div>
          </div>

          <TextField label="Source" value={source} onChange={setSource} maxLength={80} hint="Written on rows without their own Source column, e.g. Naukri, Old records 2024." />

          <label className="flex items-start gap-3 text-sm text-fg">
            <Switch checked={updateExisting} onChange={setUpdateExisting} label="Fill blanks of people already in the pool" />
            <span>
              <span className="font-semibold">Fill in what is missing for people already in the pool</span>
              <span className="block text-xs text-fg-muted">Only empty fields are filled; nothing they already have is changed.</span>
            </span>
          </label>
          {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
        </div>
      )}

      {step === 'file' && error && <p role="alert" className="mt-3 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}

      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-fg"><CheckCircle2 className="h-5 w-5" />Import finished</div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[['Added', result.created], ['Updated', result.updated], ['Already there', result.skipped], ['Not imported', result.failed]].map(([label, n]) => (
              <div key={label as string} className="rounded-xl border border-line p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</dt>
                <dd className={cx('text-xl font-extrabold tabular-nums', label === 'Not imported' && Number(n) > 0 ? 'text-[var(--tt-danger)]' : 'text-fg')}>{n}</dd>
              </div>
            ))}
          </dl>
          {result.errors.length > 0 && (
            <div>
              <FieldLabel label="Rows not imported" />
              <ul className="max-h-48 divide-y divide-line overflow-y-auto rounded-xl border border-line text-xs">
                {result.errors.map((e, i) => (
                  <li key={i} className="flex gap-3 px-3 py-1.5"><span className="w-14 shrink-0 font-semibold tabular-nums text-fg">Row {e.row}</span><span className="text-fg-muted">{e.message}</span></li>
                ))}
              </ul>
              <p className="mt-1 text-[11px] text-fg-subtle">Row numbers count the header as row 1. Fix these in the file and import it again; rows already added are skipped.</p>
            </div>
          )}
          {result.warnings.length > 0 && (
            <div>
              <FieldLabel label="Imported without some values" />
              <ul className="max-h-40 divide-y divide-line overflow-y-auto rounded-xl border border-line text-xs">
                {result.warnings.map((w, i) => (
                  <li key={i} className="flex gap-3 px-3 py-1.5"><span className="w-14 shrink-0 font-semibold tabular-nums text-fg">Row {w.row}</span><span className="text-fg-muted">{w.message}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
