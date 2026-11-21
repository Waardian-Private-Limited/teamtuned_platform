// Calculated fields: a small spreadsheet-like formula language over a form's answers.
// A port of teamtuned_backend/src/modules/data-collection/domain/Calc.js (the server stores what that file works out;
// this copy gives the builder preview and the live value while filling). The app has a Dart copy too
// (teamtuned_application/lib/features/data_collection/domain/dc_calc.dart). Keep all three in step: the shared cases
// are teamtuned_backend/test/data-collection/calc_cases.json (this repo has no test runner; check this file against
// them with a small script when it changes).
import type { CalcDef, FieldDef, Values } from '../types/dc.types';

const BLANK = Symbol('blank');
export const CALC_MAX_LEN = 500;
const MAX_DEPTH = 40;
const DAY_MS = 86400000;

export class CalcError extends Error {}

type Day = { d: number };
type Time = { tm: number };
type Moment = { ms: number };
type List = { list: Val[] };
type Val = typeof BLANK | number | string | boolean | Day | Time | Moment | List;

type Node =
  | { t: 'num'; v: number } | { t: 'str'; v: string } | { t: 'bool'; v: boolean }
  | { t: 'ref'; key: string; col?: string }
  | { t: 'call'; name: string; args: Node[] }
  | { t: 'bin'; op: string; a: Node; b: Node }
  | { t: 'neg'; a: Node } | { t: 'not'; a: Node };

type Token = { t: 'num'; v: number } | { t: 'str' | 'ref' | 'id' | 'op'; v: string };

const AGG = new Set(['SUM', 'AVG', 'MIN', 'MAX', 'COUNT']);
export const FUNCS: Record<string, [number, number]> = {
  SUM: [1, 50], AVG: [1, 50], MIN: [1, 50], MAX: [1, 50], COUNT: [1, 50],
  ROUND: [1, 2], ABS: [1, 1], IF: [2, 3], AND: [1, 50], OR: [1, 50], ISBLANK: [1, 1],
  DAYS: [2, 2], HOURS: [2, 2], ADD_DAYS: [2, 2], TODAY: [0, 0], CONCAT: [1, 50],
};
export const LISTY = new Set(['multi_choice', 'list', 'photo', 'file']);
export const NOT_USABLE = new Set(['location', 'signature', 'section', 'reference']);
const CMP = ['=', '!=', '>', '<', '>=', '<='];

// ---------- parsing ----------

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1;
      const s = src.slice(i, j);
      if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) throw new CalcError(`"${s}" is not a number`);
      out.push({ t: 'num', v: Number(s) });
      i = j; continue;
    }
    if (c === '"' || c === "'") {
      const j = src.indexOf(c, i + 1);
      if (j < 0) throw new CalcError('Text is missing its closing quote');
      out.push({ t: 'str', v: src.slice(i + 1, j) });
      i = j + 1; continue;
    }
    if (c === '{') {
      const j = src.indexOf('}', i + 1);
      if (j < 0) throw new CalcError('A field is missing its closing }');
      const key = src.slice(i + 1, j).trim();
      if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)?$/.test(key)) throw new CalcError(`{${key}} is not a field`);
      out.push({ t: 'ref', v: key });
      i = j + 1; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j += 1;
      out.push({ t: 'id', v: src.slice(i, j).toUpperCase() });
      i = j; continue;
    }
    const two = src.slice(i, i + 2);
    if (two === '>=' || two === '<=' || two === '!=' || two === '<>') {
      out.push({ t: 'op', v: two === '<>' ? '!=' : two });
      i += 2; continue;
    }
    if ('+-*/()<>=,'.includes(c)) { out.push({ t: 'op', v: c }); i += 1; continue; }
    throw new CalcError(`"${c}" cannot be used in a formula`);
  }
  return out;
}

