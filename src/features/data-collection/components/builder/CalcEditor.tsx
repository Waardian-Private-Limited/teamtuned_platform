'use client';

import { useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Btn, Labeled, inputCls } from '../shared/Ui';
import { CALC_MAX_LEN, LISTY, NOT_USABLE, check, evaluate, formatCalc } from '../../utils/calc';
import type { CalcDef, FieldDef } from '../../types/dc.types';

// The formula settings of a calculated field, made for people who have never written a formula:
// 1. a ready-made template asks only which fields to use, 2. a formula box where fields and functions are clicked in,
// 3. a live check in plain words and a "try it" box with sample answers.
// The formula is stored with {field_key} references; the box shows [Field label] instead.

interface Props { calc: CalcDef; inputs: FieldDef[]; onChange: (calc: CalcDef) => void }

/** Something a formula can point at: a field, or one field of a subform (for SUM/AVG/MIN/MAX/COUNT). */
interface Pick { ref: string; label: string; field: FieldDef; column: boolean }

const NUMERIC = new Set(['number', 'currency', 'rating', 'yes_no']);
const isNumeric = (f: FieldDef) => NUMERIC.has(f.type) || (f.type === 'calculated' && (f.calc?.result || 'number') === 'number');
const isDate = (f: FieldDef) => f.type === 'date' || f.type === 'datetime' || (f.type === 'calculated' && f.calc?.result === 'date');
const isTime = (f: FieldDef) => f.type === 'time';

function picksOf(inputs: FieldDef[]): Pick[] {
  const out: Pick[] = [];
  for (const f of inputs) {
    if (NOT_USABLE.has(f.type)) continue;
    if (f.type === 'group') {
      for (const c of f.fields || []) {
        if (c.type === 'group' || NOT_USABLE.has(c.type)) continue;
        out.push({ ref: `${f.key}.${c.key}`, label: `${f.label || f.key} › ${c.label || c.key}`, field: c, column: true });
      }
    } else out.push({ ref: f.key, label: f.label || f.key, field: f, column: false });
  }
  // Two fields with the same label are told apart by their key.
  const count = new Map<string, number>();
  out.forEach((p) => count.set(p.label, (count.get(p.label) || 0) + 1));
  return out.map((p) => ((count.get(p.label) || 0) > 1 ? { ...p, label: `${p.label} (${p.ref})` } : p));
}

const toDisplay = (formula: string, picks: Pick[]) =>
  formula.replace(/\{([a-z0-9_.]+)\}/g, (all, ref: string) => { const p = picks.find((x) => x.ref === ref); return p ? `[${p.label}]` : all; });

/** [Label] back to {key}; a label that matches nothing is reported, not guessed. */
function toFormula(text: string, picks: Pick[]): { formula: string; unknown: string | null } {
  let unknown: string | null = null;
  const formula = text.replace(/\[([^\]]+)\]/g, (all, label: string) => {
    const p = picks.find((x) => x.label.toLowerCase() === label.trim().toLowerCase());
    if (p) return `{${p.ref}}`;
    unknown = unknown || label.trim();
    return all;
  });
  return { formula, unknown };
}

/** Wraps lists and subform fields in the function they need, so a click never produces a broken formula. */
const insertFor = (p: Pick) => (p.column ? `SUM([${p.label}])` : LISTY.has(p.field.type) ? `COUNT([${p.label}])` : `[${p.label}]`);

type Slot = { name: string; accepts: (f: FieldDef, column: boolean) => boolean; many?: boolean };
interface Template { id: string; label: string; hint: string; slots: Slot[]; result?: CalcDef['result']; decimals?: number; unit?: string; build: (r: string[][]) => string }

const one = (accepts: Slot['accepts'], name: string): Slot => ({ name, accepts });
const num = (f: FieldDef, column: boolean) => !column && isNumeric(f);
const date = (f: FieldDef, column: boolean) => !column && isDate(f);
const ref = (k: string) => `{${k}}`;

