export function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export function customFieldKey(label: string): string {
  const base = slugify(label) || 'field';
  return `cf_${base}`;
}

export function customDocKey(label: string): string {
  const base = slugify(label) || 'document';
  return `cd_${base}`;
}

export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  textarea: 'Long text',
  number: 'Number',
  date: 'Date',
  select: 'Single select',
  multiselect: 'Multi select',
  email: 'Email',
  phone: 'Phone',
  checkbox: 'Checkbox',
  file: 'File upload',
};

export const NUMBER_PATTERN_LABELS: Record<string, string> = {
  none: 'No specific format',
  pan: 'PAN (ABCDE1234F)',
  aadhaar: 'Aadhaar (12 digits)',
  ifsc: 'IFSC code',
  uan: 'UAN (12 digits)',
  esic: 'ESIC number',
  passport: 'Passport number',
  pincode: 'Pincode (6 digits)',
  generic: 'Any format',
};
