'use client';

import { Plus } from 'lucide-react';
import type { PreviewEmployee } from '../../../types/roster.types';
import { btnSecondary } from '../../catalog-shared/catalogUi';
import { Spinner } from '../../catalog-shared/Spinner';

interface Props {
  total: number | null;
  employees: PreviewEmployee[];
  loading: boolean;
  error: string;
  chosenIds: Set<number>;
  fromSaved: boolean;
  onAddAll: () => void;
}

export function MemberPreview({ total, employees, loading, error, chosenIds, fromSaved, onAddAll }: Props) {
  const addable = employees.filter((e) => !chosenIds.has(e.id));
  return (
    <div className="rounded-xl border border-line bg-bg-subtle/50 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-bold text-fg">
          {total === null ? 'Matching people' : `${total} ${total === 1 ? 'person matches' : 'people match'}`}
          {loading && <Spinner />}
        </h4>
      </div>
      <p className="mt-0.5 text-[11px] text-fg-muted">
        {fromSaved ? 'Based on the saved team, including your chosen and left-out people.' : 'Based on the filters above. Chosen and left-out people are applied after you save.'}
      </p>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      {!error && total === 0 && !loading && (
        <p className="mt-3 text-xs text-fg-muted">No one matches yet. Pick at least one filter or add people by hand below. With no filters at all, the team has only the people you choose.</p>
      )}
      {employees.length > 0 && (
        <ul className="mt-3 max-h-56 divide-y divide-line/60 overflow-y-auto rounded-lg border border-line bg-surface">
          {employees.slice(0, 40).map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
              <span className="truncate text-sm font-medium text-fg">{e.name}</span>
              <span className="shrink-0 text-[11px] text-fg-muted">{[e.role_name, e.department_name].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
          {(total ?? 0) > 40 && <li className="px-3 py-1.5 text-[11px] text-fg-muted">and {(total ?? 0) - 40} more</li>}
        </ul>
      )}
      {!fromSaved && addable.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={onAddAll} className={btnSecondary}>
            <Plus className="h-3.5 w-3.5" /> Choose these people by hand
          </button>
          <p className="mt-1 text-[11px] text-fg-muted">Lets you give each person their own rotation or fixed shift. They stay in the team even if filters change.</p>
        </div>
      )}
    </div>
  );
}
