import type { FormBlock } from '../../../types/labour.types';

export const BLOCK_LABEL: Record<string, string> = {
  header: 'Header', photo: 'Photo', heading: 'Heading', fields: 'Fields', checkboxes: 'Checkboxes', text: 'Text',
  table: 'Table', signatures: 'Signatures', spacer: 'Spacer', page_break: 'Page break',
};

let counter = 0;
export const newId = () => `n${Date.now().toString(36)}${counter++}`;

export function blankBlock(type: string): FormBlock {
  const id = newId();
  switch (type) {
    case 'header': return { id, type, title: 'Form title', subtitle: '', meta: [], logo: 'company' };
    case 'photo': return { id, type, align: 'right', width: 78, height: 95 };
    case 'heading': return { id, type, text: 'Heading', align: 'center' };
    case 'fields': return { id, type, columns: 1, rows: [{ label: 'Name', value: '{{labour.name}}', boxes: 0, wide: false }] };
    case 'checkboxes': return { id, type, label: 'Choose one', options: ['Yes', 'No'], value: '', columns: 2 };
    case 'text': return { id, type, text: 'Write the text here.', bold: false, size: null, align: 'left' };
    case 'table': return { id, type, columns: [{ label: 'Column 1', width: 50 }, { label: 'Column 2', width: 50 }], rows: [], blankRows: 3 };
    case 'signatures': return { id, type, boxed: false, boxes: [{ label: 'Signature' }] };
    case 'spacer': return { id, type, size: 'md' };
    default: return { id, type };
  }
}

export function summary(b: FormBlock): string {
  const s = (v: unknown) => (typeof v === 'string' ? v : '');
  switch (b.type) {
    case 'header': return s(b.title);
    case 'heading': return s(b.text);
    case 'text': return s(b.text).slice(0, 60);
    case 'checkboxes': return s(b.label);
    case 'fields': return `${(b.rows as unknown[] | undefined)?.length || 0} rows`;
    case 'table': return `${(b.columns as unknown[] | undefined)?.length || 0} columns`;
    case 'signatures': return (b.boxes as Array<{ label: string }> | undefined)?.map((x) => x.label).join(', ') || '';
    default: return '';
  }
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
