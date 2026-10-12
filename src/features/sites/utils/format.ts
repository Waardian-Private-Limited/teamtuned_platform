import { formatDate as plainDate, formatDateTime } from '@/lib/datetime';

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return value.length > 10 ? formatDateTime(value) : plainDate(value, 'medium');
}
