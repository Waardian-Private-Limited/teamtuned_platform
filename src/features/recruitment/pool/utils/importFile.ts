// Reading a CSV / Excel file of past candidates or leads, and matching its columns to candidate fields.

export interface ImportField {
  key: string;
  label: string;
  /** Header words that mean this field, lower-case, compared without spaces and punctuation. */
  aliases: string[];
}

export const IMPORT_FIELDS: ImportField[] = [
  { key: 'first_name', label: 'First name', aliases: ['firstname', 'first', 'givenname', 'name', 'fullname', 'candidatename', 'candidate'] },
  { key: 'last_name', label: 'Last name', aliases: ['lastname', 'last', 'surname', 'familyname'] },
  { key: 'phone', label: 'Phone', aliases: ['phone', 'mobile', 'mobileno', 'mobilenumber', 'phonenumber', 'contact', 'contactno', 'contactnumber', 'whatsapp', 'cell'] },
  { key: 'email', label: 'Email', aliases: ['email', 'emailid', 'emailaddress', 'mail'] },
  { key: 'current_title', label: 'Current title', aliases: ['currenttitle', 'title', 'designation', 'role', 'jobtitle', 'currentdesignation'] },
  { key: 'current_company', label: 'Current company', aliases: ['currentcompany', 'company', 'employer', 'currentemployer', 'organisation', 'organization'] },
  { key: 'total_experience', label: 'Experience (years)', aliases: ['experience', 'totalexperience', 'exp', 'totalexp', 'years', 'yearsofexperience', 'workexperience', 'expyears'] },
  { key: 'current_ctc', label: 'Current CTC (annual)', aliases: ['currentctc', 'ctc', 'currentsalary', 'salary'] },
  { key: 'expected_ctc', label: 'Expected CTC (annual)', aliases: ['expectedctc', 'expectedsalary', 'ectc'] },
  { key: 'city', label: 'City', aliases: ['city', 'location', 'currentlocation', 'town', 'place'] },
  { key: 'skills', label: 'Skills', aliases: ['skills', 'keyskills', 'skill', 'expertise'] },
  { key: 'notice_period_days', label: 'Notice period (days)', aliases: ['noticeperiod', 'notice', 'noticedays', 'noticeperioddays'] },
  { key: 'linkedin_url', label: 'LinkedIn', aliases: ['linkedin', 'linkedinurl', 'linkedinprofile'] },
  { key: 'lead_source', label: 'Source', aliases: ['source', 'leadsource', 'channel', 'via', 'portal'] },
  { key: 'note', label: 'Note', aliases: ['note', 'notes', 'remark', 'remarks', 'comment', 'comments', 'feedback'] },
];

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Header -> field key, by the closest alias; each field is used once. */
export function autoMap(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();
  const pass = (match: (h: string, a: string) => boolean) => {
    headers.forEach((header) => {
      if (mapping[header]) return;
      const h = squash(header);
      const field = IMPORT_FIELDS.find((f) => !used.has(f.key) && f.aliases.some((a) => match(h, a)));
      if (field) { mapping[header] = field.key; used.add(field.key); }
    });
  };
  pass((h, a) => h === a);
  pass((h, a) => a.length > 3 && h.includes(a));
  return mapping;
}

export interface ParsedFile {
  headers: string[];
  rows: Array<Record<string, string>>;
}

/** The first sheet of an .xlsx / .xls / .csv file as text cells keyed by header. Blank rows are dropped. */
export async function readFile(file: File): Promise<ParsedFile> {
  const XLSX = await import('xlsx');
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  const headers = raw.length ? Object.keys(raw[0]).filter((h) => !/^__EMPTY/.test(h)) : [];
  const rows = raw
    .map((r) => Object.fromEntries(headers.map((h) => [h, String(r[h] ?? '').trim()])))
    .filter((r) => Object.values(r).some(Boolean));
  return { headers, rows };
}

/**
 * Rows in the API's shape. A single "Name" column mapped to first name is split into first and last name
 * when no last-name column is mapped.
 */
export function toApiRows(rows: Array<Record<string, string>>, mapping: Record<string, string>) {
  const lastMapped = Object.values(mapping).includes('last_name');
  return rows.map((r) => {
    const out: Record<string, string> = {};
    for (const [header, key] of Object.entries(mapping)) {
      if (key && r[header]) out[key] = out[key] ? `${out[key]}, ${r[header]}` : r[header];
    }
    // "4 yrs", "30 days" -> the number; "6,50,000" -> 650000. Anything else goes as written and is reported.
    for (const k of ['total_experience', 'notice_period_days']) {
      const n = out[k]?.match(/\d+(\.\d+)?/);
      if (out[k] && n && !/\d\s*[-–to]+\s*\d/.test(out[k])) out[k] = n[0];
    }
    for (const k of ['current_ctc', 'expected_ctc']) if (out[k]) out[k] = out[k].replace(/[,\s₹]/g, '');
    if (!lastMapped && out.first_name && out.first_name.includes(' ')) {
      const [first, ...rest] = out.first_name.split(/\s+/);
      out.first_name = first;
      out.last_name = rest.join(' ');
    }
    return out;
  });
}

/** A ready-to-fill template with the usual columns. */
export async function downloadTemplate() {
  const XLSX = await import('xlsx');
  const header = ['First name', 'Last name', 'Phone', 'Email', 'Current title', 'Current company', 'Experience (years)', 'City', 'Skills', 'Source', 'Note'];
  const sample = ['Asha', 'Kumar', '+91 98765 43210', 'asha@example.com', 'Accountant', 'Acme Pvt Ltd', '4', 'Pune', 'Tally, GST', 'Naukri', 'Interviewed in 2024'];
  const sheet = XLSX.utils.aoa_to_sheet([header, sample]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Candidates');
  XLSX.writeFile(book, 'talent-pool-template.xlsx');
}