export function parse(formula: string | undefined | null): Node {
  const text = String(formula ?? '').trim();
  if (!text) throw new CalcError('Write a formula');
  if (text.length > CALC_MAX_LEN) throw new CalcError(`Keep the formula under ${CALC_MAX_LEN} characters`);
  const tk = tokenize(text);
  let i = 0;
  let depth = 0;
  const isOp = (v: string) => i < tk.length && tk[i].t === 'op' && tk[i].v === v;
  const isWord = (v: string) => i < tk.length && tk[i].t === 'id' && tk[i].v === v;
  const deeper = <T,>(fn: () => T): T => {
    depth += 1;
    if (depth > MAX_DEPTH) throw new CalcError('The formula has too many brackets inside each other');
    try { return fn(); } finally { depth -= 1; }
  };

  const or = (): Node => {
    let a = and();
    while (isWord('OR')) { i += 1; a = { t: 'bin', op: 'OR', a, b: and() }; }
    return a;
  };
  const and = (): Node => {
    let a = not();
    while (isWord('AND')) { i += 1; a = { t: 'bin', op: 'AND', a, b: not() }; }
    return a;
  };
  const not = (): Node => {
    if (isWord('NOT')) { i += 1; return { t: 'not', a: deeper(not) }; }
    return cmp();
  };
  const cmp = (): Node => {
    const a = add();
    const tok = tk[i];
    if (tok && tok.t === 'op' && CMP.includes(tok.v)) { i += 1; return { t: 'bin', op: tok.v, a, b: add() }; }
    return a;
  };
  const add = (): Node => {
    let a = mul();
    while (isOp('+') || isOp('-')) { const op = tk[i].v as string; i += 1; a = { t: 'bin', op, a, b: mul() }; }
    return a;
  };
  const mul = (): Node => {
    let a = unary();
    while (isOp('*') || isOp('/')) { const op = tk[i].v as string; i += 1; a = { t: 'bin', op, a, b: unary() }; }
    return a;
  };
  const unary = (): Node => {
    if (isOp('-')) { i += 1; return { t: 'neg', a: deeper(unary) }; }
    if (isOp('+')) { i += 1; return deeper(unary); }
    return primary();
  };
  const primary = (): Node => {
    if (i >= tk.length) throw new CalcError('The formula ends too early');
    const tok = tk[i];
    if (tok.t === 'num') { i += 1; return { t: 'num', v: tok.v }; }
    if (tok.t === 'str') { i += 1; return { t: 'str', v: tok.v }; }
    if (tok.t === 'ref') {
      i += 1;
      const [key, col] = tok.v.split('.');
      return col ? { t: 'ref', key, col } : { t: 'ref', key };
    }
    if (tok.t === 'id') {
      i += 1;
      if (tok.v === 'TRUE' || tok.v === 'FALSE') return { t: 'bool', v: tok.v === 'TRUE' };
      if (!isOp('(')) throw new CalcError(`Unknown word ${tok.v}. Put text in quotes`);
      const spec = FUNCS[tok.v];
      if (!spec) throw new CalcError(`Unknown function ${tok.v}`);
      i += 1;
      const args: Node[] = [];
      if (!isOp(')')) {
        args.push(deeper(or));
        while (isOp(',')) { i += 1; args.push(deeper(or)); }
      }
      if (!isOp(')')) throw new CalcError(`${tok.v}( is missing its closing bracket`);
      i += 1;
      if (args.length < spec[0] || args.length > spec[1]) {
        throw new CalcError(spec[0] === spec[1] ? `${tok.v} needs ${spec[0]} value${spec[0] === 1 ? '' : 's'}` : `${tok.v} needs ${spec[0]} to ${spec[1]} values`);
      }
      return { t: 'call', name: tok.v, args };
    }
    if (isOp('(')) {
      i += 1;
      const e = deeper(or);
      if (!isOp(')')) throw new CalcError('A bracket is not closed');
      i += 1;
      return e;
    }
    throw new CalcError(`Unexpected "${tok.v}"`);
  };

  const ast = or();
  if (i < tk.length) throw new CalcError(`Unexpected "${tk[i].v}"`);
  return ast;
}

export interface CalcRef { key: string; col: string | null; inAgg: boolean }

export function refs(ast: Node, out: CalcRef[] = []): CalcRef[] {
  switch (ast.t) {
    case 'ref': out.push({ key: ast.key, col: ast.col || null, inAgg: false }); break;
    case 'call':
      for (const a of ast.args) {
        if (AGG.has(ast.name) && a.t === 'ref') out.push({ key: a.key, col: a.col || null, inAgg: true });
        else refs(a, out);
      }
      break;
    case 'bin': refs(ast.a, out); refs(ast.b, out); break;
    case 'neg': case 'not': refs(ast.a, out); break;
    default: break;
  }
  return out;
}

