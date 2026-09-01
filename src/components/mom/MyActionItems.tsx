"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import {
    CheckCircle2,
    Check,
    Filter,
    ChevronDown,
    CalendarDays,
    ArrowRightLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import ActionItemChat from './ActionItemChat';
import HandoffInbox from './HandoffInbox';
import HandoffDialog from './HandoffDialog';
import PointCard, { PointAction } from './PointCard';
import { toLifecycle } from '@/lib/momStatus';
import { dueDatePresets } from '@/lib/momDates';
import { useUserStore } from '@/lib/store/userStore';

export default function MyActionItems() {
    const [points, setPoints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [meetingFilter, setMeetingFilter] = useState('All Meetings');
    const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'raised'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [expandedAttachmentsPointId, setExpandedAttachmentsPointId] = useState<number | null>(null);
    const [expandedHistoryPointId, setExpandedHistoryPointId] = useState<number | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 10;
    const [editingDueDatePointId, setEditingDueDatePointId] = useState<number | null>(null);
    const [handoffTarget, setHandoffTarget] = useState<{ id: number; text: string; mode: 'handoff' | 'reassign' } | null>(null);

    const user = useUserStore(state => state.user);
    const router = useRouter();

    useEffect(() => {
        setPage(0);
        setHasMore(true);
        fetchMyPoints(0, true);
    }, [activeTab, statusFilter, startDate, endDate]);

    const fetchMyPoints = async (pageToFetch: number, isInitial: boolean = false) => {
        try {
            setLoading(true);
            const params: any = {
                type: activeTab,
                status: statusFilter,
                limit: PAGE_SIZE,
                offset: pageToFetch * PAGE_SIZE
            };
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const res = await apiClient.get('/mom/my-points', params, { withAuth: true });
            if (res.success) {
                const newPoints = res.points || [];
                if (isInitial) {
                    setPoints(newPoints);
                } else {
                    setPoints(prev => [...prev, ...newPoints]);
                }
                setHasMore(newPoints.length === PAGE_SIZE);
            } else {
                toast.error(res.error || 'Failed to fetch action items');
            }
        } catch (error) {
            console.error('Error fetching my points:', error);
            toast.error('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchMyPoints(nextPage);
    };

    const handleAcknowledge = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await apiClient.put(`/mom/point/acknowledge/${id}`, {}, { withAuth: true });
            if (res.success) {
                toast.success('Point acknowledged');
                setPoints(prev => prev.map(p => p.id === id ? { ...p, status: 'acknowledged' } : p));
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to acknowledge');
        }
    };

    const handleMarkDone = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await apiClient.put(`/mom/point/complete/${id}`, {}, { withAuth: true });
            if (res.success) {
                toast.success('Point marked as completed');
                setPoints(prev => prev.map(p => p.id === id ? { ...p, status: 'completed' } : p));
            }
        } catch (err) {
            toast.error('Failed to mark done');
        }
    };

    const handleApprove = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await apiClient.put(`/mom/point/approve/${id}`, {}, { withAuth: true });
            if (res.success) {
                toast.success('Point approved & closed ✓');
                // Remove from list immediately since closed items are filtered out
                setPoints(prev => prev.filter(p => p.id !== id));
            }
        } catch (err) {
            toast.error('Failed to approve');
        }
    };

    const handleReject = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await apiClient.put(`/mom/point/reject/${id}`, {}, { withAuth: true });
            if (res.success) {
                toast.error('Point rejected & reopened');
                setPoints(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
            }
        } catch (err) {
            toast.error('Failed to reject');
        }
    };

    const saveDueDate = async (id: number, value: string | null) => {
        try {
            const res: any = await apiClient.patch(`/mom/point/due-date/${id}`, { due_date: value }, { withAuth: true });
            if (res?.success) {
                toast.success(value ? 'Target date set' : 'Target cleared');
                setEditingDueDatePointId(null);
                fetchMyPoints(0, true);
            } else {
                // The server refuses a second move without a reason, and says so.
                toast.error(res?.message || 'Could not change the target date.');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Could not change the target date.');
        }
    };

    const openChat = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPointId(id);
        setIsChatOpen(true);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Not set';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const getUiStatus = (dbStatus: string) => {
        if (!dbStatus) return 'Planned';
        const s = dbStatus.toLowerCase();
        if (s === 'closed') return 'Closed';
        if (s === 'completed' || s === 'done' || s === 'approved') return 'Done';
        if (s === 'open' || s === 'unassigned' || s === 'assigned') return 'Planned';
        if (s === 'acknowledged') return 'Acknowledged';
        if (s === 'rejected') return 'Rejected';
        return 'In Progress';
    };

    const getRelativeTime = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const uniqueMeetings = Array.from(new Set(points.map(p => p.meeting_title))).filter(Boolean);

    const filteredPoints = points.filter(p => {
        if (meetingFilter !== 'All Meetings' && p.meeting_title !== meetingFilter) return false;
        if (statusFilter !== 'All Status') {
            if (getUiStatus(p.status) !== statusFilter) return false;
        }
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto font-sans">
            <HandoffInbox onChanged={() => fetchMyPoints(0, true)} />

            {handoffTarget && (
                <HandoffDialog
                    pointId={handoffTarget.id}
                    pointText={handoffTarget.text}
                    mode={handoffTarget.mode}
                    onClose={() => setHandoffTarget(null)}
                    onDone={() => fetchMyPoints(0, true)}
                />
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 mb-2">
                        {activeTab === 'all' ? 'All My Points' : activeTab === 'assigned' ? 'My Action Items' : 'My Raised Points'}
                    </h1>
                    <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-xl w-fit mb-8 border border-slate-200/50">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'all'
                                ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            All Points
                        </button>
                        <button
                            onClick={() => setActiveTab('assigned')}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'assigned'
                                ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            My Action Items
                        </button>
                        <button
                            onClick={() => setActiveTab('raised')}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'raised'
                                ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            My Raised Points
                        </button>
                    </div>
                </div>
            </div>

            {/* Date Filters Row */}
            <div className="flex flex-wrap items-center gap-4 mb-6 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-900 text-[12px] font-bold rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-900 text-[12px] font-bold rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    />
                </div>
                <div className="flex items-end h-full pt-6">
                    {(startDate || endDate) && (
                        <button
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                            className="text-[11px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 underline-offset-4 hover:underline transition-all"
                        >
                            Reset Dates
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center bg-gray-100/80 p-1 rounded-md w-fit">
                    {['All Status', 'Planned', 'Acknowledged', 'In Progress', 'Done', 'Rejected'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${statusFilter === status
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                    <Filter size={15} className="text-gray-400" />
                    <select
                        value={meetingFilter}
                        onChange={(e) => setMeetingFilter(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-900 text-[12px] font-bold rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors outline-none cursor-pointer shadow-sm"
                    >
                        <option value="All Meetings">All Meetings</option>
                        {uniqueMeetings.map((m: any) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
            ) : filteredPoints.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-lg p-12 text-center shadow-sm">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <h3 className="text-lg font-black text-gray-900 uppercase">All clear!</h3>
                    <p className="text-[12px] font-bold text-gray-500 uppercase mt-2">Zero action items found</p>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {filteredPoints.map((point: any) => {
                        const myId = String(user?.employeeId || user?.id);
                        const assignments = (point.assignments || []).filter(
                            (a: any) => (a.state || 'active') === 'active' && a.role !== 'verifier'
                        );
                        const isOwner = assignments.some((a: any) =>
                            a.assignee_type === 'employee' && String(a.assignee_id) === myId && (a.role === 'owner' || !a.role));
                        const isAssignedToMe = assignments.some((a: any) =>
                            a.assignee_type === 'employee' && String(a.assignee_id) === myId) ||
                            (point.assigned_to_id && String(point.assigned_to_id) === myId);
                        const lifecycle = toLifecycle(point.status, point.lifecycle_status);
                        const isReviewer = !!point.is_raised;

                        // Only what this person can actually do next, so the row
                        // is a decision rather than a menu.
                        const actions: PointAction[] = [];

                        if (lifecycle === 'open' && isAssignedToMe) {
                            actions.push({
                                key: 'start', label: 'Acknowledge', kind: 'primary',
                                onClick: (e: React.MouseEvent) => handleAcknowledge(point.id, e),
                            });
                        }
                        if (lifecycle === 'in_progress' && isAssignedToMe) {
                            actions.push({
                                key: 'done', label: 'Mark done', kind: 'primary', icon: Check,
                                onClick: (e: React.MouseEvent) => handleMarkDone(point.id, e),
                            });
                        }
                        if (lifecycle === 'submitted' && isReviewer) {
                            actions.push({
                                key: 'approve', label: 'Approve', kind: 'primary', icon: Check,
                                onClick: (e: React.MouseEvent) => handleApprove(point.id, e),
                            });
                            actions.push({
                                key: 'return', label: 'Send back', kind: 'danger',
                                onClick: (e: React.MouseEvent) => handleReject(point.id, e),
                            });
                        }
                        if (lifecycle !== 'done' && lifecycle !== 'cancelled') {
                            if (isOwner) {
                                actions.push({
                                    key: 'handoff', label: 'Hand over', icon: ArrowRightLeft,
                                    onClick: (e: React.MouseEvent) => { e.stopPropagation(); setHandoffTarget({ id: point.id, text: point.point_text, mode: 'handoff' }); },
                                });
                            } else if (isReviewer) {
                                actions.push({
                                    key: 'reassign', label: 'Reassign', icon: ArrowRightLeft,
                                    onClick: (e: React.MouseEvent) => { e.stopPropagation(); setHandoffTarget({ id: point.id, text: point.point_text, mode: 'reassign' }); },
                                });
                            }
                            actions.push({
                                key: 'due', label: point.due_date ? 'Target' : 'Set target', kind: 'quiet', icon: CalendarDays,
                                onClick: (e: React.MouseEvent) => { e.stopPropagation(); setEditingDueDatePointId(editingDueDatePointId === point.id ? null : point.id); },
                            });
                        }

                        return (
                            <div key={point.id}>
                                <PointCard
                                    point={point}
                                    actions={actions}
                                    viewerIsReviewer={isReviewer}
                                    onOpen={() => openChat(point.id, { stopPropagation: () => {} } as React.MouseEvent)}
                                />

                                {editingDueDatePointId === point.id && (
                                    <div className="mt-1.5 ml-1 flex flex-wrap items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Target date</span>
                                        {dueDatePresets().map((preset: { key: string; label: string; value: string }) => (
                                            <button
                                                key={preset.key}
                                                onClick={() => saveDueDate(point.id, preset.value)}
                                                className="px-2.5 py-1 bg-white border border-amber-200 rounded-md text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors"
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                        <input
                                            type="date"
                                            defaultValue={point.due_date ? String(point.due_date).slice(0, 10) : ''}
                                            onChange={(e) => e.target.value && saveDueDate(point.id, e.target.value)}
                                            className="px-2 py-1 border border-amber-200 rounded-md text-[11px] bg-white"
                                        />
                                        {point.due_date && (
                                            <button
                                                onClick={() => saveDueDate(point.id, null)}
                                                className="text-[11px] font-bold text-rose-500 hover:text-rose-700"
                                            >
                                                Clear
                                            </button>
                                        )}
                                        {(point.due_date_history?.length || 0) > 1 && (
                                            <span className="text-[10px] text-amber-600 ml-auto">
                                                Moved {point.due_date_history.length - 1}×  — a reason is required to move it again
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )
            }

            {hasMore && points.length > 0 && (
                <div className="flex justify-center mt-8 mb-12">
                    <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="px-8 py-3 bg-white border-2 border-slate-100 text-slate-900 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-3 group"
                    >
                        {loading ? (
                            <div className="size-4 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" />
                        ) : (
                            <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
                        )}
                        View More Points
                    </button>
                </div>
            )}

            <ActionItemChat
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                pointId={selectedPointId}
            />
        </div>
    );
}

