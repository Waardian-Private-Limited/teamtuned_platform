import type { InwardLine, InwardNumbering } from '../types/petty-cash.model';

/** A quantity without trailing zeros (2, 2.5). */
export function qtyText(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

/** What the employee did with the number of one item (typed numbering): typed one, asked for a generated one, or nothing. */
export interface GoodsNumber {
  no: string;
  auto: boolean;
}

export type GoodsNumbers = Record<number, GoodsNumber>;

export interface GoodsPick {
  items: Array<{ line: number; qty: number; inward_no?: string; auto?: boolean }>;
  /** Per bill line: what is wrong with the typed quantity. */
  errors: Record<number, string>;
}

/**
 * The typed quantities (text by line) as the request's `items`; a blank or zero quantity is left out.
 * With typed numbering each item also carries its typed `inward_no`, or `auto: true`; blank means no number.
 */
export function pickGoods(lines: InwardLine[], values: Record<number, string>, numbers: GoodsNumbers = {}, numbering: InwardNumbering = 'auto'): GoodsPick {
  const items: GoodsPick['items'] = [];
  const errors: Record<number, string> = {};
  for (const l of lines) {
    const raw = (values[l.line] ?? '').trim();
    if (raw === '') continue;
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 0) errors[l.line] = 'Enter a number';
    else if (v > l.pending) errors[l.line] = `At most ${qtyText(l.pending)}`;
    else if (v > 0) {
      const item: GoodsPick['items'][number] = { line: l.line, qty: v };
      if (numbering === 'typed') {
        const n = numbers[l.line];
        if (n?.auto) item.auto = true;
        else if (n?.no.trim()) item.inward_no = n.no.trim();
      }
      items.push(item);
    }
  }
  return { items, errors };
}

/** The numbers of an item as text: "INW/2026-27/00042 (2), INW/2026-27/00043 (1)". */
export function lineNumbersText(l: Pick<InwardLine, 'numbers'>): string {
  return l.numbers.map((n) => `${n.inwardNo} (${qtyText(n.qty)})`).join(', ');
}
