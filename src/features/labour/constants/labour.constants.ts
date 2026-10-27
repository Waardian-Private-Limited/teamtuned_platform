export const LABOUR_FEATURE = 'LABOUR_FEATURE';

export const LP = {
  VIEW: 'LABOUR_VIEW',
  MANAGE: 'LABOUR_MANAGE',
  CONTRACTORS: 'LABOUR_CONTRACTORS_MANAGE',
  REGULARIZE: 'LABOUR_REGULARIZE',
  DEVICES: 'LABOUR_DEVICES_MANAGE',
  BILLING: 'LABOUR_BILLING_VIEW',
  SETTINGS: 'LABOUR_SETTINGS',
  COMPLIANCE: 'LABOUR_COMPLIANCE_MANAGE',
  MEAS_MANAGE: 'LABOUR_MEASUREMENTS_MANAGE',
  MEAS_APPROVE: 'LABOUR_MEASUREMENTS_APPROVE',
} as const;

/**
 * Permission groups, the same lists the backend routes use (labour/presentation/routes/labourRoutes.js).
 * ANY: settings (org time zone), catalogue, form and pack names: anyone who can see something in the Labour area.
 */
export const ANY_LABOUR_PERM: string[] = Object.values(LP);
/** VIEW: attendance, punches, labourers, contractors, devices, dashboard and the regularization lists. */
export const LABOUR_VIEW_PERMS: string[] = [LP.VIEW, LP.MANAGE, LP.CONTRACTORS, LP.REGULARIZE, LP.DEVICES];
/** The settings page: everyone who reads labour data, plus those who only change the settings. */
export const LABOUR_SETTINGS_PAGE_PERMS: string[] = [...LABOUR_VIEW_PERMS, LP.SETTINGS];
/** Printing labourer forms (Download Centre export `labour-forms`). */
export const LABOUR_FORMS_PERMS: string[] = [LP.MANAGE, LP.COMPLIANCE];
/** PAY-LOOKUP: the rate suggestion and the work item catalogue (read). */
export const LABOUR_PAY_LOOKUP_PERMS: string[] = [LP.MANAGE, LP.CONTRACTORS, LP.MEAS_MANAGE, LP.MEAS_APPROVE];
/** MEAS: the measurement book (read). Writes need MEAS_MANAGE, approvals and the payable report MEAS_APPROVE. */
export const LABOUR_MEAS_PERMS: string[] = [LP.MEAS_MANAGE, LP.MEAS_APPROVE];
/** The Measurement book page: entries (MEAS) and the work item catalogue (PAY-LOOKUP, which includes both MEAS codes). */
export const LABOUR_MEAS_PAGE_PERMS: string[] = LABOUR_PAY_LOOKUP_PERMS;
/** The Payable page and its export. */
export const LABOUR_PAYABLE_PERMS: string[] = [LP.MEAS_APPROVE];

export const DEFAULT_PAGE_SIZE = 25;
export const SEARCH_DEBOUNCE_MS = 350;

export const SKILL_LEVELS = [
  { value: 'unskilled', label: 'Unskilled' },
  { value: 'semi_skilled', label: 'Semi-skilled' },
  { value: 'skilled', label: 'Skilled' },
  { value: 'specialised', label: 'Specialised' },
] as const;

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const FACE_POSES = ['center', 'left', 'right'] as const;
export type FacePose = (typeof FACE_POSES)[number];

export const FACE_POSE_COPY: Record<FacePose, { title: string; guide: string }> = {
  center: { title: 'Straight', guide: 'Look straight at the camera with a neutral face.' },
  left: { title: 'Left', guide: 'Slowly turn your head a little to your left and hold still.' },
  right: { title: 'Right', guide: 'Slowly turn your head a little to your right and hold still.' },
};

export const LABOURER_DOC_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar card' },
  { value: 'pan', label: 'PAN card' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'driving_licence', label: 'Driving licence' },
  { value: 'bank_passbook', label: 'Bank passbook' },
  { value: 'medical', label: 'Medical certificate' },
  { value: 'police_verification', label: 'Police verification' },
  { value: 'other', label: 'Other' },
];