/** A plain message when the formula cannot work here, or null. `available(key)` = fields a formula here may use. */
export function check(formula: string, available: (key: string) => FieldDef | undefined): string | null {
  let ast: Node;
  try { ast = parse(formula); } catch (e) { if (e instanceof CalcError) return e.message; throw e; }
  for (const r of refs(ast)) {
    const f = available(r.key);
    if (!f) return `{${r.key}} is not a field above this one`;
    const name = f.label || f.key;
    if (r.col) {
      if (f.type !== 'group') return `${name} is not a subform`;
      const c = (f.fields || []).find((x) => x.key === r.col);
      if (!c || c.type === 'group' || NOT_USABLE.has(c.type)) return `{${r.key}.${r.col}} is not a field in ${name}`;
      if (!r.inAgg) return `Use ${name} fields inside SUM, AVG, MIN, MAX or COUNT`;
    } else {
      if (f.type === 'group') return `Pick a field inside ${name}, for example SUM({${f.key}.field})`;
      if (NOT_USABLE.has(f.type)) return `${name} cannot be used in a calculation`;
      if (LISTY.has(f.type) && !r.inAgg) return `Use ${name} inside COUNT or SUM`;
    }
  }
  return null;
}

// ---------- values ----------

const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
const isBlank = (v: Val): v is typeof BLANK => v === BLANK;
type Kind = 'blank' | 'num' | 'bool' | 'str' | 'date' | 'time' | 'dt' | 'list';

function kind(v: Val): Kind {
  if (v === BLANK) return 'blank';
  if (typeof v === 'number') return 'num';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'string') return 'str';
  if ('d' in v) return 'date';
  if ('tm' in v) return 'time';
  if ('ms' in v) return 'dt';
  return 'list';
}

function toDay(s: unknown): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s ?? ''));
  if (!m) return null;
  return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS);
}

const fromDay = (d: number) => new Date(d * DAY_MS).toISOString().slice(0, 10);
const pad = (n: number) => String(n).padStart(2, '0');

export function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

function display(v: Val): string {
  switch (kind(v)) {
    case 'blank': return '';
    case 'num': return fmtNum(v as number);
    case 'bool': return v ? 'Yes' : 'No';
    case 'str': return v as string;
    case 'date': return fromDay((v as Day).d);
    case 'time': { const tm = (v as Time).tm; return `${pad(Math.floor(tm / 60))}:${pad(tm % 60)}`; }
    case 'dt': return new Date((v as Moment).ms).toISOString();
    default: return (v as List).list.map(display).join(', ');
  }
}

function asNum(v: Val): number {
  switch (kind(v)) {
    case 'num': return v as number;
    case 'bool': return v ? 1 : 0;
    case 'str': {
      const s = (v as string).trim();
      if (s !== '' && Number.isFinite(Number(s))) return Number(s);
      throw new CalcError(`"${v as string}" is not a number`);
    }
    case 'list': throw new CalcError('Use a list inside SUM or COUNT');
    default: throw new CalcError('A date or time cannot be used as a number here');
  }
}

function asBool(v: Val): boolean {
  switch (kind(v)) {
    case 'bool': return v as boolean;
    case 'num': return v !== 0;
    case 'str': return (v as string).trim() !== '';
    case 'list': return (v as List).list.length > 0;
    default: return true;
  }
}

function asDay(v: Val): number {
  const k = kind(v);
  if (k === 'date') return (v as Day).d;
  if (k === 'dt') return Math.floor((v as Moment).ms / DAY_MS);
  if (k === 'str' && toDay(v) !== null) return toDay(v) as number;
  throw new CalcError('Use a date here');
}

function asMs(v: Val): number {
  const k = kind(v);
  if (k === 'dt') return (v as Moment).ms;
  if (k === 'date') return (v as Day).d * DAY_MS;
  throw new CalcError('Use a date and time here');
}

