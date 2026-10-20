import { HAS_OPTIONS, NO_VALUE } from '../constants/dc.constants';
import type { Errors, FieldDef, FieldType, FormSchema, Values } from '../types/dc.types';

let counter = 0;
export const uid = () => `f${Date.now().toString(36)}${(counter += 1).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function allFields(fields: FieldDef[]): FieldDef[] {
  return fields.flatMap((f) => [f, ...(f.fields ? allFields(f.fields) : [])]);
}

/** Next unused key like text_3 across the whole form. */
export function nextKey(fields: FieldDef[], type: FieldType): string {
  const used = new Set(allFields(fields).map((f) => f.key));
  let n = 1;
  while (used.has(`${type}_${n}`)) n += 1;
  return `${type}_${n}`;
}

export function makeField(type: FieldType, all: FieldDef[], label: string): FieldDef {
  const f: FieldDef = { uid: uid(), key: nextKey(all, type), type, label };
  if (HAS_OPTIONS.has(type)) f.options = [{ value: 'Option 1', label: 'Option 1' }, { value: 'Option 2', label: 'Option 2' }];
  if (type === 'rating') f.config = { max: 5 };
  if (type === 'photo') f.config = { max_files: 1, camera_only: true };
  if (type === 'file') f.config = { max_files: 1 };
  if (type === 'location') f.config = { accuracy_m: 50, inside_site: false };
  if (type === 'group') {
    f.fields = [];
    f.config = { multiple: true, min_rows: 1, max_rows: 20, entry_label: 'Entry' };
  }
  if (type === 'list') f.config = { item_type: 'text', item_label: 'Item', min_items: 0, max_items: 20 };
  if (type === 'reference') f.ref = { url: '', kind: 'pdf' };
  return f;
}

export function withUids(fields: FieldDef[]): FieldDef[] {
  return fields.map((f) => ({ ...f, uid: f.uid || uid(), fields: f.fields ? withUids(f.fields) : undefined }));
}

export function stripUids(fields: FieldDef[]): FieldDef[] {
  return fields.map(({ uid: _u, fields: kids, ...rest }) => (kids ? { ...rest, fields: stripUids(kids) } : rest) as FieldDef);
}

export const toSchema = (fields: FieldDef[]): FormSchema => ({ version: 1, fields: stripUids(fields) });

export interface Spot { parent: FieldDef | null; list: FieldDef[]; index: number }

export function locate(fields: FieldDef[], id: string): Spot | null {
  for (let i = 0; i < fields.length; i += 1) {
    if (fields[i].uid === id) return { parent: null, list: fields, index: i };
    const kids = fields[i].fields;
    if (kids) {
      const j = kids.findIndex((k) => k.uid === id);
      if (j >= 0) return { parent: fields[i], list: kids, index: j };
    }
  }
  return null;
}

export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Pure edit helpers: each returns a new top-level array. */
export function insertAt(fields: FieldDef[], field: FieldDef, target: { overId?: string | null; groupId?: string | null; before?: boolean }): FieldDef[] {
  const next = clone(fields);
  if (target.groupId && field.type !== 'group') {
    const g = next.find((f) => f.uid === target.groupId);
    if (g?.fields) { g.fields.push(field); return next; }
  }
  if (target.overId) {
    const spot = locate(next, target.overId);
    if (spot) {
      if (spot.parent && field.type === 'group') {
        const top = next.findIndex((f) => f.uid === spot.parent!.uid);
        next.splice(top + (target.before ? 0 : 1), 0, field);
      } else spot.list.splice(spot.index + (target.before ? 0 : 1), 0, field);
      return next;
    }
  }
  next.push(field);
  return next;
}

export function moveField(fields: FieldDef[], id: string, target: { overId?: string | null; groupId?: string | null }): FieldDef[] {
  const next = clone(fields);
  const from = locate(next, id);
  if (!from) return fields;
  const [item] = from.list.splice(from.index, 1);
  if (target.groupId && item.type !== 'group' && target.groupId !== id) {
    const g = next.find((f) => f.uid === target.groupId);
    if (g?.fields) { g.fields.push(item); return next; }
  }
  if (target.overId && target.overId !== id) {
    const to = locate(next, target.overId);
    if (to) {
      if (to.parent && item.type === 'group') { from.list.splice(from.index, 0, item); return next; }
      // Moving down inside one list lands after the target, moving up lands before it.
      const sameList = to.list === from.list;
      const at = sameList && from.index < to.index ? to.index + 1 : to.index;
      to.list.splice(at, 0, item);
      return next;
    }
  }
  from.list.splice(from.index, 0, item);
  return next;
}

export function shift(fields: FieldDef[], id: string, delta: -1 | 1): FieldDef[] {
  const next = clone(fields);
  const s = locate(next, id);
  if (!s) return fields;
  const to = s.index + delta;
  if (to < 0 || to >= s.list.length) return fields;
  [s.list[s.index], s.list[to]] = [s.list[to], s.list[s.index]];
  return next;
}

export function removeField(fields: FieldDef[], id: string): FieldDef[] {
  const next = clone(fields);
  const s = locate(next, id);
  if (s) s.list.splice(s.index, 1);
  return next;
}

export function patchField(fields: FieldDef[], id: string, patch: Partial<FieldDef>): FieldDef[] {
  const next = clone(fields);
  const s = locate(next, id);
  if (s) s.list[s.index] = { ...s.list[s.index], ...patch };
  return next;
}

/** Fields of the same list above a given one (for show-when). */
export function fieldsAbove(fields: FieldDef[], id: string): FieldDef[] {
  const s = locate(fields, id);
  if (!s) return [];
  return s.list.slice(0, s.index).filter((f) => !NO_VALUE.has(f.type) && f.type !== 'group');
}

export const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

export function isVisible(f: FieldDef, values: Values): boolean {
  const w = f.showWhen;
  if (!w) return true;
  const v = values[w.field];
  switch (w.op) {
    case 'filled': return !isEmpty(v);
    case 'empty': return isEmpty(v);
    case 'neq': return String(v ?? '') !== String(w.value ?? '');
    case 'gt': return Number(v) > Number(w.value);
    case 'lt': return Number(v) < Number(w.value);
    case 'in': return Array.isArray(w.value) ? w.value.map(String).includes(String(v)) : false;
    default: return Array.isArray(v) ? v.map(String).includes(String(w.value)) : String(v ?? '') === String(w.value ?? '');
  }
}

/** Quick checks before sending; the server runs the full validation and its messages are shown the same way. */
export function validate(fields: FieldDef[], values: Values, prefix = ''): Errors {
  const errors: Errors = {};
  for (const f of fields) {
    if (NO_VALUE.has(f.type) || !isVisible(f, values)) continue;
    const path = prefix ? `${prefix}.${f.key}` : f.key;
    const v = values[f.key];
    if (f.type === 'group') {
      const rows = Array.isArray(v) ? (v as Values[]) : [];
      const min = Math.max(f.required ? 1 : 0, f.config?.min_rows || 0);
      const entry = (f.config?.entry_label || 'entry').toLowerCase();
      if (rows.length < min) errors[path] = `Add at least ${min} ${entry}${min === 1 ? '' : 's'}`;
      rows.forEach((row, i) => Object.assign(errors, validate(f.fields || [], row, `${path}[${i}]`)));
      continue;
    }
    if (f.type === 'list') {
      const items = (Array.isArray(v) ? v : []).filter((x) => x !== '' && x !== null && x !== undefined);
      const min = Math.max(f.required ? 1 : 0, f.config?.min_items || 0);
      if (items.length < min) errors[path] = `Add at least ${min} ${(f.config?.item_label || 'item').toLowerCase()}${min === 1 ? '' : 's'}`;
      else if (f.config?.item_type === 'number' && items.some((x) => !Number.isFinite(Number(x)))) errors[path] = 'Every item must be a number';
      continue;
    }
    if (isEmpty(v)) { if (f.required) errors[path] = 'This is required'; continue; }
    if ((f.type === 'number' || f.type === 'currency') && !Number.isFinite(Number(v))) errors[path] = 'Enter a number';
    else if ((f.type === 'number' || f.type === 'currency') && f.validation?.min !== undefined && Number(v) < f.validation.min) errors[path] = `Must be ${f.validation.min} or more`;
    else if ((f.type === 'number' || f.type === 'currency') && f.validation?.max !== undefined && Number(v) > f.validation.max) errors[path] = `Must be ${f.validation.max} or less`;
  }
  return errors;
}

export function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); });
}

export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const addDaysIso = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Maps the server's error paths (fields[2].fields[0].options) to the uids of the fields at fault. */
export function errorUids(fields: FieldDef[], errors: Errors): Set<string> {
  const out = new Set<string>();
  for (const path of Object.keys(errors)) {
    const m = /^fields\[(\d+)\](?:\.fields\[(\d+)\])?/.exec(path);
    if (!m) continue;
    const top = fields[Number(m[1])];
    const hit = m[2] !== undefined ? top?.fields?.[Number(m[2])] : top;
    if (hit?.uid) out.add(hit.uid);
  }
  return out;
}
