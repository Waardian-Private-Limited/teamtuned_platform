export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export type SkillLevel = 'unskilled' | 'semi_skilled' | 'skilled' | 'specialised';

export interface Subcategory { id: number; name: string; skillLevel: SkillLevel; isActive: boolean }
export interface Category { id: number; name: string; code: string | null; isActive: boolean; subcategories: Subcategory[] }

export interface Address { line1: string; line2: string; city: string; state: string; pincode: string }

export type FaceStatus = 'none' | 'pending' | 'enrolled' | 'failed';

/**
 * A labour clock (organization default, or a site's own): punches before the cutoff close the previous day only while it
 * is open; day rate standardStart-standardEnd (earlier time of the day too), overtime until overtimeEnd (null = none),
 * night from then until the next cutoff.
 */
export interface LabourTimings { attendanceCutoff: string; standardStart: string; standardEnd: string; overtimeEnd: string | null }

export interface SiteTimingsRow { siteId: number; siteName: string; override: LabourTimings | null; effective: LabourTimings & { summary: string } }
export interface SiteTimingsResponse { default: LabourTimings & { summary: string }; sites: SiteTimingsRow[] }

export interface LabourSettings extends Partial<LabourTimings> {
  /** Older settings: the standard start (kept for machines). */
  dayStartsAt: string;
  standardHours: number;
  duplicatePunchSeconds: number;
  advancedOnboarding: boolean;
  regularization: {
    enabled: boolean;
    allowMarkOut: boolean;
    allowAddAttendance: boolean;
    allowAdjustTimes: boolean;
    allowRemovePunch: boolean;
    /** Gates `set_hajri` (default true). */
    allowSetHajri?: boolean;
    maxBackDays: number;
  };
  /** Hours worked -> day units; a day gets the units of the last slab whose minHours it reaches. */
  hajri?: { slabs: HajriSlab[] };
}
export interface HajriSlab { minHours: number; units: number }
export type PayBasis = 'hourly' | 'hajri' | 'measurement';
export interface SettingsResponse { settings: LabourSettings; subOrganizationId: number | null; overrides: number[]; timezone?: string }

export interface ContractorRate {
  id?: number;
  siteId: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  /** `hourly` for every row before migration 146. */
  payBasis?: PayBasis;
  dayRate: number;
  nightRate: number;
  overtimeRate: number;
  /** Money for one hajri (one day unit). */
  hajriRate?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  note?: string | null;
  createdBy?: string | number | null;
  createdAt?: string;
}

export interface ContractorDocument {
  id: number;
  docType: string;
  title?: string | null;
  expiryOn?: string | null;
  fileName?: string | null;
  createdAt?: string;
}

export interface Contractor {
  id: number;
  code: string | null;
  legalName: string;
  tradeName: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: Partial<Address> | null;
  gstin: string | null;
  pan: string | null;
  clraLicenceNo: string | null;
  clraValidFrom: string | null;
  clraValidTo: string | null;
  clraMaxWorkers: number | null;
  pfCode: string | null;
  esicCode: string | null;
  bocwRegNo: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | 'merged';
  labourCount: number;
  siteIds?: number[];
  /** The trades it supplies; empty = every trade. */
  trades?: ContractorTrade[];
  rates?: ContractorRate[];
  documents?: ContractorDocument[];
}

/** A trade a contractor supplies; `subcategoryId` null = the whole category. */
export interface ContractorTrade { categoryId: number; subcategoryId: number | null }

export interface MergePreview {
  source: { id: number; legalName?: string; name?: string } | number | string;
  target: { id: number; legalName?: string; name?: string } | number | string;
  rateMode: string;
  labourers: number;
  labourDays: number;
  documents: number;
  ratesCopied: number;
  ratesReplaced: number;
  ratesDropped: number;
}

export interface Labourer {
  id: number;
  code: string;
  contractorId: number | null;
  contractorName: string | null;
  siteId: number | null;
  siteName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  subcategoryId: number | null;
  subcategoryName: string | null;
  firstName: string;
  lastName: string | null;
  guardianName: string | null;
  gender: string | null;
  dob: string | null;
  phone: string | null;
  emergencyPhone: string | null;
  aadhaarLast4: string | null;
  addresses: { present?: Partial<Address> | null; permanent?: Partial<Address> | null } | null;
  workStartDate: string | null;
  status: 'active' | 'inactive' | 'left';
  faceStatus: FaceStatus;
  needsReregistration: boolean;
  packId: number | null;
  /** The person's first record when this one was imported to another site (same code, own contractor, rates and days). */
  linkedFromId?: number | null;
  /** Details the forms of the labourer's site still print blank; null when the site follows no pack. */
  complianceGapCount?: number | null;
  /** Some active site machine has not taken this labourer's latest change yet (list only). */
  machinePending?: boolean;
  /** The registered face as a short-lived link (the list's avatar). */
  photoUrl?: string | null;
}