function roundTo(n: number, places: number): number {
  const p = 10 ** Math.max(0, Math.min(6, Math.trunc(places)));
  const r = (Math.sign(n) * Math.round(Math.abs(n) * p)) / p;
  return r || 0;
}

function convert(field: FieldDef, raw: unknown): Val {
  if (isEmpty(raw)) return BLANK;
  const label = (x: unknown) => { const o = (field.options || []).find((y) => y.value === x); return o ? o.label : String(x); };
  switch (field.type) {
    case 'number': case 'currency': case 'rating': {
      const n = Number(raw);
      return typeof raw === 'boolean' || !Number.isFinite(n) ? BLANK : n;
    }
    case 'yes_no': return raw === true || raw === 'true' ? true : raw === false || raw === 'false' ? false : BLANK;
    case 'date': { const d = toDay(raw); return d === null ? BLANK : { d }; }
    case 'time': { const m = /^(\d{1,2}):(\d{2})/.exec(String(raw)); return m ? { tm: Number(m[1]) * 60 + Number(m[2]) } : BLANK; }
    case 'datetime': { const ms = Date.parse(String(raw)); return Number.isNaN(ms) ? BLANK : { ms }; }
    case 'single_choice': case 'dropdown': return label(raw);
    case 'multi_choice': return { list: (Array.isArray(raw) ? raw : [raw]).map(label) };
    case 'list': {
      const items = (Array.isArray(raw) ? raw : [raw]).filter((x) => !isEmpty(x));
      return { list: items.map((x) => (field.config?.item_type === 'number' && Number.isFinite(Number(x)) ? Number(x) : String(x))) };
    }
    case 'photo': case 'file': return { list: (Array.isArray(raw) ? raw : [raw]).map(() => 1) };
    case 'calculated': {
      const r = field.calc?.result;
      if (r === 'date') { const d = toDay(raw); return d === null ? BLANK : { d }; }
      if (r === 'text') return String(raw);
      const n = Number(raw);
      return typeof raw === 'boolean' || !Number.isFinite(n) ? BLANK : n;
    }
    default: return String(raw);
  }
}

// ---------- evaluation ----------

function scalar(v: Val): [string, number | string] {
  switch (kind(v)) {
    case 'num': return ['n', v as number];
    case 'bool': return ['n', v ? 1 : 0];
    case 'date': return ['d', (v as Day).d];
    case 'time': return ['t', (v as Time).tm];
    case 'dt': return ['m', (v as Moment).ms];
    case 'str': {
      const s = (v as string).trim().toLowerCase();
      if (s === 'yes' || s === 'true') return ['n', 1];
      if (s === 'no' || s === 'false') return ['n', 0];
      if (s !== '' && Number.isFinite(Number(s))) return ['n', Number(s)];
      if (toDay(s) !== null && /^\d{4}-\d{2}-\d{2}$/.test(s)) return ['d', toDay(s) as number];
      return ['s', s];
    }
    default: throw new CalcError('Use a list inside SUM or COUNT');
  }
}

function compare(op: string, a: Val, b: Val): boolean {
  const [ka, x] = scalar(a);
  const [kb, y] = scalar(b);
  if (ka !== kb) {
    if (op === '=') return false;
    if (op === '!=') return true;
    throw new CalcError('These two values cannot be compared');
  }
  switch (op) {
    case '=': return x === y;
    case '!=': return x !== y;
    case '>': return x > y;
    case '<': return x < y;
    case '>=': return x >= y;
    default: return x <= y;
  }
}

export interface CalcEnv { field: (key: string) => FieldDef | undefined; value: (key: string) => unknown; today: string }