const TEMPLATES: Template[] = [
  { id: 'late', label: 'Days late (0 when on time)', hint: 'Planned date and actual date: 0, 3, 10…', slots: [one(date, 'Planned date'), one(date, 'Actual date')], decimals: 0, unit: 'days', build: ([[a], [b]]) => `MAX(0, DAYS(${ref(a)}, ${ref(b)}))` },
  { id: 'days', label: 'Days between two dates', hint: 'Can be negative when the second date is earlier', slots: [one(date, 'From'), one(date, 'To')], decimals: 0, unit: 'days', build: ([[a], [b]]) => `DAYS(${ref(a)}, ${ref(b)})` },
  { id: 'status', label: 'Late or On time', hint: 'Shows the word “Late” or “On time”', slots: [one(date, 'Planned date'), one(date, 'Actual date')], result: 'text', build: ([[a], [b]]) => `IF(DAYS(${ref(a)}, ${ref(b)}) > 0, "Late", "On time")` },
  { id: 'hours', label: 'Hours between two times', hint: 'Works across midnight (22:00 to 06:00 = 8)', slots: [one((f, c) => !c && isTime(f), 'Start'), one((f, c) => !c && isTime(f), 'End')], decimals: 2, unit: 'hours', build: ([[a], [b]]) => `HOURS(${ref(a)}, ${ref(b)})` },
  { id: 'sum', label: 'Add up fields', hint: 'Total of two or more numbers; empty ones count as nothing', slots: [{ name: 'Fields to add', accepts: num, many: true }], decimals: 0, build: ([a]) => `SUM(${a.map(ref).join(', ')})` },
  { id: 'minus', label: 'Subtract', hint: 'First number minus second number', slots: [one(num, 'Number'), one(num, 'Minus')], decimals: 2, build: ([[a], [b]]) => `${ref(a)} - ${ref(b)}` },
  { id: 'times', label: 'Multiply', hint: 'For example quantity × rate', slots: [one(num, 'Number'), one(num, 'Times')], decimals: 2, build: ([[a], [b]]) => `${ref(a)} * ${ref(b)}` },
  { id: 'divide', label: 'Divide', hint: 'Empty when dividing by 0', slots: [one(num, 'Number'), one(num, 'Divided by')], decimals: 2, build: ([[a], [b]]) => `${ref(a)} / ${ref(b)}` },
  { id: 'percent', label: 'Percentage (A of B)', hint: 'Done out of planned, as %', slots: [one(num, 'Part'), one(num, 'Whole')], decimals: 1, unit: '%', build: ([[a], [b]]) => `${ref(a)} / ${ref(b)} * 100` },
  { id: 'avg', label: 'Average', hint: 'Average of two or more numbers', slots: [{ name: 'Fields', accepts: num, many: true }], decimals: 2, build: ([a]) => `AVG(${a.map(ref).join(', ')})` },
  { id: 'column', label: 'Total of a subform field', hint: 'Adds a field across every entry of a subform', slots: [one((f, c) => c && isNumeric(f), 'Subform field')], decimals: 0, build: ([[a]]) => `SUM(${ref(a)})` },
  { id: 'count', label: 'Count choices, photos or items', hint: 'How many were picked or attached', slots: [one((f, c) => !c && LISTY.has(f.type), 'Field')], decimals: 0, build: ([[a]]) => `COUNT(${ref(a)})` },
];