/** A person found for import, with every site they already work at. `importFrom` = the record to import from (null: inactive or no registered face). */
export interface LookupPerson {
  rootId: number;
  code: string;
  name: string;
  phone: string | null;
  aadhaarLast4: string | null;
  photoUrl: string | null;
  importFrom: number | null;
  sites: Array<{ labourerId: number; siteId: number; siteName: string | null; contractorName: string | null; status: 'active' | 'inactive' | 'left' }>;
}

export interface ImportBody { contractorId: number; siteId: number; categoryId: number | null; subcategoryId: number | null }
/** keepCategory: each person keeps the category of the record imported from (no shared category). */
export interface ImportManyBody extends ImportBody { ids: number[]; keepCategory?: boolean }
/** A labourer of any site who can be imported (active, face registered): the import picker's site list. */
export interface ImportCandidate {
  id: number; code: string; firstName: string; lastName: string | null; siteId: number | null; siteName: string | null;
  contractorName: string | null; categoryName: string | null; subcategoryName: string | null; linkedFromId: number | null; photoUrl: string | null;
}
export interface ImportManyResult {
  imported: number;
  failed: number;
  items: Array<{ id: number; code: string | null; name: string | null; ok: boolean; newId?: number; error?: string }>;
}

/** Whether one site machine has taken a labourer's latest change. */
export interface MachineSyncState { id: number; name: string; siteId: number; siteName: string | null; online: boolean; lastSeenAt: string | null; state: 'synced' | 'pending' | 'failed' }

/** What a site's forms still need from a labourer (detail page, and the reply to an edit that moved them to another site). */
export interface ComplianceGaps { pack: { id: number; name: string; clientLabel: string | null }; missing: Array<{ key: string; label: string; section: string | null }> }

export interface LabourerDocument {
  id: number;
  docType: string;
  side?: string | null;
  number?: string | null;
  expiryOn?: string | null;
  createdAt?: string;
}

export interface LabourerDetail extends Labourer {
  /** The same person's records at other sites (own contractor, rates and days). */
  alsoWorksAt?: Array<{ labourerId: number; siteId: number; siteName: string | null; contractorName: string | null; status: 'active' | 'inactive' | 'left' }>;
  aadhaarMasked?: string | null;
  profile: Record<string, string>;
  complianceGaps?: ComplianceGaps | null;
  machineSync?: { waitingForFace: boolean; machines: MachineSyncState[] };
  /** True when the viewer lacks Manage labour / Compliance: `profile` comes back empty. */
  profileHidden?: boolean;
  documents: LabourerDocument[];
  photoUrl: string | null;
  face?: { provider?: string | null; attempts?: number; lastError?: string | null; enrolledAt?: string | null } | null;
  /** The open personal rate, or null (the contractor rate applies). */
  personalRate?: PersonalRate | null;
}

export interface LabourerBody {
  contractorId: number;
  siteId: number;
  firstName: string;
  /** On edit, null clears an optional field; undefined leaves it unchanged. */
  lastName?: string | null;
  guardianName?: string | null;
  gender?: string | null;
  dob?: string | null;
  phone?: string | null;
  emergencyPhone?: string | null;
  aadhaar?: string;
  addresses?: { present?: Partial<Address>; permanent?: Partial<Address> } | null;
  workStartDate?: string;
  categoryId?: number | null;
  subcategoryId?: number | null;
  /** Ignored by the server: it uses the pack of the chosen site. */
  packId?: number | null;
  profile?: Record<string, string>;
  /** Edit only, with a site / contractor / category change: also re-tag attendance days from this date (YYYY-MM-DD). */
  moveFrom?: string;
  moveReason?: string;
}

export interface DashboardRow { id?: number | null; name?: string | null; registered?: number; present?: number; inside?: number; completed?: number; workedMinutes?: number }
export interface Dashboard {
  date: string;
  registered: number;
  present: number;
  inside: number;
  completed: number;
  workedMinutes: number;
  byContractor: DashboardRow[];
  byCategory: DashboardRow[];
}

