/** Splits CSV text into rows of cells. Handles quoted cells, doubled quotes inside them, and CRLF line ends. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false; } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

/** CSV with a header row -> one object per data row, keyed by the lower_snake header. Error when a required column is missing. */
export function csvRecords(text: string, required: string[]): { rows: Record<string, string>[]; error: string } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], error: 'The file needs a header row and at least one data row.' };
  const head = table[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  for (const need of required) if (!head.includes(need)) return { rows: [], error: `The header row must have a "${need}" column.` };
  return { rows: table.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()]))), error: '' };
}
