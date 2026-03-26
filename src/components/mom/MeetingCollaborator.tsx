'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Send, User, Users, Clock, X,
    ChevronDown, MessageSquare, CheckCircle2,
    Calendar, Layout, Search, Filter, AlertCircle,
    Trash2, Edit3, UserPlus, Play, History, ArrowRight,
    Check, ChevronRight, Share, Settings, Star, Archive,
    FileText, Tag, AtSign, PlusCircle,
    Palette, Info, MoreHorizontal, ShieldCheck, Flag, Paperclip,
    ImageIcon, Download, Building, CheckCircle,
    RefreshCcw, CalendarDays
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { getSocket } from '@/lib/socket';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import DiscussionThread from './DiscussionThread';

const getRelativeTime = (date: string) => {
    if (!date) return 'Just now';
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
};

const formatDateWithOrdinal = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();

    const suffix = (day === 1 || day === 21 || day === 31) ? 'st' :
        (day === 2 || day === 22) ? 'nd' :
            (day === 3 || day === 23) ? 'rd' : 'th';

    return `${day}${suffix} ${month} ${year}`;
};

const MeetingCollaborator = ({ meetingId, initialMeeting, currentEmployeeId, basePath }: { meetingId: string, initialMeeting?: any, currentEmployeeId?: number, basePath?: string }) => {
    const { user, role, employee_id, employee } = useAuth();
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'planning' | 'write'>('write');
    const [meeting, setMeeting] = useState<any>(initialMeeting || null);
    const [points, setPoints] = useState<any[]>(initialMeeting?.points || []);
    const [loading, setLoading] = useState(!initialMeeting);
    const [newPoint, setNewPoint] = useState('');
    const [selectedPoint, setSelectedPoint] = useState<any>(null);
    const [editingPointId, setEditingPointId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');

    // Tagging state
    const [showTagPopover, setShowTagPopover] = useState(false);
    const [tagQuery, setTagQuery] = useState('');
    const [tagType, setTagType] = useState<'@' | '#' | '^'>('@');
    const [tagResults, setTagResults] = useState<any[]>([]);
    const [employeesList, setEmployeesList] = useState<any[]>([]);
    const [departmentsList, setDepartmentsList] = useState<any[]>([]);
    const [selectedAssignments, setSelectedAssignments] = useState<any[]>([]);
    const [editingDueDatePointId, setEditingDueDatePointId] = useState<number | null>(null);
    const [pointToDelete, setPointToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [pointToUpdate, setPointToUpdate] = useState<number | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [expandedHistoryPointId, setExpandedHistoryPointId] = useState<number | null>(null);
    const [expandedAttachmentsPointId, setExpandedAttachmentsPointId] = useState<number | null>(null);
    const [showAllMeetingAttachments, setShowAllMeetingAttachments] = useState(false);
    const [newAttachments, setNewAttachments] = useState<File[]>([]);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [newReviewerId, setNewReviewerId] = useState<number | null>(null);
    const [newReviewerName, setNewReviewerName] = useState<string | null>(null);
    const [newDueDate, setNewDueDate] = useState<string | null>(null);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const socketRef = useRef<any>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchData();
        const socket = getSocket();
        socketRef.current = socket;

        if (socket) {
            socket.emit('join_meeting', meetingId);
            socket.on('point_added', (point: any) => {
                setPoints(prev => [point, ...prev]);
                setMeeting((prev: any) => prev ? ({
                    ...prev,
                    timeline: [{
                        action: 'point_added',
                        employee_name: point.creator_name,
                        timestamp: new Date().toISOString()
                    }, ...(prev.timeline || [])]
                }) : null);
            });

            socket.on('point_updated', (updatedPoint: any) => setPoints(prev => prev.map(p => {
                if (p.id === updatedPoint.id) return { ...p, ...updatedPoint };
                return p;
            })));

            socket.on('point_deleted', (data: any) => setPoints(prev => prev.filter(p => p.id !== data.point_id)));

            socket.on('attendee_updated', (data: any) => {
                setMeeting((prev: any) => {
                    const attendees = prev.attendees?.map((a: any) =>
                        (Number(a.employee_id) === Number(data.employee_id) || Number(a.id) === Number(data.id))
                            ? { ...a, status: data.status }
                            : a
                    ) || [];

                    const employee = attendees.find((a: any) => (Number(a.employee_id) === Number(data.employee_id) || Number(a.id) === Number(data.id)));
                    const timeline = prev.timeline || [];

                    if (data.status === 'attended' || data.status === 'left') {
                        timeline.unshift({
                            action: data.status === 'attended' ? 'joined' : 'left',
                            employee_name: employee?.name || 'Participant',
                            timestamp: new Date().toISOString()
                        });
                    }

                    return { ...prev, attendees, timeline };
                });
            });

            socket.on('meeting_reopened', (data: any) => {
                setMeeting((prev: any) => prev ? ({
                    ...prev,
                    status: 'in_progress',
                    reopened_at: data.reopened_at,
                    reopened_by_name: data.reopened_by_name,
                    timeline: [{
                        action: 'reopened',
                        employee_name: data.reopened_by_name,
                        timestamp: data.reopened_at
                    }, ...(prev.timeline || [])]
                }) : null);
                toast.success('Meeting has been reopened');
            });

            socket.on('meeting_completed', (data: any) => {
                setMeeting((prev: any) => prev ? ({
                    ...prev,
                    status: 'completed',
                    timeline: [{
                        action: 'completed',
                        employee_name: 'Organizer', // We don't have the explicit name in broadcast, but it's usually clear
                        timestamp: new Date().toISOString()
                    }, ...(prev.timeline || [])]
                }) : null);
                toast('Meeting has been completed', { icon: '✅' });
            });
        }

        return () => {
            if (socket) {
                socket.emit('leave_meeting', meetingId);
                socket.off('point_added');
                socket.off('point_updated');
                socket.off('point_deleted');
                socket.off('attendee_updated');
                socket.off('meeting_reopened');
                socket.off('meeting_completed');
            }
        };
    }, [meetingId]);

    const fetchData = async () => {
        try {
            const [detailsRes, deptsRes] = await Promise.all([
                apiClient.get(`/mom/details/${meetingId}`, undefined, { withAuth: true }),
                apiClient.get('/organization/departments', undefined, { withAuth: true })
            ]);
            if (detailsRes.success) {
                setMeeting(detailsRes.meeting);
                setPoints(detailsRes.meeting.points || []);
            }
            setDepartmentsList(deptsRes.data || deptsRes || []);
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Failed to load meeting data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setShowTagPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputTitle = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart || 0;
        const lastChar = value[cursorPos - 1];

        if (editingPointId !== null && editingPointId !== -1) setEditText(value);
        else setNewPoint(value);

        // Live sync assignments - remove if not in text anymore
        setSelectedAssignments(prev => prev.filter(a => {
            const pattern = a.type === 'department' ? `#${a.name}` : `@${a.name}`;
            return value.includes(pattern);
        }));

        // Reset if moving away from mention
        const textBeforeCursor = value.slice(0, cursorPos);
        const words = textBeforeCursor.split(/\s/);
        const lastWord = words[words.length - 1];

        if (lastChar === '@' || lastChar === '#' || lastChar === '^') {
            setTagType(lastChar as '@' | '#' | '^');
            setTagQuery('');
            setShowTagPopover(true);
        } else if (showTagPopover && (lastWord.startsWith('@') || lastWord.startsWith('#') || lastWord.startsWith('^'))) {
            setTagQuery(lastWord.slice(1));
        } else {
            setShowTagPopover(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setNewAttachments(prev => [...prev, ...newFiles]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            if (editingPointId === -1) setPointToUpdate(-1);
            else if (editingPointId !== null) setPointToUpdate(editingPointId);
        }
    };

    useEffect(() => {
        if (showTagPopover) {
            if (tagType === '#' || tagType === '^' || tagType === '@') {
                if (tagType === '#') {
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
                    } catch (err) { console.error('Failed to search tags', err); }
                };
                const timeoutId = setTimeout(() => fetchTags(), 300);
                return () => clearTimeout(timeoutId);
            }
        }
    }, [showTagPopover, tagQuery, tagType, departmentsList]);

    const selectTag = (item: any) => {
        const type = tagType === '@' ? 'employee' : (tagType === '#' ? 'department' : 'employee');
        const name = item.name || `${item.first_name} ${item.last_name}`;
        const isEdit = editingPointId !== null && editingPointId !== -1;

        if (tagType === '^') {
            setNewReviewerId(item.id || item.id_pk);
            setNewReviewerName(name);
            setShowTagPopover(false);
            setTagQuery('');
            setTimeout(() => inputRef.current?.focus(), 10);
            return;
        }

        setSelectedAssignments(prev => {
            const id = item.id || item.id_pk;
            if (!prev.find(a => a.id === id && a.type === type)) {
                return [...prev, { id, type, name }];
            }
            return prev;
        });

        const currentText = isEdit ? editText : newPoint;
        const words = currentText.split(/\s/);
        const lastWord = words[words.length - 1];
        let newText = '';

        if (lastWord.startsWith(tagType)) {
            words[words.length - 1] = `${tagType}${name} `;
            newText = words.join(' ');
        } else {
            newText = currentText + (currentText.endsWith(' ') || currentText === '' ? '' : ' ') + `${tagType}${name} `;
        }

        if (isEdit) setEditText(newText);
        else setNewPoint(newText);

        setShowTagPopover(false);
        setTagQuery('');
        setTimeout(() => inputRef.current?.focus(), 10);
    };

    const addPoint = async () => {
        if (!newPoint.trim() && editingPointId === -1) return; // Only block if adding a new point and it's empty
        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append('meeting_id', meetingId);
            formData.append('point_text', editingPointId !== null ? editText : newPoint);
            formData.append('assignments', JSON.stringify(selectedAssignments));
            if (newReviewerId) formData.append('reviewer_id', newReviewerId.toString());
            else formData.append('reviewer_id', ''); // Clear if null
            if (newDueDate) formData.append('due_date', newDueDate);
            else formData.append('due_date', ''); // Clear if null

            newAttachments.forEach(file => {
                formData.append('attachments', file);
            });

            console.log('--- ADD POINT FORMDATA ---');
            for (let [key, value] of formData.entries()) {
                console.log(key, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value);
            }

            await apiClient.post('/mom/point/add', formData, { withAuth: true });
            setNewPoint('');
            setSelectedAssignments([]);
            setNewAttachments([]);
            setNewReviewerId(null);
            setNewReviewerName(null);
            setNewDueDate(null);
            setEditingPointId(null);
            setPointToUpdate(null);
            toast.success('Point added');
        } catch (err) { toast.error('Failed to add point'); }
        finally { setIsUpdating(false); }
    };

    const updatePoint = async (pointId: number) => {
        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append('point_text', editText);
            formData.append('assignments', JSON.stringify(selectedAssignments));
            if (newReviewerId) formData.append('reviewer_id', newReviewerId.toString());
            else formData.append('reviewer_id', ''); // Clear if null
            if (newDueDate) formData.append('due_date', newDueDate);
            else formData.append('due_date', ''); // Clear if null

            newAttachments.forEach(file => {
                formData.append('attachments', file);
            });

            console.log('--- UPDATE POINT FORMDATA ---');
            for (let [key, value] of formData.entries()) {
                console.log(key, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value);
            }

            await apiClient.put(`/mom/point/update/${pointId}`, formData, { withAuth: true });
            setEditingPointId(null);
            setSelectedAssignments([]);
            setNewAttachments([]);
            setNewReviewerId(null);
            setNewReviewerName(null);
            setNewDueDate(null);
            setPointToUpdate(null);
            toast.success('Point updated');
        } catch (err) { toast.error('Failed to update point'); }
        finally { setIsUpdating(false); }
    };

    const deleteAttachment = async (attachmentId: number, pointId: number) => {
        try {
            await apiClient.delete(`/mom/point/attachment/${attachmentId}`, { withAuth: true });
            toast.success('Attachment removed');
            setPoints(prev => prev.map(p => {
                if (p.id === pointId) {
                    return { ...p, attachments: p.attachments?.filter((a: any) => a.id !== attachmentId) };
                }
                return p;
            }));
        } catch (err) {
            toast.error('Failed to remove attachment');
        }
    };

    const confirmDeletePoint = async () => {
        if (!pointToDelete) return;
        setIsDeleting(true);
        try {
            await apiClient.delete(`/mom/point/delete/${pointToDelete}`, { withAuth: true });
            setPointToDelete(null);
            toast.success('Point deleted');
        } catch (err) {
            toast.error('Failed to delete point');
        } finally {
            setIsDeleting(false);
        }
    };

    const markAttendance = async () => {
        try {
            await apiClient.put('/mom/attendee/status', {
                meeting_id: meetingId,
                status: 'attended'
            }, { withAuth: true });
            toast.success('Attendance marked');

            // Optimistic update
            const myId = Number(effectiveEmployeeId);
            setMeeting((prev: any) => {
                const attendees = prev.attendees || [];
                // Find index by ID or Email
                const idx = attendees.findIndex((a: any) =>
                    (Number(a.employee_id) === myId && myId > 0) ||
                    (a.email && user?.email && a.email.toLowerCase() === user.email.toLowerCase())
                );

                if (idx !== -1) {
                    const newAttendees = [...attendees];
                    newAttendees[idx] = { ...newAttendees[idx], status: 'attended' };
                    return { ...prev, attendees: newAttendees };
                } else {
                    return {
                        ...prev,
                        attendees: [...attendees, {
                            id: Date.now(),
                            employee_id: myId,
                            status: 'attended',
                            name: user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Me',
                            email: user?.email
                        }]
                    };
                }
            });

            fetchData();
        } catch (err) { toast.error('Failed to mark attendance'); }
    };

    const leaveMeeting = async () => {
        try {
            await apiClient.put('/mom/attendee/status', {
                meeting_id: meetingId,
                status: 'left'
            }, { withAuth: true });
            toast.success('Left meeting');

            // Optimistic update
            const myId = Number(effectiveEmployeeId);
            setMeeting((prev: any) => ({
                ...prev,
                attendees: prev.attendees?.map((a: any) =>
                    (Number(a.employee_id) === myId ||
                        (a.email && user?.email && a.email.toLowerCase() === user.email.toLowerCase()))
                        ? { ...a, status: 'left' } : a
                )
            }));

            fetchData();
            window.history.back();
        } catch (err) { toast.error('Failed to leave meeting'); }
    };

    const completeMeeting = async () => {
        try {
            const res = await apiClient<{ success: boolean }>(`/mom/meeting/${meetingId}/complete`, { method: 'POST' });
            if (res.success) {
                setMeeting((prev: any) => ({ ...prev, status: 'completed' }));
                setShowCompleteModal(false);
                toast.success('Meeting completed successfully');
            }
        } catch (e: any) {
            toast.error('Failed to complete meeting: ' + e.message);
        }
    };

    const reopenMeeting = async () => {
        try {
            await apiClient.put(`/mom/reopen/${meetingId}`, {}, { withAuth: true });
            setMeeting((prev: any) => ({ ...prev, status: 'in_progress' }));
            setShowReopenModal(false);
            toast.success('Meeting reopened successfully');
        } catch (err: any) {
            toast.error(err.message || 'Failed to reopen meeting');
        }
    };

    const togglePointStatus = async (pointId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'closed' ? 'open' : 'closed';
        try {
            // Optimistic update
            setPoints(prev => prev.map(p => p.id === pointId ? { ...p, status: newStatus } : p));
            await apiClient.post('/mom/discussion/status', { point_id: pointId, status: newStatus }, { withAuth: true });
            toast.success(`Point marked as ${newStatus}`);
        } catch (err: any) {
            // Revert on failure
            setPoints(prev => prev.map(p => p.id === pointId ? { ...p, status: currentStatus } : p));
            toast.error(err.message || 'Failed to update point status');
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <div className="size-10 border-4 border-[#136dec] border-t-transparent animate-spin"></div>
        </div>
    );

    if (!meeting) return <div className="p-10 text-black font-black">Meeting not found</div>;

    const effectiveEmployeeId = Number(currentEmployeeId) || Number(employee_id) || Number(employee?.employee_id) || Number(employee?.id) || Number(user?.id) || 0;
    const isOrgAdmin = role?.toLowerCase() === 'orgadmin' || role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'superadmin';

    const me = meeting?.attendees?.find((a: any) =>
    ((Number(a.employee_id) === effectiveEmployeeId && effectiveEmployeeId > 0) ||
        (a.email && user?.email && a.email.toLowerCase() === user.email.toLowerCase()))
    );

    const isOrganizer = me?.role === 'organizer' || isOrgAdmin || (Number(meeting?.created_by) === Number(effectiveEmployeeId) && effectiveEmployeeId > 0);
    const isAttended = (me?.status === 'attended') || isOrgAdmin;

    return (
        <div className="flex h-screen bg-white text-black font-['Inter'] overflow-hidden">


            {/* Sidebar (Left) */}
            <aside className="w-56 border-r border-slate-100 bg-white hidden lg:flex flex-col p-4 shrink-0 overflow-y-auto">
                <div className="flex items-center gap-2 text-[#136dec] px-2 mb-8">
                    <FileText size={20} className="stroke-[3]" />
                    <h2 className="text-black text-sm font-black tracking-tighter uppercase whitespace-nowrap">MOM Editor</h2>
                </div>

                <div className="flex flex-col gap-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">View Mode</p>
                    <button
                        onClick={() => setViewMode('planning')}
                        className={`flex items-center gap-3 p-2.5 font-black text-[11px] uppercase tracking-wider rounded-lg transition-all ${viewMode === 'planning' ? 'bg-black text-white' : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <Calendar size={16} /> Planning
                    </button>
                    <button
                        onClick={() => setViewMode('write')}
                        className={`flex items-center gap-3 p-2.5 font-black text-[11px] uppercase tracking-wider rounded-lg transition-all ${viewMode === 'write' ? 'bg-black text-white' : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <Layout size={16} /> Write Mode
                    </button>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-50">
                    <div className="p-3 bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">EDITOR TIP</p>
                        <p className="text-[9px] text-black font-bold leading-tight">
                            SHIFT + ENTER TO SAVE POINT INSTANTLY.
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <header className="h-16 border-b border-slate-50 flex items-center justify-between px-8 bg-white shrink-0">
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {(() => {
                            const isAdmin = role?.toLowerCase() === 'orgadmin' || role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'superadmin';
                            const basePath = isAdmin ? '/org-admin' : '/employee';
                            return (
                                <>
                                    <button onClick={() => router.push(`${basePath}`)} className="hover:text-slate-700 transition-colors">{meeting.organization_name || 'Organization'}</button>
                                    <ChevronRight size={12} />
                                    <button onClick={() => router.push(`${basePath}/mom/list`)} className="hover:text-slate-700 transition-colors">Meetings</button>
                                    <ChevronRight size={12} />
                                    <span className="text-black truncate max-w-[200px]">{meeting.title}</span>
                                </>
                            );
                        })()}
                    </div>
                    <div className="flex items-center gap-2">
                        {meeting.status !== 'completed' && (
                            !isAttended ? (
                                <button
                                    onClick={markAttendance}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest shadow-md rounded-lg flex items-center gap-2 transition-all mr-2"
                                >
                                    <CheckCircle size={14} /> Mark Attendance
                                </button>
                            ) : (
                                <button
                                    onClick={leaveMeeting}
                                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 text-[11px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all mr-2"
                                >
                                    <X size={14} /> Leave Meeting
                                </button>
                            )
                        )}
                        {meeting.status !== 'completed' ? (
                            <button
                                onClick={() => setShowCompleteModal(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest shadow-md rounded-lg flex items-center gap-2 transition-all"
                            >
                                <CheckCircle size={14} /> Complete Meeting
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowReopenModal(true)}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black uppercase tracking-widest shadow-md rounded-lg flex items-center gap-2 transition-all mr-2"
                            >
                                <RefreshCcw size={14} /> Reopen Meeting
                            </button>
                        )}
                    </div>
                </header>

                {meeting.status === 'in_progress' && meeting.reopened_at && (
                    <div className="bg-emerald-50 border-b border-emerald-100 px-8 py-2 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                            <div className="p-1 bg-emerald-100 rounded-full">
                                <RefreshCcw size={12} />
                            </div>
                            <span>Meeting Reopened by {meeting.reopened_by_name || 'Organizer'} at {new Date(meeting.reopened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">
                            New points started after {new Date(meeting.reopened_at).toLocaleDateString()}
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-8 py-8">
                    <div className="max-w-4xl mx-auto space-y-8 relative">
                        {/* Hidden Inputs */}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} onClick={(e) => { e.currentTarget.value = ''; }} className="hidden" multiple />

                        {showCompleteModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-white rounded-2xl shadow-2xl p-6 w-[400px] border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                                    <div className="flex items-center gap-3 text-blue-600">
                                        <div className="p-2 bg-blue-50 rounded-full">
                                            <CheckCircle size={24} />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Complete Meeting?</h3>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                        Are you sure you want to complete this meeting? No further points can be added.
                                    </p>
                                    <div className="flex items-center justify-end gap-3 mt-2">
                                        <button
                                            onClick={() => setShowCompleteModal(false)}
                                            className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={completeMeeting}
                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-95"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showReopenModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-white rounded-2xl shadow-2xl p-6 w-[400px] border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                                    <div className="flex items-center gap-3 text-emerald-600">
                                        <div className="p-2 bg-emerald-50 rounded-full">
                                            <RefreshCcw size={24} />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Reopen Meeting?</h3>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                        Are you sure you want to reopen this meeting? This will allow adding new points and editing existing ones.
                                    </p>
                                    <div className="flex items-center justify-end gap-3 mt-2">
                                        <button
                                            onClick={() => setShowReopenModal(false)}
                                            className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={reopenMeeting}
                                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-95"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Header Section */}
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-black text-black tracking-tight leading-none">{meeting.title}</h1>
                                <div className="flex items-center gap-5 text-slate-500 text-[11px] font-black tracking-widest uppercase">
                                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-blue-600" /> {formatDateWithOrdinal(meeting.meeting_date)}</span>
                                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-blue-600" /> {new Date(meeting.meeting_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="flex items-center gap-1.5"><Building size={14} className="text-blue-600" /> {meeting.location || 'HQ CONFERENCE'}</span>
                                </div>
                            </div>
                            {meeting.status !== 'completed' && isAttended && (
                                <button
                                    onClick={() => { setEditingPointId(-1); setNewPoint(''); setSelectedAssignments([]); setNewAttachments([]); setNewReviewerId(null); setNewReviewerName(null); setNewDueDate(null); }}
                                    className="px-5 py-3 bg-[#136dec] hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-100 rounded-lg active:scale-95 transition-all"
                                >
                                    <Plus size={18} strokeWidth={3} /> Add Point
                                </button>
                            )}

                        </div>

                        {/* Composer / Points List */}
                        <div className="space-y-4 pb-32">
                            {editingPointId === -1 && isAttended && (
                                <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 p-5 relative animate-in fade-in slide-in-from-top-4 transition-all">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-md text-[9px] font-black uppercase tracking-widest">New Drafting</span>
                                                <button
                                                    onClick={() => { setTagType('#'); setTagQuery(''); setShowTagPopover(true); }}
                                                    className="px-2 py-0.5 border border-orange-200 text-orange-600 bg-orange-50 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-orange-100 transition-colors"
                                                >
                                                    <Building size={10} /> Assign Dept
                                                </button>
                                                <button
                                                    onClick={() => { setTagType('@'); setTagQuery(''); setShowTagPopover(true); }}
                                                    className="px-2 py-0.5 border border-blue-200 text-blue-600 bg-blue-50 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-blue-100 transition-colors"
                                                >
                                                    <User size={10} /> Assign Employee
                                                </button>
                                                <div className="w-px h-3 bg-slate-200 mx-1"></div>
                                                <button
                                                    onClick={() => { setTagType('^'); setTagQuery(''); setShowTagPopover(true); }}
                                                    className="px-2 py-0.5 border border-purple-200 text-purple-600 bg-purple-50 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-purple-100 transition-colors"
                                                >
                                                    <UserPlus size={10} /> Set Reviewer
                                                </button>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        id="new-point-date"
                                                        className="hidden"
                                                        onChange={(e) => setNewDueDate(e.target.value)}
                                                    />
                                                    <button
                                                        onClick={() => document.getElementById('new-point-date')?.click()}
                                                        className="px-2 py-0.5 border border-amber-200 text-amber-600 bg-amber-50 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-amber-100 transition-colors"
                                                    >
                                                        <CalendarDays size={10} /> {newDueDate ? formatDate(newDueDate) : 'Set Target'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => setEditingPointId(null)} className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">Discard</button>
                                                <button onClick={() => setPointToUpdate(-1)} className="px-4 py-2 bg-black hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">Save Point</button>
                                            </div>
                                        </div>

                                        <textarea
                                            ref={inputRef}
                                            autoFocus
                                            value={newPoint}
                                            onChange={handleInputTitle}
                                            onKeyDown={handleKeyDown}
                                            className="w-full bg-transparent border-none focus:ring-0 text-lg font-bold text-black placeholder:text-slate-300 resize-none min-h-[80px] p-0 focus:outline-none"
                                            placeholder="Write your point here... (use Assign Employee / Assign Dept buttons or type @name / #dept)"
                                        />

                                        <div className="flex flex-wrap gap-2 pb-2">
                                            {newReviewerId && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 text-[10px] font-bold">
                                                    <span className="opacity-60 uppercase tracking-tighter">Reviewer:</span>
                                                    <span>{newReviewerName}</span>
                                                    <button onClick={() => { setNewReviewerId(null); setNewReviewerName(null); }} className="hover:text-purple-900"><X size={10} /></button>
                                                </div>
                                            )}
                                            {newDueDate && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-[10px] font-bold">
                                                    <span className="opacity-60 uppercase tracking-tighter">Target:</span>
                                                    <span>{formatDate(newDueDate)}</span>
                                                    <button onClick={() => setNewDueDate(null)} className="hover:text-amber-900"><X size={10} /></button>
                                                </div>
                                            )}
                                            {selectedAssignments.map((a, i) => (
                                                <span key={i} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-black text-[9px] font-black uppercase flex items-center gap-1">
                                                    {a.type === 'department' ? <Building size={10} className="text-blue-600" /> : <User size={10} className="text-emerald-600" />}{a.name}
                                                    <X size={10} className="ml-1 cursor-pointer text-slate-400 hover:text-red-500 transition-colors" onClick={() => setSelectedAssignments(prev => prev.filter((_, idx) => idx !== i))} />
                                                </span>
                                            ))}
                                        </div>

                                        {newAttachments.length > 0 && (
                                            <div className="flex flex-wrap gap-3 pb-3">
                                                {newAttachments.map((f, i) => (
                                                    <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-all hover:bg-white group cursor-default">
                                                        <div className="size-6 bg-white rounded flex items-center justify-center border border-slate-100 shrink-0">
                                                            {f.type.startsWith('image/') ? <ImageIcon size={12} className="text-emerald-600" /> : <Paperclip size={12} className="text-blue-600" />}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{f.name}</span>
                                                        <button onClick={() => setNewAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500 p-0.5 rounded-md hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all">
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-5 pt-3 border-t border-slate-50">
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 px-2 py-1 -ml-2 rounded-md transition-colors"><Paperclip size={14} /> Attach Doc</button>
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 px-2 py-1 -ml-2 rounded-md transition-colors"><ImageIcon size={14} /> Add Image</button>
                                        </div>
                                    </div>

                                    {showTagPopover && (
                                        <div ref={popoverRef} className="absolute top-12 left-0 w-64 bg-white shadow-xl rounded-xl border border-slate-100 z-50 overflow-hidden flex flex-col max-h-80">
                                            <div className="p-2 border-b border-slate-100 bg-slate-50">
                                                <input
                                                    type="text"
                                                    placeholder={tagType === '@' ? 'Search employees...' : 'Search departments...'}
                                                    value={tagQuery}
                                                    onChange={(e) => setTagQuery(e.target.value)}
                                                    autoFocus
                                                    className="w-full text-[11px] font-bold p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400 text-black"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') setShowTagPopover(false);
                                                    }}
                                                />
                                            </div>
                                            <div className="overflow-y-auto p-2 custom-scrollbar">
                                                {tagResults.length > 0 ? tagResults.map((item: any) => (
                                                    <button key={item.id} onClick={(e) => { e.preventDefault(); selectTag(item); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group">
                                                        <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                            {tagType === '@' ? <User size={14} className="text-emerald-600" /> : <Building size={14} className="text-blue-600" />}
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-[11px] font-black uppercase tracking-tight text-slate-900 truncate">{item.name || `${item.first_name} ${item.last_name}`}</span>
                                                            {tagType === '@' && <span className="text-[9px] text-slate-400 font-bold uppercase truncate">{item.designation || 'Participant'}</span>}
                                                        </div>
                                                    </button>
                                                )) : (
                                                    <div className="p-4 flex flex-col items-center justify-center text-slate-400 gap-2">
                                                        <Search size={16} />
                                                        <span className="text-[10px] font-bold uppercase">No results found</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {points.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                    <div className="size-16 bg-slate-50 flex items-center justify-center rounded-full mb-4 border border-slate-100 shadow-sm">
                                        <FileText size={24} className="text-slate-300" />
                                    </div>
                                    <h3 className="text-sm font-black tracking-tight text-slate-900 mb-1">No Points Added</h3>
                                    <p className="text-[11px] font-medium text-slate-500 max-w-sm">There are currently no discussion points in this meeting. Click "Add Point" to start collaborating.</p>
                                </div>
                            ) : points.map((point) => {
                                const isEditing = editingPointId === point.id;
                                const isAssigned = point.assignments?.length > 0;

                                if (isEditing) return (
                                    <div key={point.id} className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 p-5 relative transition-all">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setTagType('#'); setTagQuery(''); setShowTagPopover(true); }} className="px-2 py-0.5 border border-blue-200 text-blue-600 bg-blue-50 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-blue-100 transition-colors">
                                                        <Building size={10} /> Assign Dept
                                                    </button>
                                                    <button onClick={() => { setTagType('@'); setTagQuery(''); setShowTagPopover(true); }} className="px-2 py-0.5 border border-emerald-200 text-emerald-600 bg-emerald-50 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-emerald-100 transition-colors">
                                                        <User size={10} /> Assign User
                                                    </button>
                                                    <button onClick={() => { setTagType('^'); setTagQuery(''); setShowTagPopover(true); }} className="px-2 py-0.5 border border-purple-200 text-purple-600 bg-purple-50 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-purple-100 transition-colors">
                                                        <UserPlus size={10} /> Set Reviewer
                                                    </button>
                                                    <div className="relative">
                                                        <input
                                                            type="date"
                                                            id={`edit-point-date-${point.id}`}
                                                            className="hidden"
                                                            onChange={(e) => setNewDueDate(e.target.value)}
                                                        />
                                                        <button
                                                            onClick={() => document.getElementById(`edit-point-date-${point.id}`)?.click()}
                                                            className="px-2 py-0.5 border border-amber-200 text-amber-600 bg-amber-50 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-amber-100 transition-colors"
                                                        >
                                                            <CalendarDays size={10} /> {newDueDate ? formatDate(newDueDate) : 'Set Target'}
                                                        </button>
                                                    </div>
                                                    <div className="w-px h-3 bg-slate-200 mx-1"></div>
                                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-slate-500 font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 px-2 py-0.5 rounded-md transition-colors border border-slate-200"><Paperclip size={10} /> Attach</button>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => { setEditingPointId(null); setNewReviewerId(null); setNewReviewerName(null); setNewDueDate(null); setSelectedAssignments([]); setNewAttachments([]); }} className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">Cancel</button>
                                                    <button onClick={() => setPointToUpdate(point.id)} className="px-4 py-2 bg-black hover:bg-slate-800 rounded-lg text-white text-[10px] font-black uppercase tracking-widest transition-colors">Update</button>
                                                </div>
                                            </div>
                                            <textarea
                                                ref={inputRef}
                                                autoFocus
                                                value={editText}
                                                onChange={handleInputTitle}
                                                onKeyDown={handleKeyDown}
                                                className="w-full bg-transparent border-none focus:ring-0 text-lg font-bold text-black resize-none min-h-[60px] p-0 focus:outline-none"
                                            />

                                            <div className="flex flex-wrap gap-2 pb-2">
                                                {newReviewerId && (
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 text-[10px] font-bold">
                                                        <span className="opacity-60 uppercase tracking-tighter">Reviewer:</span>
                                                        <span>{newReviewerName}</span>
                                                        <button onClick={() => { setNewReviewerId(null); setNewReviewerName(null); }} className="hover:text-purple-900"><X size={10} /></button>
                                                    </div>
                                                )}
                                                {newDueDate && (
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-[10px] font-bold">
                                                        <span className="opacity-60 uppercase tracking-tighter">Target:</span>
                                                        <span>{formatDate(newDueDate)}</span>
                                                        <button onClick={() => setNewDueDate(null)} className="hover:text-amber-900"><X size={10} /></button>
                                                    </div>
                                                )}
                                                {selectedAssignments.map((a, i) => (
                                                    <span key={i} className={`px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-black text-[9px] font-black uppercase flex items-center gap-1 ${a.type === 'reviewer' ? 'bg-purple-50 border-purple-200' : ''}`}>
                                                        {a.type === 'department' ? <Building size={10} className="text-blue-600" /> : a.type === 'reviewer' ? <User size={10} className="text-purple-600" /> : <User size={10} className="text-emerald-600" />}
                                                        {a.type === 'reviewer' ? `Reviewer: ${a.name}` : a.name}
                                                        <X size={10} className="ml-1 cursor-pointer text-slate-400 hover:text-red-500 transition-colors" onClick={() => setSelectedAssignments(prev => prev.filter((_, idx) => idx !== i))} />
                                                    </span>
                                                ))}
                                            </div>

                                            {(newAttachments.length > 0 || (point.attachments && point.attachments.length > 0)) && (
                                                <div className="flex flex-wrap gap-3 pb-3">
                                                    {point.attachments && point.attachments.map((f: any) => (
                                                        <div key={f.id} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-all hover:bg-red-50 hover:border-red-200 group cursor-default">
                                                            <div className="size-6 bg-white rounded flex items-center justify-center border border-slate-100 shrink-0">
                                                                {f.file_url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? <ImageIcon size={12} className="text-emerald-600" /> : <Paperclip size={12} className="text-blue-600" />}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{f.file_name || 'Attachment'}</span>
                                                            <button onClick={() => deleteAttachment(f.id, point.id)} className="text-slate-400 hover:text-red-600 p-0.5 rounded-md hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all">
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {newAttachments.map((f, i) => (
                                                        <div key={`new-${i}`} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-all hover:bg-white group cursor-default">
                                                            <div className="size-6 bg-white rounded flex items-center justify-center border border-slate-100 shrink-0">
                                                                {f.type.startsWith('image/') ? <ImageIcon size={12} className="text-emerald-600" /> : <Paperclip size={12} className="text-blue-600" />}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-600 italic truncate max-w-[120px]">{f.name} (New)</span>
                                                            <button onClick={() => setNewAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500 p-0.5 rounded-md hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all">
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-5 pt-3 border-t border-slate-50">
                                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 px-2 py-1 -ml-2 rounded-md transition-colors"><Paperclip size={14} /> Attach Doc</button>
                                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 px-2 py-1 -ml-2 rounded-md transition-colors"><ImageIcon size={14} /> Add Image</button>
                                            </div>
                                        </div>

                                        {showTagPopover && (
                                            <div className="absolute top-12 left-0 w-64 bg-white shadow-xl rounded-xl border border-slate-100 z-50 p-2 overflow-hidden overflow-y-auto max-h-64 custom-scrollbar">
                                                {tagResults.map((item: any) => (
                                                    <button key={item.id} onClick={() => selectTag(item)} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group">
                                                        <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                            {tagType === '@' ? <User size={14} className="text-emerald-600" /> : tagType === '#' ? <Building size={14} className="text-blue-600" /> : <User size={14} className="text-purple-600" />}
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-[11px] font-black uppercase tracking-tight truncate">{item.name || `${item.first_name} ${item.last_name}`}</span>
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase truncate">{item.designation || 'Participant'}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );

                                return (
                                    <div key={point.id} className="bg-white rounded-md shadow-sm border border-slate-200 hover:shadow-md transition-all group overflow-hidden">
                                        <div className="p-4 flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`px-2 py-0.5 rounded-md ${isAssigned ? 'bg-blue-50 text-blue-700 font-black border border-blue-100' : 'bg-rose-50 text-rose-700 font-black border border-rose-100'} text-[9px] uppercase tracking-widest`}>
                                                        {isAssigned ? 'ASSIGNED' : 'UNASSIGNED'}
                                                    </div>
                                                    {point.status !== 'assigned' && point.status !== 'unassigned' && (
                                                        <div className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 font-black border border-slate-100 text-[9px] uppercase tracking-widest">
                                                            {point.status?.replace('_', ' ').toUpperCase()}
                                                        </div>
                                                    )}
                                                    {point.added_post_meeting ? (
                                                        <div className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 font-black border border-amber-100 text-[9px] uppercase tracking-widest flex items-center gap-1">
                                                            <Clock size={10} /> Added Later
                                                        </div>
                                                    ) : null}
                                                    {meeting.reopened_at && new Date(point.created_at) > new Date(meeting.reopened_at) && (
                                                        <div className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-black border border-emerald-100 text-[9px] uppercase tracking-widest flex items-center gap-1">
                                                            <RefreshCcw size={10} /> After Reopen
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 opacity-100 transition-opacity">
                                                    {(Number(point.created_by) === Number(effectiveEmployeeId) ||
                                                        Number(user?.id) === Number(point.created_by) ||
                                                        Number(employee?.employee_id) === Number(point.created_by) ||
                                                        Number(employee?.id) === Number(point.created_by) ||
                                                        isOrganizer) && (
                                                            <>
                                                                <button onClick={() => {
                                                                    setEditingPointId(point.id);
                                                                    setEditText(point.point_text);
                                                                    setNewReviewerId(point.reviewer_id || null);
                                                                    setNewReviewerName(point.reviewer_name || null);
                                                                    setNewDueDate(point.due_date ? new Date(point.due_date).toISOString().split('T')[0] : null);
                                                                    const initialAssignments = point.assignments ? point.assignments.map((a: any) => ({
                                                                        id: a.assignee_id || a.id,
                                                                        type: a.assignee_type || a.type,
                                                                        name: a.assignee_name || a.name
                                                                    })) : [];
                                                                    setSelectedAssignments(initialAssignments);
                                                                }} className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"><Edit3 size={15} /></button>
                                                                <button onClick={() => setPointToDelete(point.id)} className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                                                            </>
                                                        )}
                                                </div>
                                            </div>

                                            <p className={`text-[14px] font-black leading-relaxed tracking-tight break-words ${point.status === 'closed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                {point.point_text}
                                            </p>

                                            {point.attachments && point.attachments.length > 0 && (
                                                <div className="flex flex-col gap-1.5 pt-1">
                                                    {(expandedAttachmentsPointId === point.id ? point.attachments : point.attachments.slice(0, 3)).map((file: any, i: number) => (
                                                        <a key={i} href={file.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-white px-2.5 py-2 rounded-md border border-slate-200 shadow-sm transition-all hover:bg-slate-50 group">
                                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                                <div className="size-7 bg-slate-50 rounded border border-slate-100 flex items-center justify-center shrink-0">
                                                                    {file.file_url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? <ImageIcon size={12} className="text-emerald-500" /> : <Paperclip size={12} className="text-blue-500" />}
                                                                </div>
                                                                <span className="text-[11px] font-black text-slate-700 truncate uppercase tracking-tight">{file.file_name || 'Attachment'}</span>
                                                            </div>
                                                            <div className="p-1 text-slate-400 group-hover:text-blue-600 transition-all shrink-0">
                                                                <Download size={12} />
                                                            </div>
                                                        </a>
                                                    ))}
                                                    {point.attachments.length > 3 && (
                                                        <button
                                                            onClick={() => setExpandedAttachmentsPointId(expandedAttachmentsPointId === point.id ? null : point.id)}
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

                                            {expandedHistoryPointId === point.id && ((point.history && point.history.length > 0) || (point.due_date_history && point.due_date_history.length > 0)) && (
                                                <div className="mt-2 p-4 bg-white/60 rounded-xl border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-top-2 fade-in duration-200 shadow-sm backdrop-blur-sm">
                                                    {point.history && point.history.length > 0 && (
                                                        <div className="flex flex-col gap-3">
                                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-2">
                                                                <History size={12} /> Edit History
                                                            </h4>
                                                            <div className="flex flex-col gap-3">
                                                                {point.history.map((h: any) => (
                                                                    <div key={h.id} className="text-sm bg-white/80 p-3 rounded-lg border border-slate-100/50 shadow-sm">
                                                                        <div className="flex justify-between items-center mb-1.5">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <div className="size-5 rounded-full bg-slate-100/80 flex items-center justify-center text-slate-500">
                                                                                    <User size={10} />
                                                                                </div>
                                                                                <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">{h.editor_name || 'Anonymous'}</span>
                                                                            </div>
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{getRelativeTime(h.created_at)}</span>
                                                                        </div>
                                                                        <p className="text-slate-400 font-medium text-[13px] line-through decoration-slate-300 leading-relaxed italic">
                                                                            {h.old_text}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {point.due_date_history && point.due_date_history.length > 0 && (
                                                        <div className="flex flex-col gap-3">
                                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-2 mt-1">
                                                                <Calendar size={12} /> Target Date History
                                                            </h4>
                                                            <div className="flex flex-col gap-2">
                                                                {point.due_date_history.map((h: any, idx: number) => (
                                                                    <div key={idx} className="text-[11px] bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="font-bold text-amber-900 flex items-center gap-1.5 capitalize">
                                                                                {h.changed_by_name?.split(' ')[0] || 'User'}
                                                                            </span>
                                                                            <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest">{getRelativeTime(h.changed_at)}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-amber-800/80 font-medium">
                                                                            <span className={h.old_date ? "line-through opacity-50" : ""}>{h.old_date ? formatDate(h.old_date) : 'No date'}</span>
                                                                            <ChevronRight size={10} className="text-amber-400" />
                                                                            <span className="font-black text-amber-600">{h.new_date ? formatDate(h.new_date) : 'Cleared'}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col gap-1 min-h-[28px] justify-center">
                                                        {isAssigned ? (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A:</span>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {point.assignments.map((a: any, i: number) => (
                                                                            <div key={i} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border shadow-sm shrink-0 ${(a.assignee_type || a.type) === 'department' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                                                                                {(a.assignee_type || a.type) === 'department' ? <Building size={10} /> : <User size={10} />}
                                                                                <span className="text-[9px] font-black uppercase tracking-tight">{a.assignee_name || a.name}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                {point.reviewer_id && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">R:</span>
                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-purple-100 shadow-sm shrink-0 bg-purple-50 text-purple-700">
                                                                            <User size={10} />
                                                                            <span className="text-[9px] font-black uppercase tracking-tight">{point.reviewer_name || 'Assigned'}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : point.reviewer_id ? (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">R:</span>
                                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-purple-100 shadow-sm shrink-0 bg-purple-50 text-purple-700 w-fit">
                                                                    <User size={10} />
                                                                    <span className="text-[9px] font-black uppercase tracking-tight">{point.reviewer_name || 'Assigned'}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <div className="size-5 rounded-md bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm shrink-0">
                                                                    <AlertCircle size={10} />
                                                                </div>
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                    No assignee
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                                                    {((point.history && point.history.length > 0) || (point.due_date_history && point.due_date_history.length > 0)) && (
                                                        <button
                                                            onClick={() => setExpandedHistoryPointId(expandedHistoryPointId === point.id ? null : point.id)}
                                                            className={`flex items-center gap-1.5 transition-colors ${expandedHistoryPointId === point.id ? 'text-blue-600' : 'hover:text-blue-500'}`}
                                                            title="View edit/date history"
                                                        >
                                                            <History size={12} className={expandedHistoryPointId === point.id ? "animate-pulse" : ""} />
                                                            History ({(point.history?.length || 0) + (point.due_date_history?.length || 0)})
                                                        </button>
                                                    )}
                                                    <div className="w-px h-3 bg-slate-200"></div>
                                                    {/* Due Date Inline Picker */}
                                                    {editingDueDatePointId === point.id && point.status !== 'closed' && meeting.status !== 'completed' ? (
                                                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                            <input
                                                                type="date"
                                                                defaultValue={point.due_date ? new Date(point.due_date).toISOString().split('T')[0] : ''}
                                                                className="text-[10px] border border-blue-300 rounded px-1.5 py-0.5 text-blue-700 bg-blue-50 outline-none focus:ring-1 focus:ring-blue-400"
                                                                autoFocus
                                                                onBlur={async (e) => {
                                                                    const val = e.target.value;
                                                                    setEditingDueDatePointId(null);
                                                                    const res = await apiClient.patch(`/mom/point/due-date/${point.id}`, { due_date: val || null }, { withAuth: true });
                                                                    if (res.success) {
                                                                        setMeeting((prev: any) => ({
                                                                            ...prev,
                                                                            points: prev.points.map((p: any) => p.id === point.id ? {
                                                                                ...p,
                                                                                due_date: val || null,
                                                                                due_date_history: res.history || p.due_date_history,
                                                                                due_date_set_by_name: res.due_date_set_by_name || p.due_date_set_by_name
                                                                            } : p)
                                                                        }));
                                                                        toast.success(val ? 'Target date set' : 'Target date cleared');
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => { if (e.key === 'Escape') setEditingDueDatePointId(null); }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                if (point.status === 'closed' || meeting.status === 'completed') return;
                                                                e.stopPropagation();
                                                                setEditingDueDatePointId(point.id);
                                                            }}
                                                            className={`flex items-center gap-1 transition-colors ${point.status === 'closed' || meeting.status === 'completed' ? 'cursor-default opacity-80' : 'cursor-pointer'} ${point.due_date
                                                                ? (new Date(point.due_date) < new Date() && point.status !== 'closed' ? 'text-rose-500 hover:text-rose-600' : 'text-amber-500 hover:text-amber-600')
                                                                : 'hover:text-blue-500'}`}
                                                            title={point.due_date ? `Target: ${new Date(point.due_date).toLocaleDateString()}${point.due_date_set_by_name ? ` (Set by ${point.due_date_set_by_name})` : ''}` : 'Set target date'}
                                                        >
                                                            <CalendarDays size={12} />
                                                            <div className="flex flex-col items-start leading-none">
                                                                {point.due_date
                                                                    ? <span>{new Date(point.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                                    : <span className="text-slate-300">{point.status === 'closed' || meeting.status === 'completed' ? 'No date' : 'Set date'}</span>
                                                                }
                                                                {point.due_date && point.due_date_set_by_name && (
                                                                    <span className="text-[7px] opacity-60 normal-case tracking-normal">by {point.due_date_set_by_name.split(' ')[0]}</span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    )}
                                                    <div className="w-px h-3 bg-slate-200"></div>
                                                    <span>{getRelativeTime(point.updated_at || point.created_at)}</span>
                                                    <button onClick={() => setSelectedPoint(point)} className="p-1.5 rounded-full hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"><MessageSquare size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar (Right) */}
            <aside className="w-64 border-l border-slate-100 bg-white hidden xl:flex flex-col p-6 shrink-0 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] font-black text-black uppercase tracking-widest">Participants</h3>
                    <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5">
                        {meeting.status === 'completed'
                            ? `${meeting.attendees?.filter((a: any) => a.status === 'attended' || a.status === 'left').length || meeting.attendees?.length || 0} Attended`
                            : `${meeting.attendees?.filter((a: any) => a.status === 'attended').length || 0} Joined`
                        }
                    </span>
                </div>

                <div className="flex flex-col gap-5">
                    {meeting.attendees?.map((att: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 font-bold relative border border-slate-100">
                                    {att.name?.[0]?.toUpperCase()}
                                    {att.status === 'attended' && <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 rounded-full border-2 border-white"></div>}
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-[12px] font-bold text-slate-900 leading-none">{att.name}</p>
                                    <p className="text-[10px] text-slate-500 mt-1">{att.designation || 'Participant'}</p>
                                </div>
                            </div>
                            {att.role === 'organizer' && <ShieldCheck size={14} className="text-blue-600" />}
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-8 border-t border-slate-50 flex flex-col gap-4">
                    <h3 className="text-[10px] font-black text-black uppercase tracking-widest">Attachments</h3>
                    <div className="space-y-2">
                        {meeting.attachments?.length > 0 ? (
                            <>
                                {(showAllMeetingAttachments ? meeting.attachments : meeting.attachments.slice(0, 5)).map((file: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50 group cursor-pointer hover:bg-slate-100 transition-all">
                                        <div className="p-1.5 rounded-md bg-blue-100 text-blue-600">
                                            <FileText size={14} />
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-700 truncate flex-1">{file.file_name}</span>
                                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 group-hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all">
                                            <Download size={14} />
                                        </a>
                                    </div>
                                ))}
                                {meeting.attachments.length > 5 && (
                                    <button
                                        onClick={() => setShowAllMeetingAttachments(!showAllMeetingAttachments)}
                                        className="w-full py-2 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors mt-2"
                                    >
                                        {showAllMeetingAttachments ? (
                                            <>Show Less <ChevronDown size={12} className="rotate-180" /></>
                                        ) : (
                                            <>+{meeting.attachments.length - 5} More Attachments <ChevronDown size={12} /></>
                                        )}
                                    </button>
                                )}
                            </>
                        ) : (
                            <p className="text-[10px] text-slate-400 text-center py-4">No attachments</p>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-50 flex flex-col gap-4">
                    <h3 className="text-[10px] font-black text-black uppercase tracking-widest">Meeting Timeline</h3>
                    <div className="relative pl-4 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
                        {meeting.timeline?.length > 0 ? (
                            meeting.timeline.map((event: any, i: number) => (
                                <div key={i} className="relative group">
                                    <div className={`absolute -left-[13px] top-1 size-3 rounded-full border-2 border-white flex items-center justify-center transition-all ${event.action === 'reopened' ? 'bg-emerald-500 ring-4 ring-emerald-50' :
                                        event.action === 'completed' ? 'bg-blue-500 ring-4 ring-blue-50' :
                                            event.action === 'joined' ? 'bg-emerald-400' : 'bg-slate-300'
                                        }`}>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5 leading-none">
                                            <span className="text-[10px] font-black uppercase tracking-tighter text-slate-900">
                                                {event.employee_name || meeting.reopened_by_name || 'Unknown'}
                                            </span>
                                            <span className={`text-[9px] font-black px-1 rounded uppercase tracking-widest ${event.action === 'reopened' ? 'text-emerald-600 bg-emerald-50' :
                                                event.action === 'completed' ? 'text-blue-600 bg-blue-50' :
                                                    'text-slate-400'
                                                }`}>
                                                {event.action}
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                                            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-[10px] text-slate-400 py-2">No timeline events recorded yet.</p>
                        )}
                    </div>
                </div>
            </aside>

            {/* Discussion Modal */}
            {
                selectedPoint && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-end bg-slate-900/20 backdrop-blur-sm">
                        <div className="w-full max-w-lg h-full bg-white shadow-2xl relative animate-in slide-in-from-right duration-300">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Discussion Thread</h3>
                                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">Live Sync Enabled</p>
                                </div>
                                <button onClick={() => setSelectedPoint(null)} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="h-[calc(100%-88px)]">
                                <DiscussionThread
                                    pointId={selectedPoint.id}
                                    initialMessages={[]}
                                    status={selectedPoint.status}
                                    onStatusUpdate={() => { }}
                                    canClose={true}
                                    assigneeName={selectedPoint.assignments?.[0]?.assignee_name}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Custom Delete Confirmation Modal */}
            {
                pointToDelete !== null && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="size-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                                    <AlertCircle size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">Delete Point?</h3>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                        Are you sure you want to remove this discussion point permanently? This action cannot be undone.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 w-full mt-4">
                                    <button
                                        onClick={() => setPointToDelete(null)}
                                        disabled={isDeleting}
                                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm tracking-wide hover:bg-slate-50 transition-all disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDeletePoint}
                                        disabled={isDeleting}
                                        className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isDeleting ? (
                                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>Delete</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Custom Update/Save Confirmation Modal */}
            {
                pointToUpdate !== null && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="size-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <CheckCircle size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">{pointToUpdate === -1 ? 'Submit Point?' : 'Save Changes?'}</h3>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                        {pointToUpdate === -1
                                            ? 'Are you ready to submit this point to the collaborative meeting notes?'
                                            : 'Are you sure you want to save these changes to the existing discussion point? (Original text will be preserved in history)'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 w-full mt-4">
                                    <button
                                        onClick={() => setPointToUpdate(null)}
                                        disabled={isUpdating}
                                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm tracking-wide hover:bg-slate-50 transition-all disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => pointToUpdate === -1 ? addPoint() : updatePoint(pointToUpdate)}
                                        disabled={isUpdating}
                                        className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isUpdating ? (
                                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>{pointToUpdate === -1 ? 'Submit' : 'Save'}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default MeetingCollaborator;