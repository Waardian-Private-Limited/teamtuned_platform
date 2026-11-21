import type { GroupKind, PaletteField, Widget, WidgetAgg, WidgetSeries, WidgetType } from '../../../../types/dc.types';

// A widget is built from a field, so the field's type picks the default chart and series. Numbers measure (avg/sum…),
// choices split into counts, dates trend by day, two dates compare as a scatter.

export const NUMERIC = new Set(['number', 'currency', 'rating']);
export const isNumericField = (f: PaletteField | null | undefined): boolean => !!f && (Boolean(f.numeric) || NUMERIC.has(f.type) || (f.type === 'calculated' && f.numeric !== false));
const isChoice = (f: PaletteField) => ['single_choice', 'multi_choice', 'dropdown', 'yes_no'].includes(f.type);
export const isDateField = (f: PaletteField | null | undefined) => !!f && ['date', 'datetime'].includes(f.type);

let seq = 0;
export const newId = (p = 'w') => `${p}${Date.now().toString(36)}${(seq += 1)}`;

export const ALL_TYPES: { value: WidgetType; label: string }[] = [
  { value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }, { value: 'area', label: 'Area' }, { value: 'pie', label: 'Pie' },
  { value: 'scatter', label: 'Scatter (X vs Y)' }, { value: 'kpi', label: 'Number (KPI)' }, { value: 'table', label: 'Table' }, { value: 'data', label: 'Data (raw rows)' },
];

export const aggsFor = (f: PaletteField | null | undefined): WidgetAgg[] => (isNumericField(f) ? ['avg', 'sum', 'min', 'max', 'count'] : ['count']);

export const countSeries = (): WidgetSeries => ({ id: newId('s'), source: 'count', chart: 'bar', axis: 'left' });
export const fieldSeries = (f: PaletteField): WidgetSeries => ({ id: newId('s'), source: 'field', field: f.key, agg: isNumericField(f) ? 'avg' : 'count', chart: 'bar', axis: 'left' });
export const runSeries = (runStat: WidgetSeries['runStat']): WidgetSeries => ({ id: newId('s'), source: 'run', runStat });

/** A new widget when a field is dropped on the canvas. */
export function widgetFromField(f: PaletteField): Widget {
  const base = { id: newId(), limit: 12, sort: 'value_desc' as const };
  if (isNumericField(f)) return { ...base, type: 'bar', title: `${f.label} by site`, x: { kind: 'site' }, series: [{ ...fieldSeries(f), agg: 'avg' }] };
  if (isChoice(f)) return { ...base, type: 'pie', title: `${f.label} split`, x: { kind: 'field', field: f.key }, series: [countSeries()] };
  if (isDateField(f)) return { ...base, type: 'line', title: `Count by day`, x: { kind: 'day' }, series: [{ ...countSeries(), chart: 'line' }] };
  return { ...base, type: 'table', title: `${f.label} values`, x: { kind: 'field', field: f.key }, series: [countSeries()] };
}

export const countWidget = (): Widget => ({ id: newId(), type: 'kpi', title: 'Submissions', series: [{ id: newId('s'), source: 'count' }], x: { kind: 'none' }, limit: 12, sort: 'value_desc' });
export const runWidget = (runStat: WidgetSeries['runStat'], title: string): Widget => ({ id: newId(), type: 'kpi', title, series: [runSeries(runStat)], x: { kind: 'none' }, limit: 12, sort: 'value_desc' });
export const dataWidget = (): Widget => ({ id: newId(), type: 'data', title: 'Records', columns: [], limit: 50, sort: 'none' });

export const GROUP_LABELS: Record<GroupKind, string> = { none: 'No grouping', field: 'A field value', site: 'Site', department: 'Department', person: 'Person', day: 'Day' };
export const DIMENSIONS: GroupKind[] = ['site', 'department', 'person', 'day'];
export const RUN_STATS: { value: NonNullable<WidgetSeries['runStat']>; label: string }[] = [
  { value: 'compliance', label: 'Compliance %' }, { value: 'filled', label: 'Filled' }, { value: 'missed', label: 'Missed' },
  { value: 'overdue', label: 'Overdue' }, { value: 'pending', label: 'Still to come' }, { value: 'late', label: 'Filled late' }, { value: 'submissions', label: 'Submissions' }, { value: 'people', label: 'People' },
];

/** Flatten a palette (subform children included) to pickable fields. */
export function flatFields(columns: PaletteField[]): PaletteField[] {
  const out: PaletteField[] = [];
  for (const c of columns) {
    if (c.type === 'group') for (const x of c.fields || []) out.push({ ...x, label: `${c.label} › ${x.label}` });
    else out.push(c);
  }
  return out;
}
