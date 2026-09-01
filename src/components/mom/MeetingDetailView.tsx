"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
    Calendar,
    Clock,
    MapPin,
    Paperclip,
    Edit3,
    ChevronRight,
    CheckCircle2,
    MessageSquare,
    FileText,
    Plus,
    Trash2,
    Check,
    Play,
    RotateCcw,
    Search,
    ListTodo,
    ExternalLink,
    Image as ImageIcon,
    Lock,
    ChevronDown,
    Download,
    AlertCircle,
    RefreshCw,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import ActionItemChat from './ActionItemChat';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

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
    const { role } = useAuth();
    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";

    const [meeting, setMeeting] = useState<any>(initialMeeting);
    const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'completed'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [employeesList, setEmployeesList] = useState<any[]>([]);

    // Action point composer state
    const [pointText, setPointText] = useState('');
    const [selectedAssignee, setSelectedAssignee] = useState<{ id: string; name: string; type: 'employee' | 'all' | 'none' }>({
        id: '',
        name: 'Select Assignee...',
        type: 'none'
    });
    const [reviewerId, setReviewerId] = useState<string>('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
    const [dueDate, setDueDate] = useState<string>('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [submittingPoint, setSubmittingPoint] = useState(false);

    // Searchable Combobox dropdown states (for 200+ employees)
    const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
    const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
    const [reviewerSearchQuery, setReviewerSearchQuery] = useState('');
    const [isReviewerDropdownOpen, setIsReviewerDropdownOpen] = useState(false);
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
    const [showEndMeetingModal, setShowEndMeetingModal] = useState(false);
    const [endingMeeting, setEndingMeeting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const assigneeBoxRef = useRef<HTMLDivElement>(null);
    const reviewerBoxRef = useRef<HTMLDivElement>(null);
    const downloadMenuRef = useRef<HTMLDivElement>(null);

    // Edit Meeting Notes state
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notesText, setNotesText] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    // Discussion Chat drawer state
    const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Target Date Update Modal state
    const [targetDateModalPoint, setTargetDateModalPoint] = useState<any | null>(null);
    const [newTargetDate, setNewTargetDate] = useState('');
    const [targetDateReason, setTargetDateReason] = useState('');
    const [savingTargetDate, setSavingTargetDate] = useState(false);

    const socketRef = useRef<any>(null);

    // Close searchable dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (assigneeBoxRef.current && !assigneeBoxRef.current.contains(e.target as Node)) {
                setIsAssigneeDropdownOpen(false);
            }
            if (reviewerBoxRef.current && !reviewerBoxRef.current.contains(e.target as Node)) {
                setIsReviewerDropdownOpen(false);
            }
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
                setIsDownloadMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchMeetingDetails = useCallback(async () => {
        const meetingId = meeting?.id || initialMeeting?.id;
        if (!meetingId) return;

        try {
            const res = await apiClient.get(`/mom/details/${meetingId}`, undefined, { withAuth: true });
            if (res.success) {
                const data = res.data || res.meeting;
                setMeeting(data);
                setNotesText(data.description || data.meeting_notes || '');
            }
        } catch (err: any) {
            console.error('Error fetching meeting details:', err);
        }
    }, [meeting?.id, initialMeeting?.id]);

    // Auto-capture attendance in background when user lands on meeting
    useEffect(() => {
        const meetingId = meeting?.id || initialMeeting?.id;
        if (meetingId) {
            apiClient.put('/mom/attendee/status', {
                meeting_id: meetingId,
                status: 'attended'
            }, { withAuth: true }).catch(() => {});
        }
    }, [meeting?.id, initialMeeting?.id]);

    // WebSocket real-time updates
    useEffect(() => {
        const meetingId = meeting?.id || initialMeeting?.id;
        if (!meetingId) return;

        const socket = getSocket();
        socketRef.current = socket;

        if (socket) {
            socket.emit('join_meeting', meetingId);

            socket.on('point_added', (point: any) => {
                setMeeting((prev: any) => {
                    if (!prev) return prev;
                    const existing = (prev.points || []).find((p: any) => p.id === point.id);
                    if (existing) return prev;
                    return { ...prev, points: [point, ...(prev.points || [])] };
                });
            });

            socket.on('point_updated', (updatedPoint: any) => {
                setMeeting((prev: any) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        points: (prev.points || []).map((p: any) => p.id === updatedPoint.id ? { ...p, ...updatedPoint } : p)
                    };
                });
            });

            socket.on('point_deleted', ({ point_id }: { point_id: number }) => {
                setMeeting((prev: any) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        points: (prev.points || []).filter((p: any) => p.id !== point_id)
                    };
                });
            });

            socket.on('meeting_started', () => {
                fetchMeetingDetails();
            });

            socket.on('meeting_completed', () => {
                fetchMeetingDetails();
            });
        }

        return () => {
            if (socket) {
                socket.emit('leave_meeting', meetingId);
                socket.off('point_added');
                socket.off('point_updated');
                socket.off('point_deleted');
                socket.off('meeting_started');
                socket.off('meeting_completed');
            }
        };
    }, [meeting?.id, initialMeeting?.id, fetchMeetingDetails]);

    // Initial load
    useEffect(() => {
        fetchMeetingDetails();
        if (initialMeeting) {
            setNotesText(initialMeeting.description || initialMeeting.meeting_notes || '');
        }
    }, [fetchMeetingDetails, initialMeeting]);

    // Fetch org employees for assignee & reviewer picker
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await apiClient.get('/organization/employees?format=paginated&limit=1000', undefined, { withAuth: true });
                const raw = (res as any).data || (res as any).items || [];
                setEmployeesList(Array.isArray(raw) ? raw : []);
            } catch (e) {
                console.error('Error fetching employees:', e);
            }
        };
        fetchEmployees();
    }, []);

    // Format IST Date & Time
    const formatToIST = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return dateStr;
        }
    };

    // Meeting Lifecycle Actions
    const handleStartMeeting = async () => {
        try {
            const res = await apiClient.put(`/mom/start/${meeting.id}`, {}, { withAuth: true });
            if (res.success) {
                toast.success('Meeting started');
                fetchMeetingDetails();
            }
        } catch (e: any) {
            toast.error(e.message || 'Failed to start meeting');
        }
    };

    const handleCompleteMeeting = () => {
        setShowEndMeetingModal(true);
    };

    const confirmEndMeeting = async () => {
        setEndingMeeting(true);
        try {
            const res = await apiClient.post(`/mom/meeting/${meeting.id}/complete`, {}, { withAuth: true });
            if (res.success) {
                toast.success('Meeting finalized & completed');
                setShowEndMeetingModal(false);
                fetchMeetingDetails();
            }
        } catch (e: any) {
            toast.error(e.message || 'Failed to complete meeting');
        } finally {
            setEndingMeeting(false);
        }
    };

    const handleReopenMeeting = async () => {
        try {
            const res = await apiClient.put(`/mom/reopen/${meeting.id}`, {}, { withAuth: true });
            if (res.success) {
                toast.success('Meeting reopened');
                fetchMeetingDetails();
            }
        } catch (e: any) {
            toast.error(e.message || 'Failed to reopen meeting');
        }
    };

    const handleDownloadMinutes = async (format: 'pdf' | 'docx') => {
        try {
            toast.loading(`Generating ${format.toUpperCase()} MoM...`, { id: 'download-mom' });
            const blob = await apiClient<Blob>(`/mom/meetings/${meeting.id}/export?format=${format}`, {
                responseType: 'blob',
                withAuth: true
            });

            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `MoM-${meeting.title ? meeting.title.replace(/[^a-z0-9]/gi, '_') : 'Meeting'}.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            toast.success(`Downloaded ${format.toUpperCase()} successfully`, { id: 'download-mom' });
        } catch (err: any) {
            toast.error(err.message || 'Download failed', { id: 'download-mom' });
        }
    };

    // Handle File Selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setAttachments(prev => [...prev, ...files]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Quick Add Action Point
    const handleAddPoint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pointText.trim()) {
            toast.error('Please enter point description');
            return;
        }

        try {
            setSubmittingPoint(true);
            const formData = new FormData();
            formData.append('meeting_id', String(meeting.id));
            formData.append('point_text', pointText.trim());
            formData.append('priority', priority);
            formData.append('assign_mode', selectedAssignee.type);

            if (selectedAssignee.type === 'none') {
                formData.append('is_task', 'false');
                formData.append('kind', 'notice');
            } else {
                formData.append('is_task', 'true');
                formData.append('kind', 'action');
                if (dueDate) formData.append('due_date', dueDate);

                if (selectedAssignee.type === 'employee' && selectedAssignee.id) {
                    formData.append('assignments', JSON.stringify([{
                        id: Number(selectedAssignee.id),
                        type: 'employee',
                        name: selectedAssignee.name
                    }]));
                }
            }

            if (reviewerId) {
                formData.append('reviewer_id', reviewerId);
            }

            if (attachments.length > 0) {
                attachments.forEach(file => formData.append('attachments', file));
            }

            const res = await apiClient.post('/mom/point/add', formData, { withAuth: true });
            if (res.success) {
                toast.success('Point added successfully');
                setPointText('');
                setDueDate('');
                setPriority('medium');
                setSelectedAssignee({ id: '', name: 'Select Assignee...', type: 'none' });
                setAssigneeSearchQuery('');
                setReviewerId('');
                setReviewerSearchQuery('');
                setAttachments([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
                fetchMeetingDetails();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to add point');
        } finally {
            setSubmittingPoint(false);
        }
    };

    // Point Status Toggle (open -> done -> open)
    const handleTogglePointStatus = async (point: any) => {
        const currentStatus = (point.lifecycle_status || point.status || 'open').toLowerCase();
        const isClosed = ['closed', 'completed', 'done', 'approved'].includes(currentStatus);
        const targetState = isClosed ? 'open' : 'done';

        try {
            const res = await apiClient.post(`/mom/points/${point.id}/transition`, { to: targetState }, { withAuth: true });
            if (res.success) {
                toast.success(targetState === 'done' ? 'Completed' : 'Reopened');
                fetchMeetingDetails();
                onStatusUpdate?.(point.id, targetState);
            } else {
                toast.error(res.message || res.error || 'Failed to update status');
            }
        } catch (e: any) {
            toast.error(e.message || 'Failed to update status');
        }
    };

    const handleAcknowledgePoint = async (pointId: number) => {
        try {
            const res = await apiClient.put(`/mom/point/acknowledge/${pointId}`, {}, { withAuth: true });
            if (res?.success) {
                toast.success('Point acknowledged');
                fetchMeetingDetails();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to acknowledge');
        }
    };

    const handleMarkPointDone = async (pointId: number) => {
        try {
            const res = await apiClient.put(`/mom/point/complete/${pointId}`, {}, { withAuth: true });
            if (res?.success) {
                toast.success('Point marked as completed');
                fetchMeetingDetails();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to mark done');
        }
    };

    const handleApprovePoint = async (pointId: number) => {
        try {
            const res = await apiClient.put(`/mom/point/approve/${pointId}`, {}, { withAuth: true });
            if (res?.success) {
                toast.success('Point approved & closed ✓');
                fetchMeetingDetails();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to approve point');
        }
    };

    // Target Date Handlers (Mandatory Reason)
    const handleOpenTargetDateModal = (point: any) => {
        setTargetDateModalPoint(point);
        setNewTargetDate(point.due_date ? String(point.due_date).split('T')[0] : '');
        setTargetDateReason('');
    };

    const handleSaveTargetDate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetDateModalPoint) return;
        if (!targetDateReason.trim()) {
            toast.error('Please provide a reason for updating the target date');
            return;
        }
        setSavingTargetDate(true);
        try {
            const res = await apiClient.patch(`/mom/point/due-date/${targetDateModalPoint.id}`, {
                due_date: newTargetDate || null,
                reason: targetDateReason.trim(),
            }, { withAuth: true });
            if (res?.success) {
                toast.success('Target date updated');
                setMeeting((prev: any) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        points: (prev.points || []).map((p: any) =>
                            p.id === targetDateModalPoint.id ? { ...p, due_date: newTargetDate || null } : p
                        )
                    };
                });
                setTargetDateModalPoint(null);
            } else {
                toast.error(res?.message || 'Failed to update target date');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update target date');
        } finally {
            setSavingTargetDate(false);
        }
    };

    // Delete Point
    const handleDeletePoint = async (pointId: number) => {
        if (!window.confirm('Delete this point?')) return;
        try {
            const res = await apiClient.delete(`/mom/point/delete/${pointId}`, { withAuth: true });
            if (res.success) {
                toast.success('Point deleted');
                fetchMeetingDetails();
            }
        } catch (e: any) {
            toast.error(e.message || 'Failed to delete point');
        }
    };

    // Save Meeting Notes / Minutes
    const handleSaveNotes = async () => {
        try {
            setSavingNotes(true);
            const res = await apiClient.put(`/mom/edit/${meeting.id}`, {
                title: meeting.title,
                meeting_notes: notesText,
                description: notesText
            }, { withAuth: true });

            if (res.success) {
                toast.success('Meeting notes saved');
                setIsEditingNotes(false);
                fetchMeetingDetails();
            }
        } catch (e: any) {
            toast.error(e.message || 'Failed to save notes');
        } finally {
            setSavingNotes(false);
        }
    };

    // Filtered Points
    const points = meeting?.points || [];
    const filteredPoints = useMemo(() => {
        return points.filter((p: any) => {
            const status = (p.lifecycle_status || p.status || 'open').toLowerCase();
            const isCompleted = ['completed', 'closed', 'done', 'approved'].includes(status);

            if (activeFilter === 'open' && isCompleted) return false;
            if (activeFilter === 'completed' && !isCompleted) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const text = (p.point_text || '').toLowerCase();
                return text.includes(q);
            }
            return true;
        });
    }, [points, activeFilter, searchQuery]);

    const isCreator = meeting?.created_by && currentEmployeeId && Number(meeting.created_by) === Number(currentEmployeeId);
    const canManageMeeting = isOrgAdmin || isCreator;
    const isMeetingCompleted = meeting?.status === 'completed';

    // Filtered Employee list for comboboxes (200+ employees support)
    const filteredAssignees = useMemo(() => {
        if (!assigneeSearchQuery.trim()) return employeesList.slice(0, 50);
        const q = assigneeSearchQuery.toLowerCase();
        return employeesList.filter(e => {
            const name = [e.name, e.first_name, e.last_name].filter(Boolean).join(' ').toLowerCase();
            const dept = (e.department_name || '').toLowerCase();
            return name.includes(q) || dept.includes(q);
        }).slice(0, 50);
    }, [employeesList, assigneeSearchQuery]);

    const filteredReviewers = useMemo(() => {
        if (!reviewerSearchQuery.trim()) return employeesList.slice(0, 50);
        const q = reviewerSearchQuery.toLowerCase();
        return employeesList.filter(e => {
            const name = [e.name, e.first_name, e.last_name].filter(Boolean).join(' ').toLowerCase();
            const dept = (e.department_name || '').toLowerCase();
            return name.includes(q) || dept.includes(q);
        }).slice(0, 50);
    }, [employeesList, reviewerSearchQuery]);

    const selectedReviewerName = useMemo(() => {
        if (!reviewerId) return 'Default (You)';
        const emp = employeesList.find(e => String(e.id) === String(reviewerId));
        return emp ? (emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()) : 'Default (You)';
    }, [employeesList, reviewerId]);

    return (
        <div className="min-h-screen bg-[#F8F9FC] font-sans p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
            {/* ── Top Header & Control Bar ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-xs">
                <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-2.5">
                    {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={idx}>
                            {crumb.href ? (
                                <Link href={crumb.href} className="hover:text-blue-600 transition-colors font-medium">
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className="text-gray-900 font-bold truncate max-w-[200px]">{crumb.label}</span>
                            )}
                            {idx < breadcrumbs.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                        </React.Fragment>
                    ))}
                </nav>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-xl font-bold text-gray-900">{meeting.title}</h1>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                                isMeetingCompleted
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : meeting.status === 'in_progress'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                                {meeting.status === 'in_progress' ? 'In Progress' : meeting.status === 'completed' ? 'Completed' : (meeting.status || 'Scheduled')}
                            </span>
                            {isMeetingCompleted && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                    <Lock className="w-2.5 h-2.5 text-gray-500" />
                                    <span>Locked</span>
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium pt-0.5">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span>{formatToIST(meeting.meeting_date).split(',')[0]}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>{formatToIST(meeting.meeting_date).split(',')[1]}</span>
                                {meeting.end_time && <span> - {formatToIST(meeting.end_time).split(',')[1]}</span>}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                <span>{meeting.location || 'Virtual / Head Office'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Download MoM Dropdown (PDF / DOCX) */}
                        <div className="relative" ref={downloadMenuRef}>
                            <button
                                type="button"
                                onClick={() => setIsDownloadMenuOpen(prev => !prev)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-xs font-bold transition-colors shadow-2xs"
                            >
                                <Download className="w-3.5 h-3.5 text-gray-600" />
                                <span>Download MoM</span>
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                            </button>

                            {isDownloadMenuOpen && (
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-1 space-y-0.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDownloadMenuOpen(false);
                                            handleDownloadMinutes('pdf');
                                        }}
                                        className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 rounded flex items-center gap-2 transition-colors"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-red-500" />
                                        <span>Download as PDF</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDownloadMenuOpen(false);
                                            handleDownloadMinutes('docx');
                                        }}
                                        className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded flex items-center gap-2 transition-colors"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                                        <span>Download as DOCX</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Start Meeting Button (if scheduled) */}
                        {canManageMeeting && meeting.status === 'scheduled' && (
                            <button
                                onClick={handleStartMeeting}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-all shadow-xs"
                            >
                                <Play className="w-3.5 h-3.5" />
                                <span>Start Meeting</span>
                            </button>
                        )}

                        {/* End Meeting Button (visible whenever meeting is not yet completed) */}
                        {!isMeetingCompleted && (
                            <button
                                onClick={handleCompleteMeeting}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition-all shadow-xs"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>End Meeting</span>
                            </button>
                        )}

                        {/* Reopen Meeting Button (if completed) */}
                        {isOrgAdmin && isMeetingCompleted && (
                            <button
                                onClick={handleReopenMeeting}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-xs font-bold transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reopen Meeting</span>
                            </button>
                        )}

                        {onEdit && canManageMeeting && !isMeetingCompleted && (
                            <button
                                onClick={onEdit}
                                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-xs font-semibold transition-colors"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Details</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Meeting Agenda & Notes Card ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <h2 className="text-sm font-bold text-gray-900">Agenda & Notes</h2>
                    </div>
                    {!isEditingNotes ? (
                        canManageMeeting && !isMeetingCompleted && (
                            <button
                                onClick={() => setIsEditingNotes(true)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Notes</span>
                            </button>
                        )
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsEditingNotes(false)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveNotes}
                                disabled={savingNotes}
                                className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700"
                            >
                                {savingNotes ? 'Saving...' : 'Save Notes'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="pt-2 text-xs text-gray-700">
                    {isEditingNotes ? (
                        <textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            placeholder="Write meeting agenda, discussion highlights, and key decisions..."
                            className="w-full min-h-[80px] p-3 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 bg-gray-50/50"
                        />
                    ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">
                            {notesText || <span className="text-gray-400 italic">No notes or agenda recorded yet.</span>}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Meeting Points Section ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-blue-600" />
                        <h2 className="text-sm font-bold text-gray-900">Meeting Points</h2>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                            {points.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md text-xs font-semibold text-gray-600 self-start">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-3 py-1 rounded transition-all ${activeFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'hover:text-gray-900'}`}
                        >
                            All ({points.length})
                        </button>
                        <button
                            onClick={() => setActiveFilter('open')}
                            className={`px-3 py-1 rounded transition-all ${activeFilter === 'open' ? 'bg-white text-gray-900 shadow-xs' : 'hover:text-gray-900'}`}
                        >
                            Open ({points.filter((p: any) => !['completed', 'closed', 'done', 'approved'].includes((p.lifecycle_status || p.status || '').toLowerCase())).length})
                        </button>
                        <button
                            onClick={() => setActiveFilter('completed')}
                            className={`px-3 py-1 rounded transition-all ${activeFilter === 'completed' ? 'bg-white text-gray-900 shadow-xs' : 'hover:text-gray-900'}`}
                        >
                            Completed ({points.filter((p: any) => ['completed', 'closed', 'done', 'approved'].includes((p.lifecycle_status || p.status || '').toLowerCase())).length})
                        </button>
                    </div>
                </div>

                {/* ── Completed Meeting Lock Banner (if non-admin) ── */}
                {isMeetingCompleted && !isOrgAdmin ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 text-xs font-semibold text-amber-800">
                        <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>This meeting is finalized and locked. Only an Admin can add or delete points.</span>
                    </div>
                ) : (
                    /* ── Clean Action Point Composer (No extra buttons or cluttered selection) ── */
                    <form onSubmit={handleAddPoint} className="bg-gray-50/70 rounded-lg border border-gray-200 p-3.5 space-y-3">
                        <input
                            type="text"
                            placeholder="Type action point or discussion item (Press Enter to add)..."
                            value={pointText}
                            onChange={(e) => setPointText(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        />

                        {/* Dropdowns Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                            {/* Searchable Assignee Picker (All/None/Specific in one clean dropdown) */}
                            <div className="relative" ref={assigneeBoxRef}>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                    Assigned To
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsAssigneeDropdownOpen(prev => !prev)}
                                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-800 flex items-center justify-between text-left focus:ring-1 focus:ring-blue-500"
                                >
                                    <span className="truncate">{selectedAssignee.name}</span>
                                    <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
                                </button>

                                {isAssigneeDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-1.5 space-y-1">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="Search employee..."
                                                value={assigneeSearchQuery}
                                                onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                                                className="w-full pl-8 pr-2.5 py-1 text-xs border border-gray-200 rounded bg-gray-50 focus:outline-none focus:bg-white"
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                                            {/* General Options */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedAssignee({ id: '', name: 'No Assignee (General)', type: 'none' });
                                                    setIsAssigneeDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-2 py-1.5 hover:bg-gray-100 rounded text-xs font-semibold text-gray-600"
                                            >
                                                No Assignee (General)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedAssignee({ id: 'all', name: 'All Attendees / Staff', type: 'all' });
                                                    setIsAssigneeDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-2 py-1.5 hover:bg-blue-50 rounded text-xs font-semibold text-blue-700"
                                            >
                                                All Attendees / Staff
                                            </button>

                                            {/* Employee List */}
                                            {filteredAssignees.map(emp => (
                                                <button
                                                    key={emp.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const name = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                                                        setSelectedAssignee({ id: String(emp.id), name, type: 'employee' });
                                                        setIsAssigneeDropdownOpen(false);
                                                        setAssigneeSearchQuery('');
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 hover:bg-blue-50 rounded flex items-center justify-between text-xs text-gray-800 font-medium transition-colors"
                                                >
                                                    <span>{emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}</span>
                                                    <span className="text-[10px] text-gray-400">{emp.department_name || 'Staff'}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Searchable Reviewer Picker */}
                            <div className="relative" ref={reviewerBoxRef}>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                    Reviewer
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsReviewerDropdownOpen(prev => !prev)}
                                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-800 flex items-center justify-between text-left focus:ring-1 focus:ring-blue-500"
                                >
                                    <span className="truncate">{selectedReviewerName}</span>
                                    <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
                                </button>

                                {isReviewerDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-1.5 space-y-1">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="Search reviewer..."
                                                value={reviewerSearchQuery}
                                                onChange={(e) => setReviewerSearchQuery(e.target.value)}
                                                className="w-full pl-8 pr-2.5 py-1 text-xs border border-gray-200 rounded bg-gray-50 focus:outline-none focus:bg-white"
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReviewerId('');
                                                    setIsReviewerDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-2 py-1.5 hover:bg-gray-100 rounded text-xs font-bold text-gray-700"
                                            >
                                                Default (You)
                                            </button>
                                            {filteredReviewers.map(emp => (
                                                <button
                                                    key={emp.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setReviewerId(String(emp.id));
                                                        setIsReviewerDropdownOpen(false);
                                                        setReviewerSearchQuery('');
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 hover:bg-blue-50 rounded flex items-center justify-between text-xs text-gray-800 font-medium transition-colors"
                                                >
                                                    <span>{emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}</span>
                                                    <span className="text-[10px] text-gray-400">{emp.department_name || 'Staff'}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Due Date */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-800 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                    Priority
                                </label>
                                <select
                                    value={priority}
                                    onChange={(e: any) => setPriority(e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-800 focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        {/* Attachments & Submit */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-gray-200/70">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="composer-file-upload"
                                />
                                <label
                                    htmlFor="composer-file-upload"
                                    className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
                                >
                                    <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                                    <span>Attach File</span>
                                </label>

                                {attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {attachments.map((file, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 bg-white border border-gray-300 text-gray-700 px-2 py-0.5 rounded text-[11px] font-medium"
                                            >
                                                <span className="truncate max-w-[110px]">{file.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(idx)}
                                                    className="text-gray-400 hover:text-red-600 font-bold ml-0.5"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={submittingPoint}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{submittingPoint ? 'Saving...' : 'Add Point'}</span>
                            </button>
                        </div>
                    </form>
                )}

                {/* ── Points List ── */}
                <div className="space-y-2 pt-1">
                    {filteredPoints.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                            <ListTodo className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-gray-600">No points found</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Use the box above to add meeting action items or notes.</p>
                        </div>
                    ) : (
                        filteredPoints.map((point: any, idx: number) => {
                            const currentStatus = (point.lifecycle_status || point.status || 'open').toLowerCase();
                            const isClosed = ['closed', 'completed', 'done', 'approved'].includes(currentStatus);
                            const assignments = (point.assignments || []).filter((a: any) => a.role !== 'verifier');
                            const pointAttachments = point.attachments || [];

                            // Clean assignee text
                            const assigneeText = assignments.length > 0
                                ? assignments.map((a: any) => a.name || a.assignee_name || `User #${a.id}`).join(', ')
                                : 'No Assignee';

                            const reviewerText = point.reviewer_name || null;
                            const isAssignedToMe = Boolean(
                                (currentEmployeeId && point.assigned_to_id && Number(point.assigned_to_id) === Number(currentEmployeeId)) ||
                                (currentEmployeeId && assignments.some((a: any) => 
                                    (a.state || 'active') !== 'declined' && 
                                    a.role !== 'verifier' && 
                                    a.assignee_type !== 'department' && 
                                    Number(a.assignee_id || a.id) === Number(currentEmployeeId)
                                ))
                            );

                            return (
                                <div
                                    key={point.id}
                                    className={`relative p-3.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                                        isClosed
                                            ? 'bg-gray-50/80 border-gray-200 opacity-80'
                                            : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-xs'
                                    }`}
                                >
                                    {/* Tiny muted timestamp in the corner */}
                                    {point.created_at && (
                                        <div className="absolute top-2.5 right-3 text-[10px] text-gray-400 font-normal">
                                            {formatToIST(point.created_at)}
                                        </div>
                                    )}

                                    {/* Left: Checkbox + Text + Clean Metadata line */}
                                    <div className="flex items-start gap-3 flex-1 min-w-0 pr-16 sm:pr-0">
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePointStatus(point)}
                                            title="Click to toggle Complete / Open"
                                            className={`mt-0.5 w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                                isClosed
                                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                                    : 'border-gray-300 hover:border-emerald-500 text-transparent'
                                            }`}
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                        </button>

                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-gray-400 font-semibold">#{idx + 1}</span>
                                                <p className={`text-xs font-semibold ${isClosed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                                    {point.point_text}
                                                </p>
                                            </div>

                                            {/* Clean Details Line (No clutter, no heavy badges) */}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600 pt-0.5">
                                                <span>
                                                    <span className="text-gray-400 font-medium">Assigned to: </span>
                                                    <span className="font-semibold text-gray-800">{assigneeText}</span>
                                                </span>

                                                {reviewerText && (
                                                    <span>
                                                        <span className="text-gray-400 font-medium">• Reviewer: </span>
                                                        <span className="font-semibold text-gray-800">{reviewerText}</span>
                                                    </span>
                                                )}

                                                <span className="inline-flex items-center gap-1">
                                                    <span className="text-gray-400 font-medium">• Due: </span>
                                                    {point.due_date ? (
                                                        <span className="font-semibold text-gray-800">{point.due_date.split('T')[0]}</span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Not set</span>
                                                    )}
                                                    {!isClosed && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenTargetDateModal(point)}
                                                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                                            title="Update target date (reason required)"
                                                        >
                                                            <Calendar className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </span>

                                                {point.priority && (
                                                    <span>
                                                        <span className="text-gray-400 font-medium">• Priority: </span>
                                                        <span className="font-semibold text-gray-800 capitalize">{point.priority}</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Attachments Display */}
                                            {pointAttachments.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-1.5">
                                                    {pointAttachments.map((att: any, attIdx: number) => {
                                                        const isImg = att.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                                        return (
                                                            <a
                                                                key={attIdx}
                                                                href={att.file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-[10px] font-medium text-gray-700 transition-colors"
                                                            >
                                                                {isImg ? (
                                                                    <ImageIcon className="w-3 h-3 text-blue-600" />
                                                                ) : (
                                                                    <FileText className="w-3 h-3 text-amber-600" />
                                                                )}
                                                                <span className="truncate max-w-[130px]">{att.file_name || 'Attachment'}</span>
                                                                <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Actions: Workflow buttons + Reschedule + Discussion Chat + Delete */}
                                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center mt-2 sm:mt-0">
                                        {/* Status Workflow Action Buttons */}
                                        {!isClosed && (
                                            <>
                                                {(currentStatus === 'open' || currentStatus === 'planned') && isAssignedToMe && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAcknowledgePoint(point.id)}
                                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-all shadow-xs"
                                                    >
                                                        Acknowledge
                                                    </button>
                                                )}

                                                {(currentStatus === 'acknowledged' || currentStatus === 'in_progress') && isAssignedToMe && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMarkPointDone(point.id)}
                                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all shadow-xs"
                                                    >
                                                        Mark Done
                                                    </button>
                                                )}

                                                {(currentStatus === 'submitted' || currentStatus === 'completed') && (canManageMeeting || Number(point.reviewer_id) === Number(currentEmployeeId)) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApprovePoint(point.id)}
                                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all shadow-xs"
                                                    >
                                                        Approve
                                                    </button>
                                                )}

                                                {/* Reschedule / Set Target Date Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenTargetDateModal(point)}
                                                    title={point.due_date ? 'Reschedule target date (reason required)' : 'Set target date (reason required)'}
                                                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-gray-200 rounded-md text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
                                                >
                                                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                                    <span>{point.due_date ? 'Reschedule' : 'Set Target'}</span>
                                                </button>
                                            </>
                                        )}
                                        {isClosed && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                <Check className="w-3 h-3" />
                                                <span>Done</span>
                                            </span>
                                        )}

                                        <button
                                            onClick={() => {
                                                setSelectedPointId(point.id);
                                                setIsChatOpen(true);
                                            }}
                                            className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-md text-xs font-semibold text-gray-700 transition-colors"
                                            title="Open discussion thread"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            <span>Chat</span>
                                        </button>

                                        {(!isMeetingCompleted || isOrgAdmin) && (canManageMeeting || Number(point.created_by) === Number(currentEmployeeId)) && (
                                            <button
                                                onClick={() => handleDeletePoint(point.id)}
                                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete point"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Modern End Meeting Confirmation Modal ── */}
            {showEndMeetingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full p-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                            <AlertCircle className="w-6 h-6" />
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-gray-900">End & Finalize Meeting?</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Ending this meeting will finalize the minutes and lock all action points against post-meeting edits.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 text-left border border-gray-100 space-y-1.5 text-xs">
                            <div className="flex justify-between text-gray-600">
                                <span className="font-medium">Meeting:</span>
                                <span className="font-semibold text-gray-900 truncate max-w-[200px]">{meeting.title}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span className="font-medium">Action Items:</span>
                                <span className="font-semibold text-gray-900">{points.length} recorded</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowEndMeetingModal(false)}
                                disabled={endingMeeting}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmEndMeeting}
                                disabled={endingMeeting}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5"
                            >
                                {endingMeeting ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Finalizing...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Yes, End Meeting</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Target Date Reason Modal (Mandatory Reason) ── */}
            {targetDateModalPoint && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <span>Update Target Date</span>
                            </h3>
                            <button
                                onClick={() => setTargetDateModalPoint(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTargetDate} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-gray-700 font-semibold mb-1">Action Point</label>
                                <p className="text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200 font-medium">
                                    {targetDateModalPoint.point_text}
                                </p>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-semibold mb-1">New Target Date</label>
                                <input
                                    type="date"
                                    value={newTargetDate}
                                    onChange={(e) => setNewTargetDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-semibold mb-1">
                                    Reason for Date Change <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={targetDateReason}
                                    onChange={(e) => setTargetDateReason(e.target.value)}
                                    rows={3}
                                    placeholder="Explain why the target date is changing (required)..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setTargetDateModalPoint(null)}
                                    disabled={savingTargetDate}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingTargetDate || !targetDateReason.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {savingTargetDate ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Save Target Date</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Slide-Over Discussion Thread Drawer ── */}
            {isChatOpen && selectedPointId && (
                <ActionItemChat
                    isOpen={isChatOpen}
                    onClose={() => {
                        setIsChatOpen(false);
                        setSelectedPointId(null);
                    }}
                    pointId={selectedPointId}
                />
            )}
        </div>
    );
}