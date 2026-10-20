import { AlignLeft, AtSign, Barcode, Calendar, CalendarClock, CheckSquare, ChevronDown, CircleDot, Clock, DollarSign, FileText, Hash, Heading, Image as ImageIcon, Layers, ListChecks, MapPin, PenLine, Phone, Star, ToggleLeft, Type, Paperclip, ListOrdered } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FieldType, RunDisplay } from '../types/dc.types';

export const DC_PERMISSIONS = {
  FORMS: 'DC_FORMS_MANAGE', ASSIGN: 'DC_ASSIGN', REPORTS: 'DC_REPORTS', REVIEW: 'DC_REVIEW', EXPORT: 'DC_EXPORT',
} as const;
export const DC_FEATURE = 'DATA_COLLECTION_FEATURE';

export interface FieldTypeInfo { type: FieldType; label: string; icon: LucideIcon; group: 'Input' | 'Choice' | 'Evidence' | 'Layout' }

export const FIELD_TYPES: FieldTypeInfo[] = [
  { type: 'text', label: 'Short text', icon: Type, group: 'Input' },
  { type: 'textarea', label: 'Long text', icon: AlignLeft, group: 'Input' },
  { type: 'number', label: 'Number', icon: Hash, group: 'Input' },
  { type: 'currency', label: 'Amount', icon: DollarSign, group: 'Input' },
  { type: 'email', label: 'Email', icon: AtSign, group: 'Input' },
  { type: 'phone', label: 'Phone', icon: Phone, group: 'Input' },
  { type: 'date', label: 'Date', icon: Calendar, group: 'Input' },
  { type: 'time', label: 'Time', icon: Clock, group: 'Input' },
  { type: 'datetime', label: 'Date and time', icon: CalendarClock, group: 'Input' },
  { type: 'list', label: 'List of items', icon: ListOrdered, group: 'Input' },
  { type: 'single_choice', label: 'Single choice', icon: CircleDot, group: 'Choice' },
  { type: 'multi_choice', label: 'Multiple choice', icon: CheckSquare, group: 'Choice' },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, group: 'Choice' },
  { type: 'yes_no', label: 'Yes / No', icon: ToggleLeft, group: 'Choice' },
  { type: 'rating', label: 'Rating', icon: Star, group: 'Choice' },
  { type: 'photo', label: 'Photo', icon: ImageIcon, group: 'Evidence' },
  { type: 'file', label: 'File', icon: Paperclip, group: 'Evidence' },
  { type: 'signature', label: 'Signature', icon: PenLine, group: 'Evidence' },
  { type: 'location', label: 'Location', icon: MapPin, group: 'Evidence' },
  { type: 'barcode', label: 'Barcode / QR', icon: Barcode, group: 'Evidence' },
  { type: 'section', label: 'Section heading', icon: Heading, group: 'Layout' },
  { type: 'group', label: 'Subform (add entries)', icon: Layers, group: 'Layout' },
  { type: 'reference', label: 'Reference file', icon: FileText, group: 'Layout' },
];

export const TYPE_INFO: Record<FieldType, FieldTypeInfo> = Object.fromEntries(FIELD_TYPES.map((t) => [t.type, t])) as Record<FieldType, FieldTypeInfo>;
export const GROUPS: FieldTypeInfo['group'][] = ['Input', 'Choice', 'Evidence', 'Layout'];
export const HAS_OPTIONS = new Set<FieldType>(['single_choice', 'multi_choice', 'dropdown']);
export const METRIC_TYPES = new Set<FieldType>(['number', 'currency', 'rating', 'yes_no', 'single_choice', 'dropdown']);
export const NO_VALUE = new Set<FieldType>(['section', 'reference']);
export const ListIcon = ListChecks;

export const RUN_LABEL: Record<RunDisplay, string> = {
  upcoming: 'Upcoming', open: 'Open', overdue: 'Overdue', in_progress: 'In progress', returned: 'Sent back', submitted: 'Submitted',
  in_review: 'In review', approved: 'Approved', rejected: 'Rejected', missed: 'Missed', cancelled: 'Cancelled',
};
export const SUBMISSION_LABEL: Record<string, string> = { submitted: 'Submitted', in_review: 'In review', approved: 'Approved', returned: 'Sent back', rejected: 'Rejected' };
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const OPS: { value: string; label: string }[] = [
  { value: 'eq', label: 'is' }, { value: 'neq', label: 'is not' }, { value: 'gt', label: 'is above' }, { value: 'lt', label: 'is below' },
  { value: 'filled', label: 'is filled' }, { value: 'empty', label: 'is empty' },
];
