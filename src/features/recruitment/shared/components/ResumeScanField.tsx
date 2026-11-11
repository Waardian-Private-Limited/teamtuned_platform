'use client';

import { useCallback, useRef, useState } from 'react';
import { CheckCircle2, FileText, Upload, X } from 'lucide-react';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import { TunerIcon } from '@/features/data-collection/components/shared/TunerIcon';
import { scanResume } from '../api/recruitment.api';
import { serverFieldOf } from '../utils/errors';

type ScanState = 'idle' | 'reading' | 'filled' | 'nothing' | 'failed';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Tuner answers in the apply form's keys; recruiter forms use the server's column names.
const SCAN_KEY: Record<string, string> = {
  experience: 'total_experience',
  notice_period: 'notice_period_days',
  linkedin: 'linkedin_url',
  portfolio: 'portfolio_url',
};

/**
 * A recruiter form's resume: picking one makes Tuner read it and fill the form. Only keys the form has and that are
 * still empty are filled, and anything typed while Tuner reads wins. `filled` marks the fields Tuner wrote until
 * the recruiter edits them (`unmark`).
 */
export function useResumeScan<V extends Record<string, string>>(values: V, setValues: (next: V) => void) {
  const [resume, setResume] = useState<File | null>(null);
  const [state, setState] = useState<ScanState>('idle');
  const [filled, setFilled] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | undefined>();
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const run = useRef(0);

  const read = useCallback(async (file: File) => {
    const mine = ++run.current;
    const before = valuesRef.current;
    setState('reading');
    try {
      const res = await scanResume(file);
      if (mine !== run.current) return;
      const now = valuesRef.current;
      const next: Record<string, string> = { ...now };
      const keys = new Set<string>();
      Object.entries(res?.fields || {}).forEach(([raw, val]) => {
        const k = SCAN_KEY[raw] || raw;
        if (!(k in next) || !val || next[k].trim() || now[k] !== before[k]) return;
        next[k] = String(val);
        keys.add(k);
      });
      setValues(next as V);
      setFilled(keys);
      setState(keys.size ? 'filled' : res?.status === 'unavailable' ? 'failed' : 'nothing');
    } catch (err) {
      if (mine !== run.current) return;
      if (serverFieldOf(err) === 'resume') setError(messageOf(err));
      setState('failed');
    }
  }, [setValues]);

  const pick = useCallback((file: File | null) => {
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) { setError('Use a PDF or Word file'); return; }
    if (file.size > MAX_BYTES) { setError('Keep the file under 5 MB'); return; }
    setResume(file);
    setError(undefined);
    read(file);
  }, [read]);

  const remove = useCallback(() => { run.current += 1; setResume(null); setState('idle'); setFilled(new Set()); setError(undefined); }, []);
  const retry = useCallback(() => { if (resume) read(resume); }, [read, resume]);
  const unmark = useCallback((key: string) => setFilled((f) => { if (!f.has(key)) return f; const n = new Set(f); n.delete(key); return n; }), []);

  return { resume, state, reading: state === 'reading', filled, error, setError, pick, remove, retry, unmark };
}

export type ResumeScan = ReturnType<typeof useResumeScan>;

/** The resume picker with Tuner's progress under it. */
export function ResumeScanField({ scan, error }: { scan: ResumeScan; error?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const shown = error || scan.error;
  const { resume, state, filled } = scan;
  return (
    <div>
      <FieldLabel label="Resume" />
      <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { scan.pick(e.target.files?.[0] || null); e.target.value = ''; }} />
      {resume ? (
        <div className={cx('rounded-lg border px-3 py-2.5', shown ? 'border-[var(--tt-danger)]' : 'border-line')}>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="min-w-0 flex-1 truncate text-sm text-fg">{resume.name}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-fg-subtle">{Math.ceil(resume.size / 1024)} KB</span>
            <button type="button" onClick={scan.remove} aria-label="Remove resume" className="rounded p-0.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"><X className="h-3.5 w-3.5" /></button>
          </div>
          {state !== 'idle' && (
            <div className="mt-2 flex items-center gap-2 border-t border-line pt-2 text-xs" role="status" aria-live="polite">
              {state === 'reading' ? <TunerIcon className="h-4 w-4 animate-pulse" /> : state === 'filled' ? <CheckCircle2 className="h-4 w-4 text-fg" /> : <TunerIcon className="h-4 w-4 opacity-60" />}
              <span className={cx(state === 'filled' ? 'font-semibold text-fg' : 'text-fg-muted')}>
                {state === 'reading'
                  ? 'Tuner is reading the resume…'
                  : state === 'filled'
                    ? `Tuner filled ${filled.size} ${filled.size === 1 ? 'field' : 'fields'}. Check them before saving.`
                    : state === 'nothing'
                      ? 'Tuner found no details it could use in this file. Fill the form by hand.'
                      : 'Tuner could not read it right now. Fill the form by hand or try again.'}
              </span>
              {state === 'failed' && (
                <button type="button" onClick={scan.retry} className="ml-auto shrink-0 font-semibold text-fg underline">Try again</button>
              )}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); scan.pick(e.dataTransfer.files?.[0] || null); }}
          className={cx('flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-5 text-xs text-fg-muted hover:bg-bg-subtle/50', shown ? 'border-[var(--tt-danger)]' : 'border-line-strong')}
        >
          <span className="flex items-center gap-1.5"><Upload className="h-4 w-4" /><TunerIcon className="h-4 w-4" /></span>
          <span><span className="font-semibold text-fg">Choose a resume</span> or drop it here</span>
          <span className="text-[11px] text-fg-subtle">Tuner reads it and fills the form. PDF, DOC or DOCX, up to 5 MB</span>
        </button>
      )}
      <FieldMessage error={shown} />
    </div>
  );
}

/** Wrapper class for a field Tuner just filled (a short pulse). */
export const filledClass = (on: boolean) => (on ? 'tt-filled rounded-[var(--tt-radius-control)]' : undefined);
