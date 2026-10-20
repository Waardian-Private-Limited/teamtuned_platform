'use client';

import React from 'react';
import { Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { usePerquisites, type PerquisiteDraft, type PerquisiteRowKey } from '../../hooks/usePerquisites';
import type { Perquisite } from '../../types/payroll-setup.model';
import { formatCurrency } from '../../utils/validators';

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-surface px-2.5 h-9 text-xs text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-sm';
const errorInputClass =
  'w-full min-w-0 rounded-lg border border-[var(--tt-danger)] bg-surface px-2.5 h-9 text-xs text-fg outline-none focus:ring-1 focus:ring-[var(--tt-danger)] sm:text-sm';
const errorClass = 'mt-1 text-[11px] font-medium text-[var(--tt-danger)]';
const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wider text-fg-subtle';

const draftOf = (p: Perquisite | null, firstType: string): PerquisiteDraft => ({
  perkType: p?.perkType ?? firstType,
  description: p?.description ?? '',
  value: p ? String(p.value) : '',
  recovered: p && p.recovered ? String(p.recovered) : '',
});

const same = (a: PerquisiteDraft, b: PerquisiteDraft) =>
  a.perkType === b.perkType && a.description === b.description && a.value === b.value && a.recovered === b.recovered;

function PerkRow({
  rowKey,
  saved,
  types,
  perks,
  onDone,
  onChanged,
}: {
  rowKey: PerquisiteRowKey;
  saved: Perquisite | null;
  types: Array<{ code: string; label: string }>;
  perks: ReturnType<typeof usePerquisites>;
  /** A new row closes once saved or cancelled. */
  onDone?: () => void;
  onChanged?: () => void;
}) {
  const initial = React.useMemo(() => draftOf(saved, types[0]?.code ?? ''), [saved, types]);
  const [draft, setDraft] = React.useState(initial);
  React.useEffect(() => setDraft(initial), [initial]);
  const busy = perks.busy === rowKey;
  const error = perks.error?.row === rowKey ? perks.error : null;
  const bad = (field: string) => error?.field === field;
  const dirty = !same(draft, initial);
  const taxable = Math.max(0, (Number(draft.value) || 0) - (Number(draft.recovered) || 0));
  const set = (patch: Partial<PerquisiteDraft>) => setDraft((prev) => ({ ...prev, ...patch }));

  return (
    <li className="rounded-lg border border-line p-2.5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select value={draft.perkType} onChange={(e) => set({ perkType: e.target.value })} aria-label="Type" className={bad('perk_type') ? errorInputClass : inputClass}>
          {!draft.perkType && <option value="">Choose type…</option>}
          {types.map((t) => (
            <option key={t.code} value={t.code}>{t.label}</option>
          ))}
        </select>
        <input value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="Description" maxLength={300} aria-label="Description" className={bad('description') ? errorInputClass : inputClass} />
      </div>
      <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <input type="number" min={0} value={draft.value} onChange={(e) => set({ value: e.target.value })} placeholder="Value ₹" aria-label="Value" className={bad('value') ? errorInputClass : inputClass} />
        <input type="number" min={0} value={draft.recovered} onChange={(e) => set({ recovered: e.target.value })} placeholder="Recovered ₹" aria-label="Recovered from employee" className={bad('recovered') ? errorInputClass : inputClass} />
        <span className="hidden text-xs tabular-nums text-fg sm:block">
          <span className="text-fg-muted">Taxable </span>{formatCurrency(taxable)}
        </span>
        <span className="flex items-center gap-1">
          {(dirty || rowKey === 'new') && (
            <button
              type="button"
              disabled={busy || !dirty && rowKey !== 'new'}
              onClick={async () => {
                if (await perks.save(rowKey, draft)) {
                  onDone?.();
                  onChanged?.();
                }
              }}
              aria-label="Save row"
              className="rounded-md border border-line p-1.5 text-fg transition-colors hover:bg-bg-subtle disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (rowKey === 'new') onDone?.();
              else if (await perks.remove(rowKey)) onChanged?.();
            }}
            aria-label={rowKey === 'new' ? 'Cancel row' : 'Delete row'}
            className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)] disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <p className="mt-1 text-[11px] tabular-nums text-fg-muted sm:hidden">Taxable {formatCurrency(taxable)}</p>
      {error && <p className={errorClass}>{error.message}</p>}
    </li>
  );
}

/** Perquisites (Form 12BA): taxed as salary, printed with Form 16. Each row saves on its own. */
export function PerquisitesSection({
  employeeId,
  financialYear,
  onChanged,
}: {
  employeeId: number | null;
  financialYear: string;
  /** A row saved or deleted: the tax estimate changes with it. */
  onChanged?: () => void;
}) {
  const perks = usePerquisites(employeeId, financialYear);
  const [adding, setAdding] = React.useState(false);

  return (
    <div>
      <h3 className={sectionTitle}>Perquisites (Form 12BA)</h3>
      {perks.isLoading ? (
        <div className="mt-2 h-12 animate-pulse rounded-lg bg-bg-subtle" />
      ) : (
        <>
          {(perks.rows.length > 0 || adding) && (
            <ul className="mt-2 space-y-2">
              {perks.rows.map((p) => (
                <PerkRow key={p.id} rowKey={p.id} saved={p} types={perks.types} perks={perks} onChanged={onChanged} />
              ))}
              {adding && <PerkRow rowKey="new" saved={null} types={perks.types} perks={perks} onDone={() => setAdding(false)} onChanged={onChanged} />}
            </ul>
          )}
          {perks.error?.row === null && <p className={errorClass}>{perks.error.message}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {!adding ? (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add row</span>
              </button>
            ) : <span />}
            <span className="text-xs text-fg">
              Total taxable <span className="font-semibold tabular-nums">{formatCurrency(perks.totalTaxable)}</span>
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
            Car, housing, loans and other benefits. Value less what the employee paid back is added to their salary.
          </p>
        </>
      )}
    </div>
  );
}
