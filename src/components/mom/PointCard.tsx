"use client";

import React from 'react';
import {
    MessageSquare, Paperclip, CalendarDays, ArrowRightLeft,
    Check, ChevronRight, Building, User, Calendar, History,
    Image as ImageIcon, FileText, ExternalLink,
} from 'lucide-react';
import { readStatus, derivedBadges, TONE_CLASSES, initials } from '@/lib/momStatus';
import { describeDueDate } from '@/lib/momDates';

export interface PointAction {
    key: string;
    label: string;
    icon?: React.ElementType;
    /** 'primary' is the one thing this person is meant to do next. */
    kind?: 'primary' | 'default' | 'quiet' | 'danger';
    onClick: (e: React.MouseEvent) => void;
}

interface PointCardProps {
    point: any;
    actions?: PointAction[];
    selected?: boolean;
    onSelect?: () => void;
    onOpen?: () => void;
    onOpenTimeline?: () => void;
    onEditDueDate?: () => void;
    viewerIsReviewer?: boolean;
    unreadCount?: number;
    compact?: boolean;
}

const ACTION_CLASSES: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs',
    default: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
    quiet: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    danger: 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-50',
};

export default function PointCard({
    point, actions = [], selected, onSelect, onOpen,
    onOpenTimeline, onEditDueDate,
    viewerIsReviewer = false, unreadCount = 0, compact = false,
}: PointCardProps) {
    const status = readStatus(point, viewerIsReviewer);
    const badges = derivedBadges(point);
    const tone = TONE_CLASSES[status.tone];

    const assignees = (point.assignments || []).filter((a: any) => (a.state || 'active') !== 'declined' && a.role !== 'verifier');
    const assigneeText = assignees.length > 0
        ? assignees.map((a: any) => a.assignee_name || a.name || `User #${a.assignee_id}`).join(', ')
        : (point.assigned_to_name || 'Unassigned');

    const reviewerText = point.reviewer_name || (point.reviewer_id && point.reviewer_id === point.created_by ? point.creator_name : null);
    const attachments = point.attachments || [];
    const isDone = status.lifecycle === 'done' || status.lifecycle === 'cancelled';

    return (
        <div
            className={`group grid grid-cols-[4px_1fr] rounded-xl border overflow-hidden transition-all bg-white shadow-xs ${
                selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
        >
            {/* Left Status Color Stripe */}
            <div className={tone.stripe} aria-hidden="true" />

            <div className={compact ? 'p-3' : 'p-4'}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        {onSelect && (
                            <input
                                type="checkbox"
                                checked={!!selected}
                                onChange={onSelect}
                                onClick={e => e.stopPropagation()}
                                aria-label={`Select "${point.point_text}"`}
                                className="mt-1 size-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                        )}

                        <div className="min-w-0 flex-1">
                            {/* Point Sentence & Status Pill */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${tone.chip}`}>
                                    <span className={`size-1.5 rounded-full ${tone.dot}`} />
                                    {status.label}
                                </span>

                                {badges.map(b => (
                                    <span key={b.key} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${TONE_CLASSES[b.tone].chip}`}>
                                        {b.label}
                                    </span>
                                ))}
                            </div>

                            <button
                                onClick={onOpen}
                                disabled={!onOpen}
                                className={`text-left w-full mt-1.5 text-sm leading-relaxed font-semibold ${
                                    isDone ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-900'
                                } ${onOpen ? 'hover:text-blue-600 transition-colors' : ''}`}
                            >
                                {point.point_text}
                            </button>

                            {/* Metadata Row: Assignee, Reviewer, Target Date, Meeting */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-xs text-gray-600">
                                <span className="inline-flex items-center gap-1">
                                    <span className="text-gray-400 font-medium">Assigned to:</span>
                                    <span className="font-semibold text-gray-900">{assigneeText}</span>
                                </span>

                                {reviewerText && (
                                    <span className="inline-flex items-center gap-1">
                                        <span className="text-gray-400">• Reviewer:</span>
                                        <span className="font-semibold text-gray-900">{reviewerText}</span>
                                    </span>
                                )}

                                <span className="inline-flex items-center gap-1">
                                    <span className="text-gray-400 font-medium">• Target:</span>
                                    {point.due_date ? (
                                        <span className="font-semibold text-gray-900">{String(point.due_date).split('T')[0]}</span>
                                    ) : (
                                        <span className="text-gray-400 italic font-normal">Not set</span>
                                    )}
                                    {onEditDueDate && !isDone && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onEditDueDate(); }}
                                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                            title="Update target date (reason required)"
                                        >
                                            <Calendar size={12} />
                                        </button>
                                    )}
                                </span>

                                {point.priority && (
                                    <span className="inline-flex items-center gap-1">
                                        <span className="text-gray-400">• Priority:</span>
                                        <span className="font-semibold text-gray-900 capitalize">{point.priority}</span>
                                    </span>
                                )}

                                {point.meeting_title && (
                                    <span className="inline-flex items-center gap-1 text-gray-500">
                                        <span className="text-gray-400">• Meeting:</span>
                                        <span className="font-medium text-gray-700 truncate max-w-[200px]">{point.meeting_title}</span>
                                        {point.site_name && <span className="text-gray-400">({point.site_name})</span>}
                                    </span>
                                )}
                            </div>

                            {/* Attachments Section */}
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-2 mt-2 border-t border-gray-100">
                                    {attachments.map((att: any, attIdx: number) => {
                                        const isImg = att.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                        return (
                                            <a
                                                key={attIdx}
                                                href={att.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-[11px] font-medium text-gray-700 transition-colors"
                                            >
                                                {isImg ? (
                                                    <ImageIcon size={12} className="text-blue-600" />
                                                ) : (
                                                    <FileText size={12} className="text-amber-600" />
                                                )}
                                                <span className="truncate max-w-[140px]">{att.file_name || 'Attachment'}</span>
                                                <ExternalLink size={10} className="text-gray-400" />
                                            </a>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                        {actions.map(a => {
                            const Icon = a.icon;
                            return (
                                <button
                                    key={a.key}
                                    onClick={a.onClick}
                                    title={a.label}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        ACTION_CLASSES[a.kind || 'default']
                                    }`}
                                >
                                    {Icon && <Icon size={13} />}
                                    <span>{a.label}</span>
                                </button>
                            );
                        })}

                        {onEditDueDate && !isDone && (
                            <button
                                onClick={onEditDueDate}
                                title={point.due_date ? 'Reschedule target date (reason required)' : 'Set target date (reason required)'}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                            >
                                <Calendar size={13} className="text-blue-600" />
                                <span>{point.due_date ? 'Reschedule' : 'Set Target'}</span>
                            </button>
                        )}

                        {onOpenTimeline && (
                            <button
                                onClick={onOpenTimeline}
                                title="View point timeline & audit trail"
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                            >
                                <History size={13} className="text-gray-500" />
                                <span>Timeline</span>
                            </button>
                        )}

                        {onOpen && (
                            <button
                                onClick={onOpen}
                                title="Open discussion chat"
                                className="relative px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                            >
                                <MessageSquare size={13} />
                                <span>Chat</span>
                                {unreadCount > 0 && (
                                    <span className="size-4 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export { ArrowRightLeft, Check, User };