export const CONTRACTOR_DOC_TYPES = [
  { value: 'letterhead', label: 'Letterhead' },
  { value: 'licence', label: 'CLRA licence' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'gst', label: 'GST certificate' },
  { value: 'pan', label: 'PAN card' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

export const MERGE_RATE_MODES = [
  { value: 'keep_target', title: 'Keep the target’s rates', description: 'Rates already set on the target stay as they are. Rates of the contractor being merged are dropped.' },
  { value: 'move_all', title: 'Move all rates across', description: 'The target takes over every rate of the contractor being merged and replaces matching ones.' },
  { value: 'add_missing', title: 'Add only the missing ones', description: 'Rates the target does not have yet are copied over. Existing ones are left alone.' },
] as const;

export const REG_ACTIONS = [
  { value: 'mark_out', label: 'Mark out', flag: 'allowMarkOut', description: 'Add the missing OUT time for a day left open.' },
  { value: 'add_attendance', label: 'Add attendance', flag: 'allowAddAttendance', description: 'Record a day that has no punches.' },
  { value: 'adjust_times', label: 'Adjust times', flag: 'allowAdjustTimes', description: 'Correct the IN and OUT times of a day.' },
] as const;

/** Every action the regularization audit log shows (filter + labels). */
export const REG_LOG_ACTIONS = [
  ...REG_ACTIONS.map((a) => ({ value: a.value as string, label: a.label })),
  { value: 'remove_punch', label: 'Removed punch' },
  { value: 'move', label: 'Moved' },
  { value: 'set_hajri', label: 'Set hajri' },
];

export type PayBasisValue = 'hourly' | 'hajri' | 'measurement';
export const PAY_BASES: Array<{ value: PayBasisValue; label: string; description: string }> = [
  { value: 'hourly', label: 'Hourly', description: 'Paid per hour worked: day, night and overtime rates.' },
  { value: 'hajri', label: 'Hajri', description: 'Paid per day unit (½, 1, 1½ …) from the hours worked.' },
  { value: 'measurement', label: 'Measurement', description: 'Paid for work done, from the measurement book.' },
];
export const PAY_BASIS_LABEL: Record<string, string> = { hourly: 'Hourly', hajri: 'Hajri', measurement: 'By measurement', mixed: 'Mixed pay' };

/** What a supervisor may set a day to (set_hajri); null goes back to the slab table. */
export const HAJRI_CHOICES = [0, 0.5, 1, 1.5, 2] as const;
export const DEFAULT_HAJRI_SLABS = [{ minHours: 0, units: 0 }, { minHours: 4, units: 0.5 }, { minHours: 8, units: 1 }, { minHours: 12, units: 1.5 }, { minHours: 16, units: 2 }];
export const MAX_HAJRI_SLABS = 10;

/** Offered for work item units (free text, up to 20 characters); the API returns the same list as `units`. */
export const WORK_UNITS = ['sq m', 'sq ft', 'cft', 'cum', 'rmt', 'kg', 'ton', 'nos', 'job'];

export type MeasStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export const MEAS_STATUSES: Array<{ value: MeasStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

/** Where an entry's rate came from (GET /work-items/:id/rate `source`). */
export const RATE_SOURCE_LABEL: Record<string, string> = {
  default: 'Default rate of the item',
  any: 'Override for everyone',
  site: 'Override for this site',
  contractor: 'Override for this contractor',
  contractor_site: 'Override for this contractor at this site',
  labourer: 'Override for this labourer',
};

export const BULK_APPROVE_MAX = 200;

export const DEVICE_EVENT_TYPES = ['boot', 'online', 'offline', 'sync_failed', 'enroll_failed', 'spoof', 'camera', 'punch_rejected', 'error', 'info'];
/** Stored values; machines may send `warning`, the server keeps it as `warn`. */
export const DEVICE_SEVERITIES = ['info', 'warn', 'error'];

export const METER_LABEL: Record<string, string> = {
  new_labour: 'New labour',
  labour_day: 'Punch charges',
  active_labour: 'Active labour',
  licence: 'Licences',
  device: 'Machines',
};

/** Empty-state illustrations (public/vectors, shared with the other features). */
const ill = (file: string, alt: string) => ({ src: `/vectors/${file}.svg`, width: 640, height: 420, alt });
export const LABOUR_ILLUSTRATIONS = {
  labourers: ill('employees', 'People on a work roll'),
  contractors: ill('teams', 'A team of contractors'),
  categories: ill('departments', 'Trades grouped into categories'),
  days: ill('daysummary', 'A day of attendance'),
  regularization: ill('review', 'Attendance waiting for review'),
  devices: ill('sites', 'A machine at a site'),
  events: ill('notifications', 'No events logged'),
  invoices: ill('credit', 'Invoices and payments'),
  forms: ill('policy', 'Compliance forms'),
  packs: ill('approvals', 'Packs of forms and details'),
  presets: ill('policy', 'Client form presets'),
  rates: ill('credit', 'Rates for a contractor'),
  measurements: ill('review', 'A measurement book'),
  workItems: ill('policy', 'A catalogue of work items'),
  payable: ill('credit', 'Money owed to contractors'),
} as const;
