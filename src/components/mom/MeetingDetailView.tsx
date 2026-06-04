"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Calendar,
    Clock,
    MapPin,
    User,
    Users,
    Paperclip,
    Edit3,
    Share2,
    Download,
    ChevronRight,
    CheckCircle2,
    Layout,
    MessageSquare,
    FileText,
    MoreHorizontal,
    Plus,
    Building2,
    ChevronDown,
    Trash2,
    X,
    PlusCircle,
    Tag,
    History,
    Send,
    Check,
    Image as ImageIcon,
    Building,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DiscussionThread from './DiscussionThread';
import MeetingCollaborator from './MeetingCollaborator';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import ActionItemChat from './ActionItemChat';
import { useUserStore } from '@/lib/store/userStore';

export interface Breadcrumb {
    label: string;
    href?: string;
    role?: string;
}

interface MeetingDetailViewProps {
    meeting: any;
    breadcrumbs: Breadcrumb[];
    onEdit?: () => void;
    onStatusUpdate?: (pointId: number, newStatus: string) => void;
    currentEmployeeId?: number;
}

export default function MeetingDetailView({
    meeting: initialMeeting,
    breadcrumbs,
    onEdit,
    onStatusUpdate,
    currentEmployeeId
}: MeetingDetailViewProps) {
    const { user: storeUser } = useUserStore();
    const [meeting, setMeeting] = useState<any>(initialMeeting);
    const [activeTab, setActiveTab] = useState('points');
    const [isCollaborating, setIsCollaborating] = useState(false);

    // Direct Assignment States
    const [departmentsList, setDepartmentsList] = useState<any[]>([]);
    const [showAssignPopover, setShowAssignPopover] = useState<number | null>(null); // pointId
    const [assignType, setAssignType] = useState<'@' | '#' | '^'>('@');
    const [tagQuery, setTagQuery] = useState('');
    const [tagResults, setTagResults] = useState<any[]>([]);
    const [isAssigning, setIsAssigning] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Action Item Chat States
    const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const router = useRouter();

    const fetchMeetingDetails = useCallback(async () => {
        try {
            const res = await apiClient.get(`/mom/details/${meeting?.id || initialMeeting?.id}`, undefined, { withAuth: true });
            if (res.success) {
                setMeeting(res.data || res.meeting);
            } else {
                toast.error(res.error || 'Failed to fetch meeting details');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error fetching meeting details');
        }
    }, [initialMeeting?.id]);

    useEffect(() => {
        fetchMeetingDetails();
    }, [fetchMeetingDetails]);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const res = await apiClient.get('/organization/departments', undefined, { withAuth: true });
                setDepartmentsList(res.data || res || []);
            } catch (err) { }
        };
        fetchDepartments();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setShowAssignPopover(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (showAssignPopover !== null) {
            if (assignType === '#') {
                const filtered = tagQuery
                    ? departmentsList.filter((d: any) => d.name?.toLowerCase().includes(tagQuery.toLowerCase()))
                    : departmentsList;
                setTagResults(filtered);
                return;
            }
            const fetchTags = async () => {
                try {
                    const res = await apiClient.get(`/organization/employees?format=paginated&limit=10&search=${tagQuery}`, undefined, { withAuth: true });
                    const items = (res as any).data || (res as any).items || [];
                    setTagResults(items);
                } catch (err) { }
            };
            const timeoutId = setTimeout(() => fetchTags(), 300);
            return () => clearTimeout(timeoutId);
        }
    }, [tagQuery, showAssignPopover, assignType, departmentsList]);

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

    const handleDirectAssign = async (item: any) => {
        if (!showAssignPopover) return;
        const pointId = showAssignPopover;
        const type = assignType === '@' ? 'employee' : assignType === '#' ? 'department' : 'reviewer';
        const name = item.name || `${item.first_name} ${item.last_name}`;

        const point = meeting.points.find((p: any) => p.id === pointId);
        if (!point) return;

        let assignments = [...(point.assignments || [])];
        let reviewer_id = point.reviewer_id;

        if (type === 'reviewer') {
            reviewer_id = item.id || item.id_pk;
        } else {
            if (!assignments.find(a => a.id === (item.id || item.id_pk) && (a.type === type || a.assignee_type === type))) {
                assignments.push({ id: (item.id || item.id_pk), type, name });
            } else {
                setShowAssignPopover(null);
                return;
            }
        }

        setIsAssigning(true);
        try {
            const formData = new FormData();
            formData.append('point_text', point.point_text);
            formData.append('assignments', JSON.stringify(assignments));
            if (reviewer_id) formData.append('reviewer_id', reviewer_id);

            const res = await apiClient.put(`/mom/point/update/${pointId}`, formData, { withAuth: true });

            if (res.success) {
                toast.success('Assigned successfully');
                fetchMeetingDetails(); // Refresh meeting data
            } else {
                toast.error(res.error || 'Failed to add assignment');
            }
        } catch (err: any) {
            toast.error(err.message || 'Unauthorized or failed to assign');
        } finally {
            setIsAssigning(false);
            setShowAssignPopover(null);
        }
    };

    const handleAcknowledge = async (id: number) => {
        try {
            const res = await apiClient.put(`/mom/point/acknowledge/${id}`, {}, { withAuth: true });
            if (res.success) {
                toast.success('Acknowledged');
                fetchMeetingDetails();
                onStatusUpdate?.(id, 'acknowledged');
            }
        } catch (e) { toast.error('Error acknowledging point'); }
    };

    const handleMarkDone = async (id: number) => {
        try {
            const res = await apiClient.put(`/mom/point/complete/${id}`, {}, { withAuth: true });
            if (res.success) {
                toast.success('Marked as done');
                fetchMeetingDetails();
                onStatusUpdate?.(id, 'completed');
            }
        } catch (e) { toast.error('Error marking point as done'); }
    };

    const openChat = (id: number) => {
        setSelectedPointId(id);
        setIsChatOpen(true);
    };

    const handleToggleStatus = async (id: number, currentStatus: string) => {
        // This function is now handled by the specific acknowledge/complete endpoints
        // or can be extended for other status changes if needed.
        // For now, it's implicitly handled by handleAcknowledge and handleMarkDone.
        // If a generic status update is needed, it would look like this:
        // try {
        //     const newStatus = currentStatus === 'open' ? 'closed' : 'open'; // Example toggle
        //     const res = await apiClient.put(`/mom/point/update_status/${id}`, { status: newStatus }, { withAuth: true });
        //     if (res.success) {
        //         toast.success(`Point status updated to ${newStatus}`);
        //         fetchMeetingDetails();
        //     }
        // } catch (e) { toast.error('Error updating status'); }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Not set';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return 'Not set';
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const tabs = [
        { id: 'points', label: 'Meeting Points', icon: Layout },
        { id: 'discussion', label: 'Discussion', icon: MessageSquare },
    ];

    if (!meeting) {
        return (
            <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
                <p className="text-gray-500">Loading meeting details...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FC]">
            {/* Header with breadcrumbs and actions */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                        {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={idx}>
                                {crumb.href ? (
                                    <Link href={crumb.href} className="hover:text-gray-900 transition-colors">
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className="text-gray-900 font-medium">{crumb.label}</span>
                                )}
                                {idx < breadcrumbs.length - 1 && <ChevronRight size={14} />}
                            </React.Fragment>
                        ))}
                    </nav>

                    {/* Title and actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-semibold text-gray-900">{meeting.title}</h1>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${meeting.status === 'completed' ? 'bg-green-100 text-green-700' :
                                meeting.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                {meeting.status?.replace('_', ' ') || 'scheduled'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                <Share2 size={18} />
                            </button>
                            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                <Download size={18} />
                            </button>
                            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                <MoreHorizontal size={18} />
                            </button>
                            <button
                                onClick={() => setIsCollaborating(true)}
                                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-black hover:bg-gray-800 transition-all ml-2 shadow-lg shadow-black/10"
                            >
                                <Edit3 size={16} />
                                {meeting.status === 'completed' ? 'Add Post-Meeting Points' : 'Collaborate / Write MoM'}
                            </button>
                            <button
                                onClick={onEdit}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors ml-2"
                            >
                                <Plus size={16} />
                                Edit Basic Info
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Meeting info bar */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Calendar size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Date</p>
                                <p className="text-sm font-medium text-gray-900">{formatDate(meeting.meeting_date)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Clock size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Time</p>
                                <p className="text-sm font-medium text-gray-900">{formatTime(meeting.meeting_date)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <MapPin size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Location</p>
                                <p className="text-sm font-medium text-gray-900">{meeting.location || 'Not specified'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 ml-auto">
                            <div className="flex -space-x-2">
                                {meeting.attendees?.slice(0, 4).map((attendee: any) => (
                                    <div
                                        key={attendee.id}
                                        className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                                    >
                                        {attendee.name?.[0] || 'U'}
                                    </div>
                                ))}
                                {(meeting.attendees?.length || 0) > 4 && (
                                    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                                        +{meeting.attendees.length - 4}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === tab.id
                                    ? 'text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Main content area */}
                    <div className="col-span-8">
                        {activeTab === 'points' && (
                            <div className="bg-white rounded-lg border border-gray-200">
                                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900">Meeting Points</h2>
                                    <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-1">{meeting.points?.length || 0} points</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {meeting.points?.length > 0 ? meeting.points.map((point: any, index: number) => {
                                        const employeeAssignments = (point.assignments || []).filter((a: any) => (a.type || a.assignee_type) === 'employee');
                                        const type = (a: any) => a.type || a.assignee_type;
                                        const deptAssignments = (point.assignments || []).filter((a: any) => type(a) === 'department' || type(a) === 'dept');
                                        return (
                                            <div key={point.id} className="p-4 hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                                                {/* Point header */}
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-[10px] font-black text-blue-700 mt-0.5 shadow-sm">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[14px] font-black text-gray-900 leading-snug tracking-tight">{point.point_text}</p>

                                                        {/* Meta row: raised by + time */}
                                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                                                                <User size={10} className="text-slate-400" />
                                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{point.creator_name || 'Unknown'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                                                                <Calendar size={10} className="text-slate-400" />
                                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{formatDate(point.created_at)}</span>
                                                            </div>
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border ${point.status === 'closed' || point.status === 'completed' || point.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                                {point.status || 'open'}
                                                            </span>
                                                            {point.priority && (
                                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border ${point.priority === 'critical' || point.priority === 'high' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                    point.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                        'bg-gray-50 text-gray-500 border-gray-100'
                                                                    }`}>
                                                                    {point.priority}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Point Attachments */}
                                                        {point.attachments && point.attachments.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-2 pt-1">
                                                                {point.attachments.map((file: any, i: number) => (
                                                                    <a
                                                                        key={i}
                                                                        href={file.file_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 hover:bg-slate-100 transition-all group/file"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        {file.file_url?.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? <ImageIcon size={10} className="text-emerald-500" /> : <Paperclip size={10} className="text-blue-500" />}
                                                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight max-w-[120px] truncate">{file.file_name || 'View'}</span>
                                                                        <Download size={9} className="text-slate-300 group-hover/file:text-slate-500" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Assignment section — always visible */}
                                                        <div className="flex items-center gap-2 mt-3 flex-wrap relative">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">Assigned:</span>
                                                            {employeeAssignments.length === 0 && deptAssignments.length === 0 && !point.reviewer_id ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight shrink-0">Unassigned</span>
                                                                    <button
                                                                        onClick={() => { setAssignType('@'); setTagQuery(''); setShowAssignPopover(point.id); }}
                                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[9px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0"
                                                                    >
                                                                        <User size={10} /> Assign
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setAssignType('^'); setTagQuery(''); setShowAssignPopover(point.id); }}
                                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-[9px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0"
                                                                    >
                                                                        Reviewer
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {employeeAssignments.map((a: any, i: number) => (
                                                                            <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded-md text-[9px] font-black text-blue-700 uppercase tracking-tight shadow-sm shrink-0">
                                                                                <User size={9} />
                                                                                {a.assignee_name || a.name}
                                                                            </span>
                                                                        ))}
                                                                        {deptAssignments.map((a: any, i: number) => (
                                                                            <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-100 rounded-md text-[9px] font-black text-amber-700 uppercase tracking-tight shadow-sm shrink-0">
                                                                                <Building2 size={9} />
                                                                                {a.assignee_name || a.name}
                                                                            </span>
                                                                        ))}
                                                                        {point.reviewer_id && (
                                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 border border-purple-100 rounded-md text-[9px] font-black text-purple-700 uppercase tracking-tight shadow-sm shrink-0">
                                                                                <User size={9} />
                                                                                {point.reviewer_name || 'Assigned'} <span className="text-[8px] opacity-70 ml-0.5">(Reviewer)</span>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 ml-0.5">
                                                                        <button
                                                                            onClick={() => { setAssignType('@'); setTagQuery(''); setShowAssignPopover(point.id); }}
                                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-md text-[8px] font-black uppercase transition-all shadow-sm shrink-0"
                                                                            title="Assign more"
                                                                        >
                                                                            <Plus size={8} /> Assign
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { setAssignType('^'); setTagQuery(''); setShowAssignPopover(point.id); }}
                                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-purple-200 hover:bg-purple-50 text-purple-600 rounded-md text-[8px] font-black uppercase transition-all shadow-sm shrink-0"
                                                                            title="Edit Reviewer"
                                                                        >
                                                                            <Plus size={8} /> Rev
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Inline Popover for Assignments */}
                                                            {showAssignPopover === point.id && (
                                                                <div ref={popoverRef} className="absolute left-0 top-full mt-1 w-60 bg-white shadow-xl rounded-md border border-slate-200 z-50 overflow-hidden flex flex-col max-h-60">
                                                                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                                                                        <input
                                                                            type="text"
                                                                            placeholder={assignType === '@' ? 'Employees...' : assignType === '#' ? 'Depts...' : 'Reviewer...'}
                                                                            value={tagQuery}
                                                                            onChange={(e) => setTagQuery(e.target.value)}
                                                                            autoFocus
                                                                            className="w-full text-[10px] font-black uppercase tracking-tight p-2 bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-300 text-black shadow-sm"
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Escape') setShowAssignPopover(null);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="overflow-y-auto p-1 custom-scrollbar">
                                                                        {isAssigning ? (
                                                                            <div className="p-3 text-center text-[9px] font-black text-blue-600 uppercase tracking-widest">Assigning...</div>
                                                                        ) : tagResults.length > 0 ? tagResults.map((item: any) => (
                                                                            <button key={item.id || item.id_pk} onClick={(e) => { e.preventDefault(); handleDirectAssign(item); }} className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-50 transition-colors text-left group">
                                                                                <div className={`w-6 h-6 rounded bg-white flex items-center justify-center shrink-0 border transition-colors ${assignType === '@' ? 'border-blue-100 text-blue-600' :
                                                                                    assignType === '#' ? 'border-amber-100 text-amber-600' :
                                                                                        'border-purple-100 text-purple-600'
                                                                                    }`}>
                                                                                    {assignType === '@' ? <User size={12} /> : assignType === '#' ? <Building2 size={12} /> : <User size={12} />}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-[10px] font-black uppercase text-slate-700 truncate group-hover:text-black tracking-tight">{item.name || `${item.first_name} ${item.last_name}`}</p>
                                                                                    {item.designation && <p className="text-[8px] font-black uppercase text-slate-400 truncate tracking-widest mt-0.5">{item.designation}</p>}
                                                                                </div>
                                                                            </button>
                                                                        )) : (
                                                                            <div className="p-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">No results</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Action buttons */}
                                                        <div className="flex items-center gap-2 mt-4">
                                                            {(() => {
                                                                const uiStatus = getUiStatus(point.status);
                                                                const assignments = point.assignments || [];
                                                                const onlyDeptAssigned = assignments.length > 0 && assignments.every((a: any) => {
                                                                    const t = (a.type || a.assignee_type || '').toLowerCase();
                                                                    return t === 'department' || t === 'dept';
                                                                });

                                                                const ackSiteIds = meeting.acknowledging_site_ids || [];
                                                                const normalizedAckSites = Array.isArray(ackSiteIds) ? ackSiteIds : (ackSiteIds ? [ackSiteIds] : []);
                                                                const isMyDeptAssigned = assignments.some((a: any) => {
                                                                    const t = (a.type || a.assignee_type || '').toLowerCase();
                                                                    const aId = Number(a.assignee_id || a.id);
                                                                    const uDeptId = Number(storeUser?.departmentId || 0);
                                                                    return t === 'department' && aId === uDeptId && uDeptId !== 0;
                                                                });

                                                                const mySiteId = Number(storeUser?.siteId || 0);
                                                                const isMySiteAck = normalizedAckSites.map(Number).includes(mySiteId) && mySiteId !== 0;

                                                                if (uiStatus === 'Planned') {
                                                                    console.log(`DetailView Point ${point.id} Visibility Debug:`, {
                                                                        uiStatus,
                                                                        onlyDeptAssigned,
                                                                        isMySiteAck,
                                                                        isMyDeptAssigned,
                                                                        ackSiteIds,
                                                                        normalizedAckSites,
                                                                        mySiteId,
                                                                        storeUserDeptId: storeUser?.departmentId,
                                                                        assignments: assignments.map((a: any) => ({ type: a.assignee_type, id: a.assignee_id }))
                                                                    });
                                                                }

                                                                const myId = String(storeUser?.employeeId || storeUser?.id);
                                                                const isAssignedToMe = assignments.some((a: any) => (a.type === 'employee' || a.assignee_type === 'employee') && String(a.assignee_id || a.id) === myId);

                                                                return (
                                                                    <>
                                                                        {uiStatus === 'Planned' && onlyDeptAssigned && isMySiteAck && isMyDeptAssigned && (
                                                                            <button
                                                                                onClick={() => handleAcknowledge(point.id)}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                                                            >
                                                                                <Check size={12} /> Acknowledge
                                                                            </button>
                                                                        )}
                                                                        {(uiStatus === 'Acknowledged' || uiStatus === 'In Progress' || uiStatus === 'Rejected') && isAssignedToMe && (
                                                                            <button
                                                                                onClick={() => handleMarkDone(point.id)}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                                                            >
                                                                                <CheckCircle2 size={12} /> Mark Done
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                            <button
                                                                onClick={() => openChat(point.id)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                                            >
                                                                <MessageSquare size={12} /> Reply
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Priority badge */}
                                                    {point.priority && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 uppercase ${point.priority === 'critical' || point.priority === 'high' ? 'bg-red-50 text-red-600' :
                                                            point.priority === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                                                                'bg-gray-50 text-gray-500'
                                                            }`}>
                                                            {point.priority}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="text-center py-16">
                                            <Layout size={40} className="mx-auto text-gray-200 mb-3" />
                                            <p className="text-sm font-medium text-gray-400">No meeting points yet</p>
                                            <p className="text-xs text-gray-300 mt-1">Click "Collaborate / Write MoM" to add points</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'discussion' && (
                            <div className="bg-white rounded-lg border border-gray-200">
                                <div className="p-6 border-b border-gray-200">
                                    <h2 className="text-lg font-medium text-gray-900">Discussion Threads</h2>
                                </div>
                                <div className="divide-y divide-gray-200">
                                    {meeting.points?.map((point: any) => (
                                        <div key={point.id} className="p-6">
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <User size={16} className="text-gray-500" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900">{point.point_text}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Raised by {point.creator_name || 'Unknown'}</p>
                                                </div>
                                            </div>
                                            <DiscussionThread
                                                pointId={point.id}
                                                initialMessages={[]}
                                                status={point.status}
                                                onStatusUpdate={() => fetchMeetingDetails()}
                                                canClose={true}
                                                assigneeName={point.assignments?.[0]?.assignee_name}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right sidebar */}
                    <div className="col-span-4 space-y-6">
                        {/* Participants */}
                        <div className="bg-white rounded-lg border border-gray-200">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="font-medium text-gray-900">Participants</h3>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{meeting.attendees?.length || 0}</span>
                            </div>
                            <div className="p-4">
                                <div className="space-y-3">
                                    {meeting.attendees?.map((attendee: any) => (
                                        <div key={attendee.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                                    {attendee.name?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{attendee.name}</p>
                                                    <p className="text-xs text-gray-500">{attendee.designation || 'Team Member'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {attendee.role === 'organizer' && (
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">Host</span>
                                                )}
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${attendee.status === 'attended' ? 'text-emerald-600 bg-emerald-50' :
                                                    attendee.status === 'left' ? 'text-gray-500 bg-gray-100' :
                                                        'text-gray-400 bg-gray-50'
                                                    }`}>
                                                    {attendee.status || 'invited'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Collaboration Overlay */}
            {isCollaborating && (
                <div className="fixed inset-0 z-[200] bg-white flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-black text-gray-900">{meeting.title}</h2>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-lg">
                                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-red-700 uppercase">Live Collaboration</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsCollaborating(false)}
                            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200"
                        >
                            Exit Write Mode
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden p-6 bg-gray-50/30">
                        <MeetingCollaborator
                            meetingId={meeting.id}
                            initialMeeting={meeting}
                            currentEmployeeId={currentEmployeeId || 0}
                            basePath={breadcrumbs[0]?.href?.includes('employee') ? '/employee/mom' : '/org-admin/mom'}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}