function binary(n: Extract<Node, { t: 'bin' }>, env: CalcEnv): Val {
  if (n.op === 'AND' || n.op === 'OR') {
    const a = run(n.a, env);
    if (isBlank(a)) return BLANK;
    const av = asBool(a);
    if (n.op === 'AND' && !av) return false;
    if (n.op === 'OR' && av) return true;
    const b = run(n.b, env);
    return isBlank(b) ? BLANK : asBool(b);
  }
  const a = run(n.a, env);
  const b = run(n.b, env);
  if (isBlank(a) || isBlank(b)) return BLANK;
  const ka = kind(a);
  const kb = kind(b);
  switch (n.op) {
    case '+':
      if (ka === 'date' && kb !== 'date') return { d: (a as Day).d + Math.trunc(asNum(b)) };
      if (kb === 'date' && ka !== 'date') return { d: (b as Day).d + Math.trunc(asNum(a)) };
      return asNum(a) + asNum(b);
    case '-':
      if (ka === 'date' && kb === 'date') return (a as Day).d - (b as Day).d;
      if (ka === 'date') return { d: (a as Day).d - Math.trunc(asNum(b)) };
      if (ka === 'time' && kb === 'time') return ((a as Time).tm - (b as Time).tm) / 60;
      if (ka === 'dt' && kb === 'dt') return ((a as Moment).ms - (b as Moment).ms) / 3600000;
      return asNum(a) - asNum(b);
    case '*': return asNum(a) * asNum(b);
    case '/': { const d = asNum(b); return d === 0 ? BLANK : asNum(a) / d; }
    default: return compare(n.op, a, b);
  }
}

function call(n: Extract<Node, { t: 'call' }>, env: CalcEnv): Val {
  const { name } = n;
  if (name === 'IF') {
    const c = run(n.args[0], env);
    if (isBlank(c)) return BLANK;
    if (asBool(c)) return run(n.args[1], env);
    return n.args.length > 2 ? run(n.args[2], env) : BLANK;
  }
  if (name === 'ISBLANK') {
    const v = run(n.args[0], env);
    return isBlank(v) || (kind(v) === 'list' && (v as List).list.length === 0);
  }
  if (AGG.has(name)) {
    const items: Val[] = [];
    for (const a of n.args) {
      const v = run(a, env);
      if (isBlank(v)) {
        if (a.t === 'ref') continue;
        return BLANK;
      }
      if (kind(v) === 'list') items.push(...(v as List).list.filter((x) => !isBlank(x)));
      else items.push(v);
    }
    if (name === 'COUNT') return items.length;
    if (name === 'SUM') return items.reduce<number>((s, x) => s + asNum(x), 0);
    if (!items.length) return BLANK;
    if ((name === 'MIN' || name === 'MAX') && items.every((x) => kind(x) === 'date')) {
      const days = items.map((x) => (x as Day).d);
      return { d: name === 'MIN' ? Math.min(...days) : Math.max(...days) };
    }
    const nums = items.map(asNum);
    if (name === 'MIN') return Math.min(...nums);
    if (name === 'MAX') return Math.max(...nums);
    return nums.reduce((s, x) => s + x, 0) / nums.length;
  }
  const args = n.args.map((a) => run(a, env));
  if (name === 'CONCAT') return args.map((v) => (isBlank(v) ? '' : display(v))).join('');
  if (args.some(isBlank)) return BLANK;
  switch (name) {
    case 'AND': return args.every(asBool);
    case 'OR': return args.some(asBool);
    case 'ROUND': return roundTo(asNum(args[0]), args.length > 1 ? asNum(args[1]) : 0);
    case 'ABS': return Math.abs(asNum(args[0]));
    case 'DAYS': return asDay(args[1]) - asDay(args[0]);
    case 'HOURS': {
      const [a, b] = args;
      if (kind(a) === 'time' && kind(b) === 'time') {
        let m = (b as Time).tm - (a as Time).tm;
        if (m < 0) m += 1440;
        return m / 60;
      }
      return (asMs(b) - asMs(a)) / 3600000;
    }
    case 'ADD_DAYS': return { d: asDay(args[0]) + Math.trunc(asNum(args[1])) };
    case 'TODAY': { const d = toDay(env.today); return d === null ? BLANK : { d }; }
    default: throw new CalcError(`Unknown function ${name}`);
  }
}

