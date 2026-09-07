"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import {
    Search,
    Filter,
    Loader2,
    MapPin,
    Clock,
    Plus,
    X,
    AlertCircle,
    Users,
    CheckCircle2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Edit2,
    Trash2,
    Eye,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    CheckSquare,
    Layers,
    ListTodo,
    Download,
    FileText
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface MomMeetingListProps {
    basePath: string;
}

function useCountUp(target: number, duration = 600) {
    const [v, setV] = useState(0);

    useEffect(() => {
        let raf: number;
        const start = performance.now();
        const step = (ts: number) => {
            const p = Math.min((ts - start) / duration, 1);
            setV(Math.floor(p * (Number.isFinite(target) ? target : 0)));
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => { if (raf) cancelAnimationFrame(raf); };
    }, [target, duration]);
    return v;
}

export default function MomMeetingList({ basePath }: MomMeetingListProps) {
    const { user, role, employee } = useAuth();
    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const hasPerm = (code: string | string[]) => {
        if (isOrgAdmin) return true;
        const perms = (employee?.permissions || []);
        const check = (c: string) => perms.some((p: any) => (p || "").toUpperCase() === String(c).toUpperCase());
        if (Array.isArray(code)) return code.some(check);
        return check(code as string);
    };
    const isHRMode = hasPerm("HR_MODE");

    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSite, setFilterSite] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

    // Summary counts for KPI cards
    const [summary, setSummary] = useState<any>(null);

    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [downloadMeetingId, setDownloadMeetingId] = useState<number | null>(null);

    const handleDownloadMeeting = async (meeting: any, format: 'pdf' | 'docx') => {
        try {
            toast.loading(`Preparing ${format.toUpperCase()}...`, { id: 'download-mom-list' });
            const blob = await apiClient<Blob>(`/mom/meetings/${meeting.id}/export?format=${format}`, {
                responseType: 'blob',
                withAuth: true
            });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `MoM-${(meeting.title || 'Meeting').replace(/[^a-z0-9]/gi, '_')}.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            toast.success(`Downloaded ${format.toUpperCase()}`, { id: 'download-mom-list' });
        } catch (err: any) {
            toast.error(err.message || 'Download failed', { id: 'download-mom-list' });
        }
    };

    // Open modal if ?create=1
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (new URLSearchParams(window.location.search).get('create') === '1') {
            setIsCreateModalOpen(true);
        }
    }, []);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null);
    const [showMoreOptions, setShowMoreOptions] = useState(false);

    // Form State
    const [meetingData, setMeetingData] = useState({
        title: '',
        description: '',
        meeting_notes: '',
        meeting_date: '',
        end_time: '',
        locations: [] as any[], // store array of {id, name}
        attendees: [] as any[],
        points: [] as any[],
        department_ids: [] as number[]
    });

    const [employees, setEmployees] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);
    const [attendeeSearch, setAttendeeSearch] = useState('');

    const fetchSummary = useCallback(async () => {
        try {
            const res: any = await apiClient.get('/mom/overview/summary');
            if (res?.success) {
                setSummary(res.summary);
            }
        } catch {
            // Ignore if endpoint fails
        }
    }, []);

    const fetchSites = async () => {
        try {
            const shouldFetchAssignedOnly = !isOrgAdmin && !isHRMode;
            const params: any = { format: 'paginated', limit: 1000 };
            if (shouldFetchAssignedOnly) params.assigned_only = '1';

            const res = await apiClient.get('/sites', params);
            setSites(res.sites || []);
        } catch (e) {
            console.error('Error fetching sites:', e);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await apiClient.get('/organization/employees', { format: 'paginated', limit: 1000 });
            const raw = (res as any).data || (res as any).items || [];
            setEmployees(Array.isArray(raw) ? raw : []);
        } catch (e) {
            console.error('Error fetching employees:', e);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await apiClient.get('/organization/departments');
            setAvailableDepartments(Array.isArray(res) ? res : []);
        } catch (e) {
            console.error('Error fetching departments:', e);
        }
    };

    const fetchMeetings = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pageSize.toString(),
                ...(searchTerm && { search: searchTerm }),
                ...(filterSite && { site: filterSite }),
                ...(filterDate && { date: filterDate })
            });

            const res = await apiClient.get(`/mom/list?${params.toString()}`);
            if (res.success) {
                setMeetings(res.meetings || []);
                if (res.pagination) {
                    setPagination(res.pagination);
                }
            }
        } catch (error) {
            console.error('Error fetching meetings:', error);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchTerm, filterSite, filterDate]);

    useEffect(() => {
        fetchMeetings();
        fetchSummary();
        fetchEmployees();
        fetchSites();
        fetchDepartments();
    }, [fetchMeetings, fetchSummary]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page === 1) fetchMeetings();
            else setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const formatToIST = (utcDateString: string) => {
        if (!utcDateString) return 'N/A';
        try {
            const date = new Date(utcDateString);
            return date.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return utcDateString;
        }
    };

    const addAttendee = (emp: any) => {
        if (!meetingData.attendees.find(a => a.employee_id === emp.id)) {
            setMeetingData(prev => ({
                ...prev,
                attendees: [...prev.attendees, { employee_id: emp.id, name: emp.name || (emp.first_name ? (emp.first_name + ' ' + (emp.last_name || '')) : 'Unknown'), role: 'attendee' }]
            }));
        }
        setAttendeeSearch('');
    };

    const handleEdit = async (meeting: any) => {
        try {
            setLoading(true);
            const res = await apiClient.get(`/mom/details/${meeting.id}`);
            if (res.success) {
                const fullMeeting = res.meeting;
                setEditingMeetingId(fullMeeting.id);

                const formatDateForInput = (dateStr: string) => {
                    if (!dateStr) return '';
                    const d = new Date(dateStr);
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                };

                setMeetingData({
                    title: fullMeeting.title || '',
                    description: fullMeeting.description || '',
                    meeting_notes: fullMeeting.meeting_notes || '',
                    meeting_date: formatDateForInput(fullMeeting.meeting_date),
                    end_time: formatDateForInput(fullMeeting.end_time),
                    // Real site rows, from meeting.sites. This used to split the
                    // free-text `location` string and invent ids (idx + 9999),
                    // which the create/edit payload then sent back as `site_ids`
                    // - so every edit posted site ids that belong to no site.
                    // The fallback keeps the names visible for a meeting saved
                    // before meeting_sites existed, with no id to send back.
                    locations: Array.isArray(fullMeeting.sites) && fullMeeting.sites.length > 0
                        ? fullMeeting.sites.map((site: any) => ({ id: site.id, name: site.name }))
                        : (fullMeeting.location
                            ? fullMeeting.location.split(', ').map((name: string) => ({ id: null, name }))
                            : []),
                    attendees: (fullMeeting.attendees || []).map((a: any) => ({
                        employee_id: a.employee_id,
                        name: a.name || 'Unknown',
                        role: a.role
                    })),
                    points: (fullMeeting.points || []).map((p: any) => ({
                        point_text: p.point_text,
                        assigned_to_type: p.assigned_to_type,
                        assigned_to_id: p.assigned_to_id,
                        due_date: p.due_date,
                        priority: p.priority
                    })),
                    department_ids: (res.departments || []).map((d: any) => d.id)
                });
                setIsCreateModalOpen(true);
            }
        } catch (err: any) {
            toast.error('Failed to load meeting details: ' + (err.message || 'Error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this meeting? This cannot be undone.')) return;

        try {
            const res = await apiClient.delete(`/mom/delete/${id}`);
            if (res.success) {
                toast.success('Meeting deleted successfully');
                fetchMeetings();
                fetchSummary();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete meeting');
        }
    };

    const removeAttendee = (id: number) => {
        setMeetingData(prev => ({
            ...prev,
            attendees: prev.attendees.filter(a => a.employee_id !== id)
        }));
    };

    useEffect(() => {
        if (!isCreateModalOpen) { setShowMoreOptions(false); return; }
        if (editingMeetingId) { setShowMoreOptions(true); return; }
        setMeetingData(prev => {
            if (prev.meeting_date) return prev;
            const now = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
            return { ...prev, meeting_date: local };
        });
    }, [isCreateModalOpen, editingMeetingId]);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!meetingData.title || !meetingData.meeting_date) {
            setError('Please fill in required fields (Title and Start Time)');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                ...meetingData,
                meeting_date: meetingData.meeting_date ? new Date(meetingData.meeting_date).toISOString() : '',
                end_time: meetingData.end_time ? new Date(meetingData.end_time).toISOString() : null,
                location: meetingData.locations.map(l => l.name).join(', '),
                // Only rows that carry a real site id. A name recovered from
                // the old free-text `location` has none, and sending it would
                // write a meeting_sites row pointing at nothing.
                site_id: meetingData.locations.find(l => l.id != null)?.id ?? null,
                site_ids: meetingData.locations.map(l => l.id).filter(id => id != null)
            };

            const url = editingMeetingId ? `/mom/edit/${editingMeetingId}` : '/mom/create';
            const method = editingMeetingId ? 'put' : 'post';

            const res = await (apiClient as any)[method](url, payload);
            if (res.success) {
                toast.success(editingMeetingId ? 'Meeting updated' : 'Meeting created');
                setIsCreateModalOpen(false);
                setEditingMeetingId(null);
                setMeetingData({
                    title: '',
                    description: '',
                    meeting_notes: '',
                    meeting_date: '',
                    end_time: '',
                    locations: [],
                    attendees: [],
                    points: [],
                    department_ids: []
                });
                fetchMeetings();
                fetchSummary();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save meeting');
        } finally {
            setSubmitting(false);
        }
    };

    // Animated numbers
    const totalMeetingsCount = summary?.total_meetings ?? pagination.total ?? meetings.length;
    const animTotalMeetings = useCountUp(totalMeetingsCount);
    const animUpcoming = useCountUp(summary?.upcoming_meetings ?? meetings.filter(m => (m.status || '').toLowerCase() === 'scheduled').length);
    const animCompleted = useCountUp(meetings.filter(m => (m.status || '').toLowerCase() === 'completed').length);
    const animPoints = useCountUp(summary?.open_points ?? meetings.reduce((acc, m) => acc + (Number(m.total_points) || 0), 0));

    const totalPages = Math.max(1, pagination.totalPages || Math.ceil((pagination.total || 1) / pageSize));

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 font-sans">
            {/* ── Top Header Control Bar (LeaveRequests / MomDashboard style) ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-2 sm:p-3 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Title */}
                    <div className="flex items-center space-x-3">
                        <h1 className="text-xl font-bold text-gray-900">Meetings</h1>
                    </div>

                    {/* Quick Filters & Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Live Search */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search meetings, agenda..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm w-48 sm:w-60 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Site Filter Dropdown */}
                        {sites.length > 0 && (
                            <select
                                value={filterSite}
                                onChange={(e) => {
                                    setFilterSite(e.target.value);
                                    setPage(1);
                                }}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 bg-white max-w-[150px] truncate font-medium text-gray-700"
                            >
                                <option value="">All Sites</option>
                                {sites.map(s => (
                                    <option key={s.id} value={s.id}>{s.name || `Site #${s.id}`}</option>
                                ))}
                            </select>
                        )}

                        {/* Refresh Button */}
                        <button
                            onClick={() => {
                                fetchMeetings();
                                fetchSummary();
                                toast.success('Meetings refreshed');
                            }}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
                            title="Refresh meetings"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>

                        {/* Filter Collapsible Toggle */}
                        <button
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filters</span>
                            {filtersExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {/* Create Meeting Button */}
                        <button
                            onClick={() => {
                                setEditingMeetingId(null);
                                setMeetingData({
                                    title: '',
                                    description: '',
                                    meeting_notes: '',
                                    meeting_date: '',
                                    end_time: '',
                                    locations: [],
                                    attendees: [],
                                    points: [],
                                    department_ids: []
                                });
                                setIsCreateModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Meeting</span>
                        </button>
                    </div>
                </div>

                {/* Collapsible Date Filter */}
                {filtersExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-center gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Filter by Date</label>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => {
                                    setFilterDate(e.target.value);
                                    setPage(1);
                                }}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {(filterDate || filterSite || searchTerm) && (
                            <div className="flex items-end self-end">
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterSite('');
                                        setFilterDate('');
                                        setPage(1);
                                    }}
                                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── 4 KPI Summary Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Total Meetings</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{animTotalMeetings}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-xs">
                            <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Scheduled / Upcoming</p>
                            <p className="text-2xl font-bold text-amber-900 mt-1">{animUpcoming}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-xs">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Completed Meetings</p>
                            <p className="text-2xl font-bold text-green-900 mt-1">{animCompleted}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-xs">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-violet-50 rounded-xl p-4 border border-violet-100 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">Action Items Created</p>
                            <p className="text-2xl font-bold text-violet-900 mt-1">{animPoints}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-xs">
                            <ListTodo className="w-5 h-5 text-violet-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Meeting List Table ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Meeting Title</th>
                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Department(s)</th>
                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Action Items</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent animate-spin rounded-full mx-auto mb-2" />
                                        <span className="text-xs font-medium">Loading meetings...</span>
                                    </td>
                                </tr>
                            ) : meetings.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm font-semibold text-gray-800">No meetings found</p>
                                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search term.</p>
                                    </td>
                                </tr>
                            ) : (
                                meetings.map((meeting) => {
                                    const isCreator = meeting.created_by && employee?.id && String(meeting.created_by) === String(employee.id);
                                    const isAllowed = isOrgAdmin || isCreator;

                                    return (
                                        <tr
                                            key={meeting.id}
                                            className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                                        >
                                            {/* Title & Agenda */}
                                            <td className="px-4 py-3.5 max-w-xs">
                                                <Link
                                                    href={`${basePath}/${meeting.id}`}
                                                    className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 text-sm block"
                                                >
                                                    {meeting.title}
                                                </Link>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="font-mono text-[10px] text-gray-400">#{meeting.id}</span>
                                                    {meeting.description && (
                                                        <span className="text-[11px] text-gray-500 truncate max-w-[200px]">
                                                            {meeting.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Date & Time */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="text-xs font-semibold text-gray-800">
                                                    {formatToIST(meeting.meeting_date).split(',')[0]}
                                                </div>
                                                <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span>{formatToIST(meeting.meeting_date).split(',')[1]}</span>
                                                    {meeting.end_time && <span>- {formatToIST(meeting.end_time).split(',')[1]}</span>}
                                                </div>
                                            </td>

                                            {/* Location */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    <span className="truncate max-w-[140px]">{meeting.location || 'Virtual / Head Office'}</span>
                                                </div>
                                            </td>

                                            {/* Department(s) */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-wrap gap-1 max-w-[160px]">
                                                    {meeting.department_names ? meeting.department_names.split(', ').map((d: string, i: number) => (
                                                        <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold border border-gray-200">
                                                            {d}
                                                        </span>
                                                    )) : (
                                                        <span className="text-gray-400 text-[11px] italic">General</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                    meeting.status === 'completed'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : meeting.status === 'in_progress'
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    {meeting.status === 'in_progress' ? 'In Progress' : meeting.status === 'completed' ? 'Completed' : 'Scheduled'}
                                                </span>
                                            </td>

                                            {/* Action Items */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                                        {meeting.total_points || 0} points
                                                    </span>
                                                    {meeting.open_points > 0 && (
                                                        <span className="bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                            {meeting.open_points} open
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Action Buttons */}
                                            <td className="px-4 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Download MoM Dropdown */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDownloadMeetingId(downloadMeetingId === meeting.id ? null : meeting.id);
                                                            }}
                                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                                                            title="Download MoM"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </button>
                                                        {downloadMeetingId === meeting.id && (
                                                            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-1 space-y-0.5 text-left">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDownloadMeetingId(null);
                                                                        handleDownloadMeeting(meeting, 'pdf');
                                                                    }}
                                                                    className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-red-50 hover:text-red-700 rounded flex items-center gap-1.5 transition-colors font-medium"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5 text-red-500" />
                                                                    <span>PDF Format</span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDownloadMeetingId(null);
                                                                        handleDownloadMeeting(meeting, 'docx');
                                                                    }}
                                                                    className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded flex items-center gap-1.5 transition-colors font-medium"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                                                                    <span>DOCX Format</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isAllowed && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEdit(meeting)}
                                                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                                                                title="Edit Meeting"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(meeting.id)}
                                                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                                                                title="Delete Meeting"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <Link
                                                        href={`${basePath}/${meeting.id}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 group-hover:bg-blue-600 group-hover:text-white text-gray-700 font-semibold text-xs transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>View</span>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Standard Pagination Footer (LeaveRequests / MomDashboard style) ── */}
                {pagination.total > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between bg-white border-t border-gray-200 p-3 gap-3">
                        <div className="text-xs text-gray-600">
                            Showing <span className="font-semibold text-gray-900">{((page - 1) * pageSize) + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(page * pageSize, pagination.total)}</span> of <span className="font-semibold text-gray-900">{pagination.total}</span> meetings
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                                <span>Rows:</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="px-2 py-1 border border-gray-300 rounded-lg text-xs bg-white font-medium"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>

                            <div className="flex items-center space-x-1">
                                <button
                                    disabled={page <= 1 || loading}
                                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                    className="px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    <span>Previous</span>
                                </button>

                                <span className="text-xs font-semibold text-gray-700 px-2">
                                    Page {page} of {totalPages}
                                </span>

                                <button
                                    disabled={page >= totalPages || loading}
                                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                    className="px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Create / Edit Meeting Modal ── */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editingMeetingId ? 'Edit Meeting' : 'Create Meeting'}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Schedule a session and define target sites, departments, and agenda.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsCreateModalOpen(false);
                                    setEditingMeetingId(null);
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative space-y-5">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 border border-red-200 flex items-center gap-2 font-semibold text-xs rounded-xl">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-600 mb-1">
                                        Meeting Title *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm text-gray-900"
                                        placeholder="e.g. Weekly Operations Review"
                                        value={meetingData.title}
                                        onChange={e => setMeetingData({ ...meetingData, title: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-600 mb-1">
                                        Site / Location
                                    </label>
                                    {meetingData.locations.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {meetingData.locations.map(loc => (
                                                <div key={loc.id} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs border border-blue-200 font-semibold">
                                                    <span>{loc.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMeetingData(prev => ({ ...prev, locations: prev.locations.filter(l => l.id !== loc.id) }))}
                                                        className="hover:text-blue-900 font-bold ml-1 text-sm"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <select
                                        className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                                        value=""
                                        onChange={e => {
                                            const id = Number(e.target.value);
                                            const site = sites.find(s => s.id === id);
                                            if (site && !meetingData.locations.find(l => l.id === id)) {
                                                setMeetingData(prev => ({ ...prev, locations: [...prev.locations, site] }));
                                            }
                                        }}
                                    >
                                        <option value="">Select / Add Site...</option>
                                        {sites.filter(s => !meetingData.locations.find(l => l.id === s.id)).map(s => (
                                            <option key={s.id} value={s.id}>{s.name || `Site #${s.id}`}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-gray-600 mb-1">
                                            Start Time *
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                                            value={meetingData.meeting_date}
                                            onChange={e => setMeetingData({ ...meetingData, meeting_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-gray-600 mb-1">
                                            End Time
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                                            value={meetingData.end_time}
                                            onChange={e => setMeetingData({ ...meetingData, end_time: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-600 mb-1">
                                        Target Departments
                                    </label>
                                    {meetingData.department_ids.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {meetingData.department_ids.map(id => {
                                                const dept = availableDepartments.find(d => d.id === id);
                                                return (
                                                    <div key={id} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs border border-gray-200 font-semibold">
                                                        <span>{dept?.name || `Dept #${id}`}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setMeetingData(prev => ({ ...prev, department_ids: prev.department_ids.filter(d => d !== id) }))}
                                                            className="hover:text-black font-bold ml-1 text-sm"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <select
                                        className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                                        value=""
                                        onChange={e => {
                                            const id = Number(e.target.value);
                                            if (id && !meetingData.department_ids.includes(id)) {
                                                setMeetingData(prev => ({ ...prev, department_ids: [...prev.department_ids, id] }));
                                            }
                                        }}
                                    >
                                        <option value="">Select / Add Department...</option>
                                        {availableDepartments.filter(d => !meetingData.department_ids.includes(d.id)).map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-4 pt-2 border-t border-gray-100">
                                        <div>
                                            <label className="block text-xs uppercase font-bold text-gray-600 mb-1">
                                                Meeting Agenda / Notes
                                            </label>
                                            <textarea
                                                className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 min-h-[90px]"
                                                placeholder="Outline the meeting agenda and topics to cover..."
                                                value={meetingData.description}
                                                onChange={e => setMeetingData({ ...meetingData, description: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs uppercase font-bold text-gray-600 mb-2 flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" />
                                                <span>Participants</span>
                                            </label>

                                            <div className="relative mb-3">
                                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    className="w-full bg-white border border-gray-300 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Search & select participant..."
                                                    value={attendeeSearch}
                                                    onChange={e => setAttendeeSearch(e.target.value)}
                                                />
                                                {attendeeSearch && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-xl z-50 max-h-40 overflow-y-auto p-1">
                                                        {employees.filter(e => {
                                                            const text = [e.name, e.first_name, e.last_name].filter(Boolean).join(' ');
                                                            return text.toLowerCase().includes(attendeeSearch.toLowerCase());
                                                        }).length > 0 ? (
                                                            employees.filter(e => {
                                                                const text = [e.name, e.first_name, e.last_name].filter(Boolean).join(' ');
                                                                return text.toLowerCase().includes(attendeeSearch.toLowerCase());
                                                            }).map(emp => (
                                                                <button
                                                                    key={emp.id}
                                                                    type="button"
                                                                    onClick={() => addAttendee(emp)}
                                                                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2 rounded-lg text-xs font-semibold text-gray-800 transition-colors"
                                                                >
                                                                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                                        {(emp.name || emp.first_name || 'U')[0].toUpperCase()}
                                                                    </div>
                                                                    <span>{emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}</span>
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="px-3 py-2 text-xs text-gray-400">No participants found</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {meetingData.attendees.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {meetingData.attendees.map(a => (
                                                        <div key={a.employee_id} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-200">
                                                            <span>{a.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeAttendee(a.employee_id)}
                                                                className="hover:text-blue-900 font-bold ml-1"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsCreateModalOpen(false);
                                    setEditingMeetingId(null);
                                }}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-200/60 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateSubmit}
                                disabled={submitting}
                                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold transition-all shadow-sm disabled:opacity-50 text-sm"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                <span>{editingMeetingId ? 'Update Meeting' : 'Create Meeting'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