export type DayStatus = 'present' | 'incomplete' | 'regularized';
export interface AttendanceDay {
  id: number;
  labourerId: number;
  code: string;
  name: string;
  workDate: string;
  siteId: number | null;
  siteName: string | null;
  contractorId: number | null;
  contractorName: string | null;
  firstIn: string | null;
  lastOut: string | null;
  workedMinutes: number;
  punchCount: number;
  status: DayStatus;
  categoryId?: number | null;
  subcategoryId?: number | null;
  /** The rate in effect that day; null = no rate. */
  payBasis?: PayBasis | null;
  /** Day units (override, else the slab for workedMinutes); shown when payBasis is hajri. */
  hajri?: number | null;
  hajriOverridden?: boolean;
}

export interface Punch {
  id: number;
  type: 'in' | 'out';
  punchedAt: string;
  source: string | null;
  matchScore: number | null;
  livenessScore: number | null;
  clockTrusted: boolean | null;
  hasImage: boolean;
  /** Presigned (5-minute) link to the punch photo; only when hasImage. */
  imageUrl?: string | null;
  deviceId: number | null;
}

export type RegAction = 'mark_out' | 'add_attendance' | 'adjust_times';
/** What the audit log can hold: the time corrections, a removed punch, and a labourer moved with past days. */
export type RegLogAction = RegAction | 'remove_punch' | 'move' | 'set_hajri';
export interface RemovedPunch { id: number; type: 'in' | 'out'; punchedAt: string; source: string | null; deviceId: number | null; matchScore: number | null }
export interface RegularizationLog {
  id: number;
  labourerId: number;
  code: string;
  name: string;
  workDate: string;
  action: RegLogAction;
  /** remove_punch: `before.removedPunch`; move: `{siteId, contractorId, categoryId, subcategoryId}` (after adds `days`); set_hajri: `{workedMinutes, hajriOverride, hajri}`. */
  before: unknown;
  after: unknown;
  reason: string;
  doneBy: string | number | null;
  doneAt: string;
}

export interface DeviceMetrics {
  tempC: number | null;
  cpu: number | null;
  mem: number | null;
  disk: number | null;
  outboxPending: number | null;
  galleryCursor: number | null;
  galleryCount: number | null;
  clockOffsetMs: number | null;
  aiMode: 'local' | 'server' | null;
  at: string | null;
}
export interface Device {
  id: number;
  siteId: number | null;
  siteName: string | null;
  uid: string;
  name: string | null;
  appVersion: string | null;
  hardware: string | null;
  status: string;
  /** When the machine was revoked (null while active). */
  revokedAt?: string | null;
  lastSeenAt: string | null;
  online: boolean;
  metrics: DeviceMetrics | null;
  gallerySeq: number | null;
  galleryFailures: number;
  /** Labour changes this machine has not pulled yet (list only). */
  pendingChanges?: number;
}
export interface GalleryFailure { labourerId: number; code: string; name: string; error: string; attempts: number; updatedAt: string }
export interface DeviceDetail extends Omit<Device, 'galleryFailures'> {
  metrics24: Array<{ hour: string; beats: number; tempMin: number | null; tempMax: number | null; tempAvg: number | null; cpuAvg: number | null }>;
  galleryFailures: GalleryFailure[];
}
export interface DeviceEvent {
  id: number;
  deviceId: number;
  deviceName: string | null;
  type: string;
  severity: string;
  message: string;
  data: unknown;
  hasImage?: boolean;
  /** Presigned (5-minute) link to the event snapshot (e.g. a spoof attempt). */
  imageUrl?: string | null;
  createdAt: string;
}

/** fullRate + part: a monthly charge pro-rated because the period covers only `part.days` of a `part.of`-day month. */
export interface BillingLine { meter: string; label: string; unit: string; quantity: number; rate: number; amount: number; fullRate?: number; part?: { days: number; of: number } }
export interface BillingWindow {
  from: string;
  to: string;
  planVersion: number | null;
  quantities: Record<string, number>;
  lines: BillingLine[];
  subtotal: number;
  gst: number;
  total: number;
}
export interface BillingUsage {
  /** Set when a whole month was asked for; null for a from/to period. */
  month: string | null;
  start: string;
  end: string;
  noPlan: boolean;
  /** Period totals whatever the plan charges for: new_labour, labour_day, licence, active_labour, device. */
  quantities?: Record<string, number>;
  /** Invoices that already cover some of these days (imported legacy ones too). */
  invoices?: Invoice[];
  windows: BillingWindow[];
  subtotal: number;
  gst: number;
  total: number;
  outstanding: { invoiced: number; adjustments: number; total: number };
}

