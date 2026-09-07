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

/**
 * The legacy `status` word each lifecycle state writes, mirroring
 * LEGACY_FOR_STATE in the backend's momLifecycle.js. The two must agree: this
 * is what keeps an optimistic local update indistinguishable from what the
 * server would have written.
 */
export const LEGACY_FOR_LIFECYCLE: Record<Lifecycle, string> = {
    open: 'open',
    in_progress: 'acknowledged',
    submitted: 'completed',
    done: 'closed',
    cancelled: 'closed',
};

/**
 * Move a point to a lifecycle state, setting *both* status fields together.
 *
 * Never assign `status` on its own. `toLifecycle` gives `lifecycle_status`
 * precedence, so a point patched with `{ status: 'acknowledged' }` alone keeps
 * whatever `lifecycle_status` it already had — which is how an acknowledged
 * point went on offering its Acknowledge button.
 */
export function applyLifecycle<T extends { status?: string | null; lifecycle_status?: string | null }>(
    point: T,
    lifecycle: Lifecycle,
): T {
    return {
        ...point,
        lifecycle_status: lifecycle,
        status: LEGACY_FOR_LIFECYCLE[lifecycle],
        closed_at: lifecycle === 'done' ? new Date().toISOString() : null,
    };
}

/**
 * Merge the authoritative point a lifecycle endpoint returned.
 *
 * Prefers the server's `point` envelope; falls back to the flat `status` key
 * (which carries the *lifecycle* value on those endpoints) so this still does
 * the right thing against a backend that has not been redeployed yet.
 */
