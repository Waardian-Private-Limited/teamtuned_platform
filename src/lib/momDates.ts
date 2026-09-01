/**
 * Target-date helpers.
 *
 * Setting a due date used to mean opening a date picker and navigating to the
 * right month — four or five interactions for "next Friday". These presets turn
 * the common cases into one tap, and the picker stays for everything else.
 *
 * All values are local-date strings (YYYY-MM-DD), which is what the <input
 * type="date"> control and the API both expect.
 */

export type Priority = 'low' | 'medium' | 'high' | 'critical';

/** YYYY-MM-DD in the viewer's own timezone, never shifted by UTC conversion. */
export function toDateInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(from: Date, days: number): Date {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    d.setDate(d.getDate() + days);
    return d;
}

/** The coming Friday. If today is Friday, this Friday means today. */
export function nextFriday(from: Date = new Date()): Date {
    const FRIDAY = 5;
    const delta = (FRIDAY - from.getDay() + 7) % 7;
    return addDays(from, delta);
}

export interface DuePreset {
    key: string;
    label: string;
    value: string;
}

/** The one-tap options offered before the date picker. */
export function dueDatePresets(from: Date = new Date()): DuePreset[] {
    const friday = nextFriday(from);
    const presets: DuePreset[] = [
        { key: 'today', label: 'Today', value: toDateInput(from) },
        { key: 'tomorrow', label: 'Tomorrow', value: toDateInput(addDays(from, 1)) },
        { key: 'friday', label: 'This Friday', value: toDateInput(friday) },
        { key: 'next_week', label: 'Next week', value: toDateInput(addDays(from, 7)) },
    ];
    // "This Friday" is noise when it is the same day as Today or Tomorrow.
    const seen = new Set<string>();
    return presets.filter(p => {
        if (seen.has(p.value)) return false;
        seen.add(p.value);
        return true;
    });
}

/**
 * A sensible target for a new point, so one rarely ships without any date at
 * all. Always pre-filled, never forced.
 */
export function defaultDueDateForPriority(priority: Priority, from: Date = new Date()): string | null {
    const offsets: Record<Priority, number | null> = {
        critical: 2,
        high: 7,
        medium: 14,
        low: null,
    };
    const days = offsets[priority];
    return days === null || days === undefined ? null : toDateInput(addDays(from, days));
}

/** How a target date reads on a point card. */
export function describeDueDate(value: string | null, from: Date = new Date()): string {
    if (!value) return 'No target';
    const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return 'No target';
    const due = new Date(y, m - 1, d);
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);

    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days === -1) return '1 day over';
    if (days < 0) return `${Math.abs(days)} days over`;
    if (days <= 7) return `Due in ${days} days`;
    return `Due ${due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}
