/**
 * How a point reads on screen.
 *
 * The database keys five states; people think in four columns plus a handful of
 * things that are true *about* a point — overdue, unassigned, returned,
 * rescheduled. Those are derived here, never stored, so adding one costs
 * nothing and no two screens can disagree about what a point looks like.
 *
 * The vocabulary is deliberately different per audience: an owner sees "Doing",
 * a reviewer sees "Needs your review". One enum underneath, two readings.
 */

export type Lifecycle = 'open' | 'in_progress' | 'submitted' | 'done' | 'cancelled';
export type Tone = 'neutral' | 'active' | 'waiting' | 'good' | 'late';

/** Map any legacy status onto the lifecycle, for rows written before migration. */
export function toLifecycle(status?: string | null, lifecycle?: string | null): Lifecycle {
    if (lifecycle && ['open', 'in_progress', 'submitted', 'done', 'cancelled'].includes(lifecycle)) {
        return lifecycle as Lifecycle;
    }
    switch (String(status || '').toLowerCase()) {
        case 'acknowledged': return 'in_progress';
        case 'completed':
        case 'done': return 'submitted';
        case 'approved':
        case 'closed': return 'done';
        case 'rejected':
        case 'reverted': return 'in_progress';
        default: return 'open';
    }
}

export const TONE_CLASSES: Record<Tone, { stripe: string; chip: string; dot: string }> = {
    neutral: { stripe: 'bg-slate-300', chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
    active: { stripe: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
    waiting: { stripe: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
    good: { stripe: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    late: { stripe: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
};

export interface StatusRead {
    lifecycle: Lifecycle;
    label: string;
    tone: Tone;
}

/**
 * @param viewerIsReviewer changes the words, not the state — a submission is
 *        "Sent for review" to the person who did it and "Needs your review" to
 *        the person holding it up.
 */
export function readStatus(
    point: { status?: string | null; lifecycle_status?: string | null },
    viewerIsReviewer = false
): StatusRead {
    const lifecycle = toLifecycle(point.status, point.lifecycle_status);
    switch (lifecycle) {
        case 'open': return { lifecycle, label: 'To do', tone: 'neutral' };
        case 'in_progress': return { lifecycle, label: 'Doing', tone: 'active' };
        case 'submitted': return {
            lifecycle,
            label: viewerIsReviewer ? 'Needs your review' : 'Sent for review',
            tone: 'waiting',
        };
        case 'done': return { lifecycle, label: 'Done', tone: 'good' };
        case 'cancelled': return { lifecycle, label: 'Cancelled', tone: 'neutral' };
    }
}

export interface Badge {
    key: string;
    label: string;
    tone: Tone;
}

/** Days until a target date, negative when it has passed. */
export function daysUntil(due: string | null | undefined, from = new Date()): number | null {
    if (!due) return null;
    const [y, m, d] = String(due).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86400000);
}

interface PointLike {
    status?: string | null;
    lifecycle_status?: string | null;
    due_date?: string | null;
    original_due_date?: string | null;
    assignments?: { role?: string; state?: string }[];
    due_date_history?: unknown[];
    carried_from_point_id?: number | null;
    priority?: string | null;
}

/**
 * The things worth saying about a point beyond its state.
 *
 * Capped at three: a card that shouts everything says nothing, and the whole
 * complaint about the old design was that every point carried five badges.
 * Ordered by urgency, so the cap always drops the least important.
 */
export function derivedBadges(point: PointLike, from = new Date()): Badge[] {
    const { lifecycle } = readStatus(point);
    const badges: Badge[] = [];
    const terminal = lifecycle === 'done' || lifecycle === 'cancelled';
    const days = daysUntil(point.due_date, from);

    if (!terminal && days !== null) {
        if (days < 0) {
            badges.push({ key: 'overdue', label: `${-days} ${-days === 1 ? 'day' : 'days'} over`, tone: 'late' });
        } else if (days === 0) {
            badges.push({ key: 'today', label: 'Due today', tone: 'waiting' });
        } else if (days <= 2) {
            badges.push({ key: 'soon', label: days === 1 ? 'Due tomorrow' : `Due in ${days} days`, tone: 'waiting' });
        }
    }

    const active = (point.assignments || []).filter(a => (a.state || 'active') === 'active');
    const hasOwner = active.some(a => a.role === 'owner' || !a.role);
    const hasPool = active.some(a => a.role === 'department');
    if (!terminal && !hasOwner) {
        badges.push({ key: 'unassigned', label: hasPool ? 'Unclaimed' : 'Nobody yet', tone: 'late' });
    }

    if ((point.priority || '').toLowerCase() === 'critical' && !terminal) {
        badges.push({ key: 'critical', label: 'Critical', tone: 'late' });
    }

    const revisions = (point.due_date_history || []).length;
    if (revisions > 1) {
        badges.push({ key: 'rescheduled', label: `Rescheduled ×${revisions - 1}`, tone: 'neutral' });
    }

    if (point.carried_from_point_id) {
        badges.push({ key: 'carried', label: 'Carried forward', tone: 'neutral' });
    }

    return badges.slice(0, 3);
}

/** Initials for an avatar chip, from whatever shape the name arrives in. */
export function initials(name?: string | null): string {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