const FUNCTIONS: { text: string; label: string; hint: string }[] = [
  { text: 'SUM(', label: 'SUM', hint: 'Total: SUM([A], [B])' },
  { text: 'AVG(', label: 'AVG', hint: 'Average: AVG([A], [B])' },
  { text: 'MIN(', label: 'MIN', hint: 'Smallest: MIN([A], [B])' },
  { text: 'MAX(', label: 'MAX', hint: 'Largest: MAX(0, [A] - [B])' },
  { text: 'COUNT(', label: 'COUNT', hint: 'How many: COUNT([Photos])' },
  { text: 'ROUND(', label: 'ROUND', hint: 'Round: ROUND([A] / [B], 2)' },
  { text: 'IF(', label: 'IF', hint: 'IF(condition, then, else): IF([Delay] > 0, "Late", "On time")' },
  { text: 'DAYS(', label: 'DAYS', hint: 'Days from one date to another: DAYS([Planned], [Finish])' },
  { text: 'HOURS(', label: 'HOURS', hint: 'Hours between times: HOURS([Start], [End])' },
  { text: 'ADD_DAYS(', label: 'ADD_DAYS', hint: 'A date n days later: ADD_DAYS([Start], 7)' },
  { text: 'TODAY()', label: 'TODAY', hint: 'The date of the submission' },
  { text: 'CONCAT(', label: 'CONCAT', hint: 'Join text: CONCAT([Name], " - ", [Code])' },
  { text: 'ABS(', label: 'ABS', hint: 'Without minus sign' },
  { text: 'ISBLANK(', label: 'ISBLANK', hint: 'TRUE when a field is empty' },
];
/** [what is inserted, button label, how far back the cursor goes]. */
const OPERATORS: [string, string, number][] = [
  [' + ', '+', 0], [' - ', '−', 0], [' * ', '×', 0], [' / ', '÷', 0], ['(', '(', 0], [')', ')', 0], [', ', ',', 0],
  [' > ', '>', 0], [' < ', '<', 0], [' = ', '=', 0], [' AND ', 'AND', 0], [' OR ', 'OR', 0], ['""', '"text"', 1],
];

function TemplatePicker({ picks, onUse }: { picks: Pick[]; onUse: (t: Template, refs: string[][]) => void }) {
  const [id, setId] = useState('');
  const [chosen, setChosen] = useState<string[][]>([]);
  const t = TEMPLATES.find((x) => x.id === id);
  const choose = (next: string) => { setId(next); setChosen([]); };
  const ready = t && t.slots.every((s, i) => (chosen[i]?.length || 0) >= (s.many ? 2 : 1));
  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-fg sm:text-[13px]"><Sparkles className="h-3.5 w-3.5" /> Start from a ready-made calculation</span>
      <select aria-label="Ready-made calculation" className={inputCls()} value={id} onChange={(e) => choose(e.target.value)}>
        <option value="">Choose one…</option>
        {TEMPLATES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
      </select>
      {t && (
        <div className="space-y-2">
          <p className="text-[11px] text-fg-muted">{t.hint}</p>
          {t.slots.map((s, i) => {
            const fits = picks.filter((p) => s.accepts(p.field, p.column));
            if (!fits.length) return <p key={s.name} className="text-[11px] text-[var(--tt-danger)]">{s.name}: add a suitable field above this one first.</p>;
            const set = (refs: string[]) => setChosen((c) => { const n = [...c]; n[i] = refs; return n; });
            return (
              <Labeled key={s.name} label={s.name} hint={s.many ? 'Tick two or more' : undefined}>
                {s.many ? (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
                    {fits.map((p) => (
                      <label key={p.ref} className="flex items-center gap-2 text-xs sm:text-sm">
                        <input type="checkbox" checked={(chosen[i] || []).includes(p.ref)} onChange={(e) => set(e.target.checked ? [...(chosen[i] || []), p.ref] : (chosen[i] || []).filter((r) => r !== p.ref))} />
                        {p.label}
                      </label>
                    ))}
                  </div>
                ) : (
                  <select className={inputCls()} value={chosen[i]?.[0] || ''} onChange={(e) => set(e.target.value ? [e.target.value] : [])}>
                    <option value="">Choose a field…</option>
                    {fits.map((p) => <option key={p.ref} value={p.ref}>{p.label}</option>)}
                  </select>
                )}
              </Labeled>
            );
          })}
          <Btn variant="primary" disabled={!ready} onClick={() => { onUse(t, chosen); choose(''); }}>Use this calculation</Btn>
        </div>
      )}
    </div>
  );
}

