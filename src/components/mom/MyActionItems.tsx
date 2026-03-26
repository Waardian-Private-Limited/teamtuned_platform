"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import {
    Calendar,
    FileText,
    CheckCircle2,
    Video,
    Tag,
    Check,
    Filter,
    MessageSquare,
    ChevronRight,
    User,
    Building2,
    MapPin,
    Eye,
    Paperclip,
    Image as ImageIcon,
    Download,
    History,
    ChevronDown,
    Building,
    CalendarDays
} from 'lucide-react';
import toast from 'react-hot-toast';
import ActionItemChat from './ActionItemChat';
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
        if (s === 'open' || s === 'unassigned') return 'Planned';
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
                        const uiStatus = getUiStatus(point.status);
                        return (
                            <div
                                key={point.id}
                                className="bg-white border border-gray-200 rounded-md p-5 shadow-sm hover:shadow-md transition-all group relative cursor-pointer"
                                onClick={(e) => openChat(point.id, e)}
                            >
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${point.priority === 'high' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                point.priority === 'low' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                    'bg-blue-50 text-blue-600 border border-blue-100'
                                                }`}>
                                                {point.priority || 'NORMAL'}
                                            </span>
                                            <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                                                <Calendar size={11} /> {formatDate(point.created_at || point.meeting_date)}
                                            </span>
                                            {point.site_name && (
                                                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                                                    <MapPin size={9} /> {point.site_name}
                                                </span>
                                            )}
                                            {/* Due Date Badge */}
                                            {point.due_date && (
                                                <span
                                                    onClick={uiStatus !== 'Done' && uiStatus !== 'Closed' ? (e) => { e.stopPropagation(); setEditingDueDatePointId(editingDueDatePointId === point.id ? null : point.id); } : undefined}
                                                    className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border transition-colors ${uiStatus !== 'Done' && uiStatus !== 'Closed' ? 'cursor-pointer' : 'cursor-default'} ${new Date(point.due_date) < new Date()
                                                        ? 'text-rose-600 bg-rose-50 border-rose-100'
                                                        : 'text-amber-600 bg-amber-50 border-amber-100'
                                                        }`}
                                                    title={`Target: ${new Date(point.due_date).toLocaleDateString()}${point.due_date_set_by_name ? ` · Set by ${point.due_date_set_by_name}` : ''}`}
                                                >
                                                    <CalendarDays size={9} />
                                                    {new Date(point.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    {point.due_date_set_by_name && (
                                                        <span className="opacity-60 font-semibold normal-case tracking-normal">by {point.due_date_set_by_name.split(' ')[0]}</span>
                                                    )}
                                                    {new Date(point.due_date) < new Date() && uiStatus !== 'Done' && uiStatus !== 'Closed' && <span className="text-rose-400">Overdue</span>}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {activeTab === 'all' && (
                                                point.is_raised ? (
                                                    <div className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[8px] font-black uppercase tracking-tighter border border-purple-100 text-center">Raised Point</div>
                                                ) : (
                                                    <div className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-tighter border border-blue-100 text-center">Action Item</div>
                                                )
                                            )}
                                            {activeTab !== 'all' && point.is_raised ? (
                                                <div className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[8px] font-black uppercase tracking-tighter border border-purple-100 text-center">Raised</div>
                                            ) : null}
                                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${uiStatus === 'Closed' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                uiStatus === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    uiStatus === 'Acknowledged' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        uiStatus === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                            'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${uiStatus === 'Closed' ? 'bg-slate-400' :
                                                    uiStatus === 'Done' ? 'bg-emerald-500' :
                                                        uiStatus === 'Acknowledged' ? 'bg-blue-500' :
                                                            uiStatus === 'Rejected' ? 'bg-rose-500' :
                                                                'bg-amber-500'
                                                    }`}></div>
                                                {uiStatus}
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className={`text-base font-black leading-snug tracking-tight ${(uiStatus === 'Done' || uiStatus === 'Closed') ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-900 group-hover:text-blue-600 transition-colors'}`}>
                                        {point.point_text}
                                    </h3>

                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                                            <Video size={13} className="text-gray-300" />
                                            <span>{point.meeting_title}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                                            <Tag size={13} className="text-gray-300" />
                                            <span>By {point.creator_name}</span>
                                        </div>
                                    </div>

                                    {/* History Display */}
                                    {expandedHistoryPointId === point.id && (
                                        <div className="mt-1 p-3 bg-slate-50/50 rounded-md border border-slate-100 flex flex-col gap-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                            {point.history && point.history.length > 0 && (
                                                <>
                                                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                                        <History size={10} /> Edit History
                                                    </h4>
                                                    <div className="flex flex-col gap-2">
                                                        {point.history.map((h: any) => (
                                                            <div key={h.id} className="text-[12px] bg-white p-2 rounded border border-slate-100 shadow-sm">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">{h.editor_name || 'Anonymous'}</span>
                                                                    </div>
                                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{getRelativeTime(h.created_at)}</span>
                                                                </div>
                                                                <p className="text-slate-400 font-medium text-[11px] line-through decoration-slate-300 leading-tight italic">
                                                                    {h.old_text}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}

                                            {/* Due Date History */}
                                            {point.due_date_history && point.due_date_history.length > 0 && (
                                                <>
                                                    <h4 className="text-[9px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5 mt-1">
                                                        <CalendarDays size={10} /> Target Date History
                                                    </h4>
                                                    <div className="flex flex-col gap-1.5">
                                                        {point.due_date_history.map((dh: any, idx: number) => {
                                                            const fmtDate = (d: string | null) => d
                                                                ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                                : '—';
                                                            return (
                                                                <div key={dh.id} className="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-slate-100 shadow-sm">
                                                                    <div className="flex items-center gap-2">
                                                                        {idx === 0 && <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 border border-amber-100 px-1 py-0.5 rounded">Latest</span>}
                                                                        <span className="text-[9px] font-bold text-slate-600">{dh.changed_by_name || 'Unknown'}</span>
                                                                        <span className="text-slate-300 text-[9px]">changed</span>
                                                                        {dh.old_date && <span className="text-[9px] font-black text-rose-400 line-through">{fmtDate(dh.old_date)}</span>}
                                                                        <span className="text-slate-300 text-[9px]">→</span>
                                                                        <span className="text-[9px] font-black text-amber-600">{fmtDate(dh.new_date)}</span>
                                                                    </div>
                                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{getRelativeTime(dh.changed_at)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}

                                            {(!point.history || point.history.length === 0) && (!point.due_date_history || point.due_date_history.length === 0) && (
                                                <p className="text-[10px] text-slate-400 italic text-center py-2">No edit or date history yet.</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Attachments Section */}
                                    {point.attachments && point.attachments.length > 0 && (
                                        <div className="flex flex-col gap-1.5 pt-1">
                                            <div className="flex flex-wrap gap-2">
                                                {(expandedAttachmentsPointId === point.id ? point.attachments : point.attachments.slice(0, 3)).map((file: any, i: number) => (
                                                    <a
                                                        key={i}
                                                        href={file.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-md border border-slate-100 hover:bg-slate-100 transition-all group/file shadow-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {file.file_url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? <ImageIcon size={11} className="text-emerald-500" /> : <Paperclip size={11} className="text-blue-500" />}
                                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight max-w-[120px] truncate">{file.file_name || 'Attachment'}</span>
                                                        <Download size={10} className="text-slate-300 group-hover/file:text-slate-500" />
                                                    </a>
                                                ))}
                                            </div>
                                            {point.attachments.length > 3 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setExpandedAttachmentsPointId(expandedAttachmentsPointId === point.id ? null : point.id); }}
                                                    className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 py-1 px-2 rounded-md self-start flex items-center gap-1.5 transition-colors"
                                                >
                                                    {expandedAttachmentsPointId === point.id ? (
                                                        <>Show Less <ChevronDown size={10} className="rotate-180" /></>
                                                    ) : (
                                                        <>+{point.attachments.length - 3} More <ChevronDown size={10} /></>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Assignment & Reviewer Visuals */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-1">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-1 min-h-[24px] justify-center">
                                                {point.assignments && point.assignments.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A:</span>
                                                            <div className="flex flex-wrap gap-1">
                                                                {point.assignments.map((a: any, i: number) => (
                                                                    <div key={i} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border shadow-sm shrink-0 ${a.assignee_type === 'department' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                                                                        {a.assignee_type === 'department' ? <Building size={9} /> : <User size={9} />}
                                                                        <span className="text-[9px] font-black uppercase tracking-tight">{a.assignee_name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">R:</span>
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-purple-100 shadow-sm shrink-0 bg-purple-50 text-purple-700">
                                                                <User size={9} />
                                                                <span className="text-[9px] font-black uppercase tracking-tight">{point.reviewer_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-4 rounded bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm shrink-0">
                                                            <span className="text-[8px] font-bold">!</span>
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No assignee</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {(point.history?.length > 0 || point.due_date_history?.length > 0) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setExpandedHistoryPointId(expandedHistoryPointId === point.id ? null : point.id); }}
                                                    className={`flex items-center gap-1.5 transition-colors text-[10px] font-bold uppercase tracking-wider ${expandedHistoryPointId === point.id ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'}`}
                                                    title="View edit history"
                                                >
                                                    <History size={12} />
                                                    <span>{expandedHistoryPointId === point.id ? 'Hide' : 'History'}</span>
                                                </button>
                                            )}
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const myId = String(user?.id);
                                                    const assignments = point.assignments || [];
                                                    const isAssignedToMe = assignments.some((a: any) => a.assignee_type === 'employee' && String(a.assignee_id) === myId);
                                                    const isClaimed = assignments.some((a: any) => a.assignee_type === 'employee');

                                                    return (
                                                        <>
                                                            {(uiStatus === 'Planned' || uiStatus === 'Acknowledged' || uiStatus === 'In Progress' || uiStatus === 'Rejected') && (
                                                                (!isClaimed || isAssignedToMe) && (
                                                                    (uiStatus === 'Planned') ? (
                                                                        <button
                                                                            onClick={(e) => handleAcknowledge(point.id, e)}
                                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-md transition-all shadow-sm active:scale-95"
                                                                        >
                                                                            Acknowledge
                                                                        </button>
                                                                    ) : isAssignedToMe && (
                                                                        <button
                                                                            onClick={(e) => handleMarkDone(point.id, e)}
                                                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-md transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                                                        >
                                                                            <Check size={12} /> Done
                                                                        </button>
                                                                    )
                                                                )
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                                {!!point.is_raised && uiStatus === 'Done' && point.status !== 'closed' && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => handleApprove(point.id, e)}
                                                            className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-md transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                                        >
                                                            <Check size={12} /> Approve
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleReject(point.id, e)}
                                                            className="px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-rose-100 transition-all active:scale-95"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={(e) => openChat(point.id, e)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-md transition-all active:scale-95"
                                                >
                                                    <MessageSquare size={12} /> Reply
                                                </button>
                                                {/* Inline Due Date Editor — hidden for Done/Closed */}
                                                {uiStatus !== 'Done' && uiStatus !== 'Closed' && (
                                                    editingDueDatePointId === point.id ? (
                                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="date"
                                                                defaultValue={point.due_date ? new Date(point.due_date).toISOString().split('T')[0] : ''}
                                                                className="text-[10px] border border-amber-300 rounded px-1.5 py-1 text-amber-700 bg-amber-50 outline-none focus:ring-1 focus:ring-amber-400"
                                                                autoFocus
                                                                onBlur={async (e) => {
                                                                    const val = e.target.value;
                                                                    setEditingDueDatePointId(null);
                                                                    const res = await apiClient.patch(`/mom/point/due-date/${point.id}`, { due_date: val || null }, { withAuth: true });
                                                                    if (res.success) {
                                                                        toast.success(val ? 'Target date set' : 'Target date cleared');
                                                                        // Full refetch so due_date_set_by_name and history update
                                                                        setPage(0);
                                                                        setPoints([]);
                                                                        fetchMyPoints(0, true);
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => { if (e.key === 'Escape') setEditingDueDatePointId(null); }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingDueDatePointId(point.id); }}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all active:scale-95 border ${point.due_date
                                                                ? 'bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100'
                                                                : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            <CalendarDays size={11} /> {point.due_date ? 'Edit Date' : 'Set Date'}
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
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

