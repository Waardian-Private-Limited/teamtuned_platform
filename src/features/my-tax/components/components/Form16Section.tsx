import { Download, FileText, Loader2 } from 'lucide-react';
import type { Form16Entry } from '../../types/myTax.model';
import { dayOf, fyLabel } from '../../utils/format';
import { errorClass } from './TaxFields';

export function Form16Section({
  entries,
  downloading,
  error,
  onDownload,
}: {
  entries: Form16Entry[];
  downloading: string | null;
  error: { key: string; message: string } | null;
  onDownload: (entry: Form16Entry) => void;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
          <FileText className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-bold text-fg sm:text-base">Form 16</h2>
      </header>
      {entries.length === 0 ? (
        <p className="text-sm text-fg-muted">Your Form 16 appears here after payroll releases it (usually by 15 June).</p>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.key} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-fg">{fyLabel(entry.financialYear)}</p>
                  <p className="truncate text-xs text-fg-muted">{entry.companyName} · released {dayOf(entry.releasedAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDownload(entry)}
                  disabled={downloading !== null}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-40"
                >
                  {downloading === entry.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  <span>Download</span>
                </button>
              </div>
              {error?.key === entry.key && <p className={errorClass}>{error.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