function run(n: Node, env: CalcEnv): Val {
  switch (n.t) {
    case 'num': case 'str': case 'bool': return n.v;
    case 'neg': { const a = run(n.a, env); return isBlank(a) ? BLANK : -asNum(a); }
    case 'not': { const a = run(n.a, env); return isBlank(a) ? BLANK : !asBool(a); }
    case 'bin': return binary(n, env);
    case 'call': return call(n, env);
    case 'ref': {
      const f = env.field(n.key);
      if (!f) throw new CalcError(`{${n.key}} is not a field`);
      if (!n.col) return convert(f, env.value(n.key));
      const c = (f.fields || []).find((x) => x.key === n.col);
      if (!c) throw new CalcError(`{${n.key}.${n.col}} is not a field`);
      const rows = env.value(n.key);
      const list: Val[] = [];
      for (const row of Array.isArray(rows) ? rows : []) {
        const v = convert(c, row && typeof row === 'object' ? (row as Values)[n.col] : undefined);
        if (isBlank(v)) continue;
        if (kind(v) === 'list') list.push(...(v as List).list);
        else list.push(v);
      }
      return { list };
    }
    default: throw new CalcError('The formula is not valid');
  }
}

function finish(v: Val, calc: CalcDef | undefined): number | string | null {
  if (isBlank(v)) return null;
  const result = calc?.result || 'number';
  if (result === 'text') return display(v);
  if (result === 'date') {
    const k = kind(v);
    if (k === 'date') return fromDay((v as Day).d);
    if (k === 'dt') return fromDay(Math.floor((v as Moment).ms / DAY_MS));
    throw new CalcError('The result is not a date');
  }
  const num = asNum(v);
  if (!Number.isFinite(num)) return null;
  return roundTo(num, calc?.decimals ?? 2);
}

export function evaluate(calc: CalcDef | undefined, env: CalcEnv): { value: number | string | null; error: string | null } {
  try {
    return { value: finish(run(parse(calc?.formula), env), calc), error: null };
  } catch (e) {
    if (e instanceof CalcError) return { value: null, error: e.message };
    throw e;
  }
}

/**
 * Fills every calculated field into a copy of `values`, in form order, inside subform entries too (an entry's
 * calculated field uses that entry's answers first, then the top-level answers). Returns `values` itself when the
 * form has no calculated field, so callers can compare by reference.
 */
export function computeAll(fields: FieldDef[], values: Values, opts: { today: string; visible?: (f: FieldDef, v: Values) => boolean }): Values {
  const has = (list: FieldDef[]): boolean => list.some((f) => f.type === 'calculated' || (f.fields ? has(f.fields) : false));
  if (!has(fields)) return values;
  const visible = opts.visible || (() => true);
  const top: Values = { ...values };
  const topField = new Map<string, FieldDef>();
  let sectionShown = true;
  for (const f of fields) {
    if (f.type === 'section') sectionShown = visible(f, top);
    if (f.type === 'calculated') {
      delete top[f.key];
      if (sectionShown && visible(f, top)) {
        const { value } = evaluate(f.calc, { field: (k) => topField.get(k), value: (k) => top[k], today: opts.today });
        if (value !== null) top[f.key] = value;
      }
    } else if (f.type === 'group' && Array.isArray(top[f.key]) && (f.fields || []).some((c) => c.type === 'calculated')) {
      top[f.key] = (top[f.key] as unknown[]).map((r) => {
        const row: Values = { ...(r && typeof r === 'object' ? (r as Values) : {}) };
        const rowField = new Map<string, FieldDef>();
        for (const c of f.fields || []) {
          if (c.type === 'calculated') {
            delete row[c.key];
            if (visible(c, row)) {
              const { value } = evaluate(c.calc, {
                field: (k) => rowField.get(k) || topField.get(k),
                value: (k) => (rowField.has(k) ? row[k] : top[k]),
                today: opts.today,
              });
              if (value !== null) row[c.key] = value;
            }
          }
          rowField.set(c.key, c);
        }
        return row;
      });
    }
    topField.set(f.key, f);
  }
  return top;
}

/** A stored calculated answer as people read it: 3 days, 12.5 pcs, Late, 2026-01-08. */
export function formatCalc(f: FieldDef, v: unknown): string {
  if (isEmpty(v)) return '';
  if ((f.calc?.result || 'number') !== 'number') return String(v);
  const n = Number(v);
  const text = Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: f.calc?.decimals ?? 2 }) : String(v);
  return f.calc?.unit ? `${text} ${f.calc.unit}` : text;
}
