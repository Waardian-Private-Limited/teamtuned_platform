import type { Address, CompliancePack, Labourer, LabourerBody, LabourerDetail } from '../../../types/labour.types';

export interface WizardForm {
  contractorId: number | null;
  siteId: number | null;
  firstName: string;
  lastName: string;
  guardianName: string;
  gender: string | null;
  dob: string;
  phone: string;
  emergencyPhone: string;
  categoryId: number | null;
  subcategoryId: number | null;
  workStartDate: string;
  present: Address;
  permanent: Address;
  sameAddress: boolean;
  aadhaar: string;
  packId: number | null;
  profile: Record<string, string>;
  /** Edit only: apply a site / contractor / category change to attendance from this date. */
  moveFrom: string;
  moveReason: string;
}

export interface PendingDoc {
  key: string;
  docType: string;
  side: 'front' | 'back' | 'single';
  number: string;
  expiryOn: string;
  file: File | null;
}

export type StepId = 'basic' | 'address' | 'identity' | 'face' | 'documents' | 'compliance' | 'review';

export const blankAddress = (): Address => ({ line1: '', line2: '', city: '', state: '', pincode: '' });

export const blankForm = (): WizardForm => ({
  contractorId: null, siteId: null, firstName: '', lastName: '', guardianName: '', gender: null, dob: '', phone: '', emergencyPhone: '',
  categoryId: null, subcategoryId: null, workStartDate: '', present: blankAddress(), permanent: blankAddress(), sameAddress: true,
  aadhaar: '', packId: null, profile: {}, moveFrom: '', moveReason: '',
});

const addr = (a?: Partial<Address> | null): Address => ({ ...blankAddress(), ...Object.fromEntries(Object.entries(a || {}).map(([k, v]) => [k, v ?? ''])) });

export function formFrom(l: Labourer | LabourerDetail): WizardForm {
  const present = addr(l.addresses?.present);
  const permanent = addr(l.addresses?.permanent);
  return {
    contractorId: l.contractorId, siteId: l.siteId, firstName: l.firstName, lastName: l.lastName || '', guardianName: l.guardianName || '',
    gender: l.gender, dob: l.dob || '', phone: l.phone || '', emergencyPhone: l.emergencyPhone || '', categoryId: l.categoryId,
    subcategoryId: l.subcategoryId, workStartDate: l.workStartDate || '', present, permanent,
    sameAddress: JSON.stringify(present) === JSON.stringify(permanent), aadhaar: '', packId: l.packId,
    profile: (l as LabourerDetail).profile || {}, moveFrom: '', moveReason: '',
  };
}

/** The edit changes where (or as what) the labourer works, so past attendance may be moved along. */
export const isMove = (f: WizardForm, original: Labourer | null | undefined): boolean =>
  !!original && (f.siteId !== original.siteId || f.contractorId !== original.contractorId || f.categoryId !== original.categoryId || f.subcategoryId !== original.subcategoryId);

const clean = (a: Address) => Object.fromEntries(Object.entries(a).filter(([, v]) => v.trim() !== '')) as Partial<Address>;
const opt = (v: string) => (v.trim() === '' ? undefined : v.trim());

/**
 * `editing`: a cleared optional field is sent as null so the server clears it (undefined would leave the old value).
 * Aadhaar is never prefilled, so an empty one stays unchanged. `moving`: the edit is a site / contractor / category change.
 */
export function bodyFrom(f: WizardForm, { editing = false, moving = false }: { editing?: boolean; moving?: boolean } = {}): LabourerBody {
  const present = clean(f.present);
  const permanent = f.sameAddress ? present : clean(f.permanent);
  const hasAddress = Object.keys(present).length > 0 || Object.keys(permanent).length > 0;
  const clearable = (v: string) => opt(v) ?? (editing ? null : undefined);
  return {
    contractorId: f.contractorId as number,
    siteId: f.siteId as number,
    firstName: f.firstName.trim(),
    lastName: clearable(f.lastName), guardianName: clearable(f.guardianName), gender: f.gender || (editing ? null : undefined), dob: clearable(f.dob),
    phone: clearable(f.phone), emergencyPhone: clearable(f.emergencyPhone), aadhaar: opt(f.aadhaar.replace(/\s/g, '')),
    addresses: hasAddress ? { present, permanent } : editing ? null : undefined, workStartDate: opt(f.workStartDate), categoryId: f.categoryId, subcategoryId: f.subcategoryId,
    profile: Object.keys(f.profile).length ? f.profile : undefined,
    ...(editing && moving && f.moveFrom ? { moveFrom: f.moveFrom, moveReason: opt(f.moveReason) } : {}),
  };
}

export const stepOfField = (field: string): StepId =>
  field.startsWith('addresses') ? 'address' : field === 'aadhaar' ? 'identity' : field.startsWith('profile') ? 'compliance' : 'basic';

/** Client-side checks per field; the server stays the authority. */
export function validate(f: WizardForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.firstName.trim()) e.firstName = 'Enter the first name';
  if (!f.contractorId) e.contractorId = 'Choose the contractor';
  if (!f.siteId) e.siteId = 'Choose the site';
  if (f.phone && !/^\d{10}$/.test(f.phone)) e.phone = 'Enter a 10 digit mobile number';
  if (f.emergencyPhone && !/^\d{10}$/.test(f.emergencyPhone)) e.emergencyPhone = 'Enter a 10 digit mobile number';
  if (f.aadhaar && !/^\d{12}$/.test(f.aadhaar.replace(/\s/g, ''))) e.aadhaar = 'Aadhaar must be exactly 12 digits';
  const pin = (a: Address, k: string) => { if (a.pincode && !/^\d{6}$/.test(a.pincode)) e[k] = 'Pincode is 6 digits'; };
  pin(f.present, 'addresses.present.pincode');
  if (!f.sameAddress) pin(f.permanent, 'addresses.permanent.pincode');
  return e;
}

/** Required pack fields must be filled; the server checks types and options. */
export function validatePack(pack: CompliancePack | null, profile: Record<string, string>): Record<string, string> {
  const e: Record<string, string> = {};
  pack?.fields.forEach((f) => { if (f.required && !(profile[f.key] || '').trim()) e[`profile.${f.key}`] = `${f.label} is required`; });
  return e;
}