export function mergePointState<T extends { status?: string | null; lifecycle_status?: string | null }>(
    point: T,
    response: unknown,
): T {
    const res = (response || {}) as Record<string, unknown>;
    const envelope = res.point as Record<string, unknown> | undefined;

    if (envelope && typeof envelope.lifecycle_status === 'string') {
        return { ...point, ...envelope } as T;
    }

    const flat = typeof res.status === 'string' ? res.status : null;
    if (flat) {
        // `status` on a transition response is the lifecycle value, not a legacy word.
        return applyLifecycle(point, toLifecycle(null, flat));
    }
    return point;
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

/** Who is looking, in the terms the guards below actually care about. */
export interface Viewer {
    employeeId?: string | number | null;
    /** Org admin or HR mode: may review anything in the organisation. */
    isAdmin?: boolean;
    /**
     * The viewer's department, for points pooled to a whole team.
     *
     * Optional, and only a *fallback*. The server sends `is_pool_member` and
     * `is_claimable` on every point precisely so neither client has to own a
     * copy of the site and Head Office rules; this is here for the payloads
     * that predate those flags, where matching on department alone is closer
     * to right than showing nothing.
     */
    departmentId?: string | number | null;
}

/**
 * What this person can do to this point, right now.
 *
 * One implementation, mirroring `abilityFor` in `mom_status.dart` and the
 * guards in the backend's momAccess.js. Three screens each carried their own
 * copy of this before, drifting apart on exactly the checks that decide whether
 * a button is showing, and each one ORed a raw legacy-status test against the
 * lifecycle test — so a half-updated point satisfied two branches at once and
 * rendered Acknowledge and Mark Done side by side.
 */
export interface Ability {
    isAssignee: boolean;
    isOwner: boolean;
    isReviewer: boolean;
    /** In the department this point is pooled to, and allowed to see it. */
    isPoolMember: boolean;
    canStart: boolean;
    /**
     * Unclaimed pool work this person may take. Renders the same Acknowledge
     * button as `canStart`, but it means something different and the copy
     * around it should say so: whoever presses it first becomes the owner and
     * it disappears for everybody else.
     */
    canClaim: boolean;
    canSubmit: boolean;
    canVerify: boolean;
    canReturn: boolean;
    canHandOff: boolean;
    canReassign: boolean;
    canSetDueDate: boolean;
}

interface AbilityPoint extends PointLike {
    assignments?: { role?: string; state?: string; assignee_type?: string; assignee_id?: string | number }[];
    assigned_to_id?: string | number | null;
    reviewer_id?: string | number | null;
    created_by?: string | number | null;
    meeting_created_by?: string | number | null;
    is_raised?: number | boolean;
    /** Server-computed pool flags: authoritative when present. */
    is_pool_member?: number | boolean;
    is_claimable?: number | boolean;
}

export function abilityFor(point: AbilityPoint, viewer: Viewer): Ability {
    const me = viewer.employeeId != null && String(viewer.employeeId).trim() !== ''
        ? String(viewer.employeeId).trim()
        : null;
    const same = (v: unknown) => me != null && v != null && String(v).trim() === me;

    // A verifier is not an assignee: the reviewer must never be able to submit
    // work to themselves. Declined rows are nobody's responsibility.
    const working = (point.assignments || []).filter(
        a => (a.state || 'active') === 'active' && a.role !== 'verifier'
    );

    const isAssignee = working.some(a => a.assignee_type === 'employee' && same(a.assignee_id))
        || same(point.assigned_to_id);
    const isOwner = working.some(
        a => a.assignee_type === 'employee' && same(a.assignee_id) && (a.role === 'owner' || !a.role)
    );
    const isReviewer = Boolean(viewer.isAdmin)
        || point.is_raised === 1 || point.is_raised === true
        || same(point.reviewer_id) || same(point.created_by) || same(point.meeting_created_by);

    // A point assigned to a department is a pool, not an owner: everyone in
    // that team sees it and the first to acknowledge takes it. This is
    // deliberately *not* folded into `isAssignee` - a pool member who has not
    // claimed yet must not be offered Submit or a target-date edit on work
    // that is still nobody's.
    //
    // Prefer the server's flags. They are the only thing that knows the org's
    // Head Office policy and which sites the meeting is held at, and under the
    // `view` policy the two answers genuinely differ: an HQ member of the
    // department is shown the point with no Acknowledge button on it.
    const hasOwner = working.some(a => a.assignee_type === 'employee' && (a.role === 'owner' || !a.role));
    const inPoolDept = viewer.departmentId != null && String(viewer.departmentId).trim() !== ''
        && working.some(a => a.assignee_type === 'department'
            && String(a.assignee_id ?? '').trim() === String(viewer.departmentId).trim());

    const isPoolMember = point.is_pool_member !== undefined
        ? (point.is_pool_member === 1 || point.is_pool_member === true)
        : inPoolDept;

    const { lifecycle } = readStatus(point);
    const terminal = lifecycle === 'done' || lifecycle === 'cancelled';

    const claimable = point.is_claimable !== undefined
        ? (point.is_claimable === 1 || point.is_claimable === true)
        : (inPoolDept && !hasOwner);

    return {
        isAssignee,
        isOwner,
        isReviewer,
        isPoolMember,
        canStart: !terminal && lifecycle === 'open' && isAssignee,
        canClaim: !terminal && lifecycle === 'open' && !isAssignee && claimable,
        canSubmit: !terminal && lifecycle === 'in_progress' && isAssignee,
        canVerify: !terminal && lifecycle === 'submitted' && isReviewer,
        canReturn: !terminal && lifecycle === 'submitted' && isReviewer,
        canHandOff: !terminal && isOwner,
        canReassign: !terminal && !isOwner && isReviewer,
        canSetDueDate: !terminal && (isAssignee || isReviewer),
    };
}

/**
 * The department a point is pooled to, if any - for the "Open to Maintenance"
 * line on a card. Returns the name the server hydrated, never an id.
 */
export function poolDepartment(point: AbilityPoint): { id?: string | number; name: string } | null {
    const dept = (point.assignments || []).find(
        (a: { role?: string; state?: string; assignee_type?: string; assignee_id?: string | number; assignee_name?: string }) =>
            (a.state || 'active') === 'active' && a.assignee_type === 'department'
    ) as { assignee_id?: string | number; assignee_name?: string } | undefined;
    if (!dept) return null;
    return { id: dept.assignee_id, name: dept.assignee_name || 'a department' };
}

/** Initials for an avatar chip, from whatever shape the name arrives in. */
export function initials(name?: string | null): string {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