/** Sample answers for the fields a formula uses, to see the result before publishing. */
function TryIt({ calc, picks }: { calc: CalcDef; picks: Pick[] }) {
  const [sample, setSample] = useState<Record<string, string>>({});
  const used = picks.filter((p) => calc.formula.includes(`{${p.ref}}`));
  if (!used.length) return null;
  const typed = (p: Pick, raw: string): unknown => {
    if (raw === '') return undefined;
    if (p.field.type === 'yes_no') return raw === 'yes';
    if (isNumeric(p.field)) return Number(raw);
    if (LISTY.has(p.field.type)) return Array.from({ length: Math.max(0, Number(raw) || 0) }, (_, i) => p.field.options?.[i]?.value ?? `item ${i + 1}`);
    return raw;
  };
  // Sample values live in one flat map; a subform field's sample stands for a single entry.
  const value = (key: string) => {
    const cols = used.filter((p) => p.column && p.ref.startsWith(`${key}.`));
    if (cols.length) return [Object.fromEntries(cols.map((p) => [p.ref.split('.')[1], typed(p, sample[p.ref] || '')]))];
    const p = used.find((x) => x.ref === key);
    return p ? typed(p, sample[p.ref] || '') : undefined;
  };
  const field = (key: string): FieldDef | undefined => {
    const direct = used.find((p) => p.ref === key)?.field;
    if (direct) return direct;
    const cols = used.filter((p) => p.column && p.ref.startsWith(`${key}.`));
    return cols.length ? { key, type: 'group', label: key, fields: cols.map((p) => p.field) } : undefined;
  };
  const out = evaluate(calc, { field, value, today: new Date().toISOString().slice(0, 10) });
  const kind = (p: Pick) => (isDate(p.field) && p.field.type !== 'datetime' ? 'date' : p.field.type === 'datetime' ? 'datetime-local' : isTime(p.field) ? 'time' : isNumeric(p.field) || LISTY.has(p.field.type) ? 'number' : 'text');
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-line p-3">
      <span className="block text-xs font-semibold text-fg sm:text-[13px]">Try it with sample answers</span>
      {used.map((p) => (
        <Labeled key={p.ref} label={p.label} hint={LISTY.has(p.field.type) ? 'How many' : p.column ? 'One entry' : undefined}>
          {p.field.type === 'yes_no'
            ? <select className={inputCls()} value={sample[p.ref] || ''} onChange={(e) => setSample({ ...sample, [p.ref]: e.target.value })}><option value="">Empty</option><option value="yes">Yes</option><option value="no">No</option></select>
            : <input type={kind(p)} className={inputCls()} value={sample[p.ref] || ''} onChange={(e) => setSample({ ...sample, [p.ref]: e.target.value })} />}
        </Labeled>
      ))}
      <div className="rounded-md bg-bg-subtle px-2.5 py-2 text-xs sm:text-sm">
        Result: <span className="font-semibold">{out.error ? '—' : out.value === null ? 'empty (fill the fields above)' : formatCalc({ key: 'x', type: 'calculated', label: '', calc }, out.value)}</span>
        {out.error && <span className="block text-[11px] text-[var(--tt-danger)]">{out.error}</span>}
      </div>
    </div>
  );
}