/** Invoice and plan payloads are only partly described by the contract, so every field is optional. */
export interface Invoice {
  id: number;
  number?: string | null;
  invoiceNo?: string | null;
  month?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  status?: string;
  subtotal?: number;
  gst?: number;
  total?: number;
  issuedAt?: string | null;
  paidAt?: string | null;
  paymentRef?: string | null;
  /** Brought over from the old labour system. */
  imported?: boolean;
  lines?: BillingLine[];
  windows?: BillingWindow[];
}
export interface PlanVersion {
  id?: number;
  version?: number;
  effectiveFrom: string;
  components?: Array<{ meter: string; rate: number }>;
  gstPercent?: number;
  minMonthly?: number;
  note?: string | null;
  createdBy?: string | number | null;
  createdAt?: string;
  changes?: Array<{ meter: string; from: number | null; to: number | null }>;
}
export interface Adjustment { id?: number; amount: number; kind: 'opening' | 'credit' | 'debit'; reason: string; createdAt?: string; createdBy?: string | number | null }

export type PackFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'combo' | 'checkbox' | 'phone' | 'employee';
/** An employee that can be picked as "induction given by" (`GET /officers`). */
export interface Officer { id: number; name: string; code: string | null; hasSignature: boolean }
/** `section` groups the field under a heading in the onboarding wizard ("Bank & EPF", "Medical findings" ...). */
export interface CompliancePackField { key: string; label: string; type: PackFieldType; required: boolean; options: string[]; section?: string }
/** What the labour wizard needs from `GET /compliance/pack-for-site`. */
export interface CompliancePack { id: number; name: string; clientLabel?: string | null; fields: CompliancePackField[] }
export interface PackSummary { id: number; name: string; clientLabel?: string | null; isActive?: boolean; updatedAt?: string | null }
/** `GET /compliance/packs` returns every pack in this full shape (counts are the array lengths). */
export interface PackDetail extends PackSummary { fields: CompliancePackField[]; templateIds: number[]; siteIds: number[] }

export interface CompliancePreset { key: string; label: string; description: string; forms: string[]; installed: boolean }
export interface TemplateSummary { id: number; name: string; clientLabel: string | null; isActive: boolean; updatedAt: string | null }
export type FormBlock = { id?: string; type: string } & Record<string, unknown>;
export interface FormTemplate { id?: number; name: string; clientLabel: string | null; isActive?: boolean; page: { margin: number; fontSize: number }; blocks: FormBlock[] }
export interface FormCatalogue { fields: Array<{ key: string; label: string }>; sample: Record<string, string>; blockTypes: string[]; packFieldTypes: string[] }

// ---- labour pay (migration 146) ----------------------------------------------------------------------------------------

export interface PersonalRate {
  id: number;
  labourerId: number;
  payBasis: PayBasis;
  dayRate: number;
  nightRate: number;
  overtimeRate: number;
  hajriRate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  note: string | null;
  createdBy?: string | number | null;
  createdAt?: string;
}
export interface PersonalRatesResponse { rates: PersonalRate[]; current: PersonalRate | null }
export interface PersonalRateBody { effectiveFrom?: string; payBasis: PayBasis; dayRate?: number; nightRate?: number; overtimeRate?: number; hajriRate?: number; note?: string }

/** A resolved rate (GET /pay/suggest). */
export interface PayRate {
  source: 'contractor' | 'personal';
  payBasis: PayBasis;
  dayRate: number;
  nightRate: number;
  overtimeRate: number;
  hajriRate: number;
  rateId: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  scope: { siteId: number | null; categoryId: number | null; subcategoryId: number | null } | null;
}
export interface PaySuggestion {
  date: string;
  contractorId: number | null;
  siteId: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  labourerId: number | null;
  contractorRate: PayRate | null;
  personalRate: PayRate | null;
  effective: PayRate | null;
  hajriSlabs: HajriSlab[];
}

