import {
  Briefcase,
  Car,
  Fuel,
  GraduationCap,
  Hotel,
  Package,
  ParkingCircle,
  Phone,
  Plane,
  Stethoscope,
  Utensils,
  Wifi,
  Receipt,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PaymentMode } from '../types/bill.model';

/** How the employee paid a bill (`lines[i].payment_mode`). */
export const PAYMENT_MODES: ReadonlyArray<{ value: PaymentMode; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'net_banking', label: 'Net banking' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];
export const PAYMENT_MODE_LABEL = Object.fromEntries(PAYMENT_MODES.map((m) => [m.value, m.label])) as Record<PaymentMode, string>;


/** `emails` on an export job. */
export const EXPORT_MAX_EMAILS = 5;

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  travel: Plane,
  fuel: Fuel,
  food: Utensils,
  stay: Hotel,
  phone: Phone,
  internet: Wifi,
  medical: Stethoscope,
  office: Package,
  client: Briefcase,
  training: GraduationCap,
  parking: ParkingCircle,
  other: Receipt,
  car: Car,
};

export const CATEGORY_ICON_LABEL: Record<string, string> = {
  travel: 'Travel',
  fuel: 'Fuel',
  food: 'Food',
  stay: 'Stay',
  phone: 'Phone',
  internet: 'Internet',
  medical: 'Medical',
  office: 'Office',
  client: 'Client',
  training: 'Training',
  parking: 'Parking',
  other: 'Other',
};

export function categoryIcon(icon: string | null | undefined): LucideIcon {
  return (icon && CATEGORY_ICONS[icon]) || Receipt;
}


export const SEARCH_DEBOUNCE_MS = 400;
export const PREVIEW_DEBOUNCE_MS = 450;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_LINE_FILES = 5;
/** Photos of one bill's pages read in one scan (a PDF is scanned on its own). */
export const MAX_SCAN_PAGES = 5;
export const MAX_PAYMENT_PROOFS = 5;
export const MAX_PAYMENT_REFERENCE = 100;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
// WebP photos are accepted too: the server turns them into JPEG.
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';
export const ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
