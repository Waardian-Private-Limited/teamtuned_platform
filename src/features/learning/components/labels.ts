import type { CourseKind, ItemStatus, PlanItem } from '../api/learning.api';

export const KIND_LABEL: Record<CourseKind, string> = { online: 'Online course', video: 'Video', document: 'Reading', classroom: 'Classroom', book: 'Book', other: 'Other' };
export const STATUS_LABEL: Record<ItemStatus, string> = { assigned: 'To start', in_progress: 'In progress', completed: 'Done, to confirm', verified: 'Confirmed', dropped: 'Dropped' };
export const SOURCE_LABEL: Record<PlanItem['source'], string> = { manager: 'From manager', hr: 'From HR', self: 'Added myself', gap: 'For a skill gap' };
export const statusTone = (s: ItemStatus) => (s === 'verified' ? 'active' : s === 'dropped' ? 'terminated' : s === 'completed' ? 'inactive' : 'neutral');
export const LEARN_MANAGE = 'LEARN_MANAGE';