export interface WorkItem {
  id: number;
  name: string;
  unit: string;
  categoryId: number | null;
  categoryName: string | null;
  defaultRate: number;
  isLumpSum: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export interface WorkItemOverride {
  id: number;
  workItemId: number;
  siteId: number | null;
  contractorId: number | null;
  labourerId: number | null;
  rate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  note: string | null;
  createdBy?: string | number | null;
  createdAt?: string;
}
export interface WorkItemDetail extends WorkItem { rates: WorkItemOverride[] }
export interface WorkItemBody { name?: string; unit?: string; categoryId?: number | null; defaultRate?: number; isLumpSum?: boolean; isActive?: boolean }
export type RateSource = 'labourer' | 'contractor_site' | 'contractor' | 'site' | 'any' | 'default';
export interface WorkItemRate {
  workItemId: number;
  unit: string;
  isLumpSum: boolean;
  date: string;
  siteId: number | null;
  contractorId: number | null;
  labourerId: number | null;
  rate: number;
  source: RateSource;
  overrideId: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export type MeasurementStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export interface Measurement {
  id: number;
  siteId: number;
  siteName: string | null;
  contractorId: number;
  contractorName: string | null;
  labourerId: number | null;
  labourerCode: string | null;
  labourerName: string | null;
  workItemId: number;
  workItemName: string | null;
  isLumpSum: boolean;
  workDate: string;
  quantity: number;
  unit: string;
  rate: number;
  rateOverridden: boolean;
  rateReason: string | null;
  amount: number;
  description: string | null;
  adjustsId: number | null;
  adjustReason: string | null;
  status: MeasurementStatus;
  hasAttachment: boolean;
  attachment: { name: string; contentType: string; sizeBytes: number } | null;
  enteredBy: number | string | null;
  enteredByName: string | null;
  submittedAt: string | null;
  approvedBy: number | string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface MeasurementDetail extends Measurement { adjustments: Measurement[]; net: { quantity: number; amount: number } | null }
export type MeasurementTotals = Record<MeasurementStatus, { count: number; amount: number }>;
export interface MeasurementPage extends Paged<Measurement> { totals?: MeasurementTotals }
export interface MeasurementBody {
  workItemId?: number;
  workDate?: string;
  siteId?: number | null;
  contractorId?: number | null;
  labourerId?: number | null;
  quantity?: number;
  rate?: number;
  rateReason?: string;
  amount?: number;
  description?: string | null;
  submit?: boolean;
  /** Correction of an approved entry. */
  adjustsId?: number;
  adjustReason?: string;
}
export interface BulkApproveResult { approved: number[]; skipped: Array<{ id: number; reason: 'approved' | 'rejected' | 'not_found' | string }> }

export interface PayableTotals {
  days: number;
  minutes: number;
  noRateDays: number;
  hourlyAmount: number;
  hajriUnits: number;
  hajriAmount: number;
  measurementAmount: number;
  measurementEntries: number;
  total: number;
}
export interface PayableLine extends PayableTotals {
  labourerId: number | null;
  code: string | null;
  name: string;
  siteId: number | null;
  siteName: string | null;
  payBasis: PayBasis | 'mixed' | null;
}
export interface PayableContractor { contractorId: number; contractorName: string; totals: PayableTotals & { labourers: number }; lines: PayableLine[] }
export interface PayableSite { siteId: number; siteName: string; totals: PayableTotals }
export interface Payable {
  from: string;
  to: string;
  siteId: number | null;
  contractorId: number | null;
  generatedAt: string;
  totals: PayableTotals & { labourers: number; contractors: number };
  contractors: PayableContractor[];
  sites: PayableSite[];
}

/** Why a machine refused a punch (labour_device_events type punch_rejected). */
export type RejectReason = 'other_site' | 'labour_inactive' | 'contractor_inactive' | 'not_recognized';
/** A refused machine punch: who, where, why, with the photo (org admins). siteGuessed: backfilled, site read from the face server. */
export interface RejectedPunch {
  id: number;
  at: string;
  reason: RejectReason | null;
  message: string;
  siteGuessed: boolean;
  source: string;
  site: { id: number | null; name: string | null };
  deviceName: string | null;
  labourer: {
    id: number; code: string; name: string; phone: string | null; status: string;
    registeredSite: string | null; contractorName: string | null; contractorStatus: string | null;
  } | null;
  imageUrl: string | null;
}
export interface RejectedPunchPage extends Paged<RejectedPunch> {
  from: string;
  to: string;
  summary: Record<RejectReason, { tries: number; people: number }>;
}
