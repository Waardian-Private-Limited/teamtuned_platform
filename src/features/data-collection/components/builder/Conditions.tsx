'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Btn, Checkbox, inputCls } from '../shared/Ui';
import { OPS } from '../../constants/dc.constants';
import { showMatch, showRules } from '../../utils/schema';
import type { FieldDef, ShowRule, ShowWhen } from '../../types/dc.types';

// "Show only when…" for a field, subform or whole section: one or more conditions on fields above it,
// matched all or any. One condition is stored in the plain shape older apps understand.

const MAX_RULES = 10;
const NO_VALUE_OPS = ['filled', 'empty'];
const yes = (v: unknown) => v === true || v === 'true';

function valueText(cond: FieldDef | undefined, v: unknown): string {
  if (cond?.type === 'yes_no') return yes(v) ? 'Yes' : 'No';
  return cond?.options?.find((o) => o.value === v)?.label ?? String(v ?? '');
}

/** "Equipment" is "Pump" and "Pressure" is above "10". */
function sentence(rules: ShowRule[], match: 'all' | 'any', above: FieldDef[]): string {
  return rules.map((r) => {
    const cond = above.find((a) => a.key === r.field);
    const op = OPS.find((o) => o.value === r.op)?.label.toLowerCase() || r.op;
    return `“${cond?.label || r.field}” ${op}${NO_VALUE_OPS.includes(r.op) ? '' : ` “${valueText(cond, r.value)}”`}`;
  }).join(match === 'any' ? ' or ' : ' and ');
}

function RuleRow({ rule, above, onChange, onRemove }: { rule: ShowRule; above: FieldDef[]; onChange: (r: ShowRule) => void; onRemove: () => void }) {
  const cond = above.find((a) => a.key === rule.field);
  const numeric = cond && ['number', 'currency', 'rating', 'calculated'].includes(cond.type);
  return (
    <div className="space-y-1.5 rounded-md border border-line bg-bg-subtle/40 p-2">
      <div className="flex items-center gap-1.5">
        <select aria-label="Field" className={inputCls()} value={rule.field} onChange={(e) => onChange({ field: e.target.value, op: rule.op, value: '' })}>
          {above.map((a) => <option key={a.key} value={a.key}>{a.label || a.key}</option>)}
        </select>
        <button type="button" aria-label="Remove condition" onClick={onRemove} className="shrink-0 p-1 text-fg-muted hover:text-[var(--tt-danger)]"><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <select aria-label="Condition" className={inputCls()} value={rule.op} onChange={(e) => onChange({ ...rule, op: e.target.value as ShowRule['op'] })}>
          {OPS.filter((o) => numeric || !['gt', 'lt'].includes(o.value)).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {!NO_VALUE_OPS.includes(rule.op) && (
          cond?.options?.length
            ? <select aria-label="Value" className={inputCls()} value={String(rule.value ?? '')} onChange={(e) => onChange({ ...rule, value: e.target.value })}>
                <option value="">Choose…</option>
                {cond.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            : cond?.type === 'yes_no'
              ? <select aria-label="Value" className={inputCls()} value={yes(rule.value) ? 'true' : 'false'} onChange={(e) => onChange({ ...rule, value: e.target.value === 'true' })}>
                  <option value="true">Yes</option><option value="false">No</option>
                </select>
              : <input aria-label="Value" className={inputCls()} type={numeric ? 'number' : cond?.type === 'date' ? 'date' : 'text'} value={String(rule.value ?? '')}
                  onChange={(e) => onChange({ ...rule, value: e.target.value })} />
        )}
      </div>
    </div>
  );
}

export function Conditions({ value, above, isSection, onChange }: { value?: ShowWhen; above: FieldDef[]; isSection: boolean; onChange: (w: ShowWhen | undefined) => void }) {
  const rules = showRules(value);
  const match = showMatch(value);
  const save = (next: ShowRule[], m: 'all' | 'any' = match) => onChange(!next.length ? undefined : next.length === 1 ? next[0] : { match: m, rules: next });
  const fresh = (): ShowRule => ({ field: above[0].key, op: 'eq', value: '' });
  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <Checkbox checked={rules.length > 0} onChange={(v) => save(v && above.length ? [fresh()] : [])}
        label={isSection ? 'Show this section only when…' : 'Show only when…'}
        hint={!above.length ? 'Add a field above this one first' : isSection ? 'A hidden section hides every field under it, up to the next section' : undefined} />
      {rules.length > 0 && (
        <div className="space-y-2">
          {rules.length > 1 && (
            <select aria-label="Match" className={inputCls()} value={match} onChange={(e) => save(rules, e.target.value as 'all' | 'any')}>
              <option value="all">All of these are true</option>
              <option value="any">Any one of these is true</option>
            </select>
          )}
          {rules.map((r, i) => (
            <RuleRow key={i} rule={r} above={above}
              onChange={(next) => save(rules.map((x, j) => (j === i ? next : x)))}
              onRemove={() => save(rules.filter((_, j) => j !== i))} />
          ))}
          <Btn icon={<Plus className="h-4 w-4" />} disabled={rules.length >= MAX_RULES} onClick={() => save([...rules, fresh()])}>Add another condition</Btn>
          <p className="whitespace-pre-wrap break-words rounded-md bg-bg-subtle px-2.5 py-2 text-[11px] text-fg-muted">Shown only when {sentence(rules, match, above)}</p>
        </div>
      )}
    </div>
  );
}