export function CalcEditor({ calc, inputs, onChange }: Props) {
  const picks = useMemo(() => picksOf(inputs), [inputs]);
  const box = useRef<HTMLTextAreaElement>(null);
  // What the person typed, kept as typed: re-deriving it from the stored formula would move the cursor.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? toDisplay(calc.formula, picks);
  const { unknown } = toFormula(text, picks);
  const problem = unknown
    ? `There is no field called “${unknown}” above this one`
    : calc.formula.trim() ? check(calc.formula, (k) => inputs.find((f) => f.key === k)) : null;

  const write = (next: string) => {
    setDraft(next);
    onChange({ ...calc, formula: toFormula(next, picks).formula });
  };
  const insert = (snippet: string, caretBack = 0) => {
    const el = box.current;
    const start = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : text.length;
    const next = `${text.slice(0, start)}${snippet}${text.slice(end)}`;
    write(next);
    requestAnimationFrame(() => {
      if (!el) return;
      const at = start + snippet.length - caretBack;
      el.focus();
      el.setSelectionRange(at, at);
    });
  };
  const useTemplate = (t: Template, refs: string[][]) => {
    setDraft(null);
    onChange({ formula: t.build(refs), result: t.result || 'number', ...(t.result === 'text' ? {} : { decimals: t.decimals ?? 2 }), ...(t.unit ? { unit: t.unit } : {}) });
  };
  const result = calc.result || 'number';

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-bg-subtle px-3 py-2 text-[11px] text-fg-muted">Filled in automatically from the answers above it. People see the result but cannot change it.</p>
      <TemplatePicker picks={picks} onUse={useTemplate} />

      <div className="space-y-2 rounded-lg border border-line p-3">
        <Labeled label="Formula" error={problem || undefined} hint={!problem && calc.formula.trim() ? 'The formula works' : undefined}>
          <textarea ref={box} rows={3} maxLength={CALC_MAX_LEN} spellCheck={false} className={cx(inputCls(Boolean(problem)), 'h-auto py-2 font-mono text-xs')}
            placeholder="Click fields and buttons below, e.g. [Finish date] - [Planned date]"
            value={text} onChange={(e) => write(e.target.value)} onBlur={() => { if (!unknown) setDraft(null); }} />
        </Labeled>
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-fg-muted">Fields (click to add)</span>
          {picks.length ? (
            <div className="flex flex-wrap gap-1">
              {picks.map((p) => (
                <button key={p.ref} type="button" onClick={() => insert(insertFor(p))} title={p.column ? 'Adds the total of this subform field' : undefined}
                  className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-fg hover:border-[var(--tt-primary)]">{p.label}</button>
              ))}
            </div>
          ) : <p className="text-[11px] text-fg-muted">Add the fields to calculate from above this one.</p>}
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-fg-muted">Signs</span>
          <div className="flex flex-wrap gap-1">
            {OPERATORS.map(([snippet, label, back]) => (
              <button key={label} type="button" onClick={() => insert(snippet, back)}
                className="min-w-7 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg hover:border-[var(--tt-primary)]">{label}</button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-fg-muted">Functions (hover for an example)</span>
          <div className="flex flex-wrap gap-1">
            {FUNCTIONS.map((fn) => (
              <button key={fn.label} type="button" title={fn.hint} onClick={() => insert(fn.text === 'TODAY()' ? 'TODAY()' : `${fn.text})`, fn.text === 'TODAY()' ? 0 : 1)}
                className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg hover:border-[var(--tt-primary)]">{fn.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Result is">
          <select className={inputCls()} value={result} onChange={(e) => {
            const r = e.target.value as CalcDef['result'];
            onChange(r === 'number' ? { ...calc, result: r, decimals: calc.decimals ?? 2 } : { formula: calc.formula, result: r });
          }}>
            <option value="number">A number</option><option value="text">Text</option><option value="date">A date</option>
          </select>
        </Labeled>
        {result === 'number' && (
          <Labeled label="Decimals">
            <select className={inputCls()} value={calc.decimals ?? 2} onChange={(e) => onChange({ ...calc, decimals: Number(e.target.value) })}>
              {[0, 1, 2, 3, 4].map((d) => <option key={d} value={d}>{d === 0 ? 'None (whole number)' : d}</option>)}
            </select>
          </Labeled>
        )}
        {result === 'number' && (
          <div className="col-span-2"><Labeled label="Unit (optional)" hint="Shown after the number, e.g. days, pcs, %">
            <input className={inputCls()} maxLength={20} value={calc.unit || ''} onChange={(e) => onChange({ ...calc, unit: e.target.value || undefined })} />
          </Labeled></div>
        )}
      </div>

      {!problem && calc.formula.trim() && <TryIt calc={calc} picks={picks} />}
    </div>
  );
}
