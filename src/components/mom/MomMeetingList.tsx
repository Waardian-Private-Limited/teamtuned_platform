"use client";

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import {
    Search,
    Filter,
    Loader2,
    MapPin,
    Tag,
    Clock,
    FileText,
    ChevronRight,
    Plus,
    X,
    AlertCircle,
    Users,
    CheckCircle2,
    LayoutList,
    Calendar,
    ChevronLeft,
    Edit2,
    Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface MomMeetingListProps {
    basePath: string;
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

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null);

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

    useEffect(() => {
        fetchMeetings();
        fetchEmployees();
        fetchSites();
        fetchDepartments();
    }, [page, filterSite, filterDate]); // Re-fetch on pagination or filter change

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page === 1) fetchMeetings();
            else setPage(1); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchMeetings = async () => {
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
    };

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

                // Convert UTC date to local for the datetime-local input
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
                    locations: fullMeeting.location ? fullMeeting.location.split(', ').map((name: string, idx: number) => ({ id: idx + 9999, name })) : [],
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
            alert('Failed to load meeting details: ' + (err.message || 'Error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this meeting? This cannot be undone.')) return;

        try {
            const res = await apiClient.delete(`/mom/delete/${id}`);
            if (res.success) {
                fetchMeetings();
            }
        } catch (err: any) {
            alert(err.message || 'Failed to delete meeting');
        }
    };

    const removeAttendee = (id: number) => {
        setMeetingData(prev => ({
            ...prev,
            attendees: prev.attendees.filter(a => a.employee_id !== id)
        }));
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!meetingData.title || !meetingData.meeting_date) {
            setError('Please fill in required fields (Title and Start Time)');
            return;
        }

        try {
            setSubmitting(true);
            // Convert local input times to UTC ISO strings for backend
            const payload = {
                ...meetingData,
                meeting_date: meetingData.meeting_date ? new Date(meetingData.meeting_date).toISOString() : '',
                end_time: meetingData.end_time ? new Date(meetingData.end_time).toISOString() : null,
                location: meetingData.locations.map(l => l.name).join(', '),
                site_id: meetingData.locations.length > 0 ? meetingData.locations[0].id : null,
                site_ids: meetingData.locations.map(l => l.id)
            };

            const url = editingMeetingId ? `/mom/edit/${editingMeetingId}` : '/mom/create';
            const method = editingMeetingId ? 'put' : 'post';

            const res = await (apiClient as any)[method](url, payload);
            if (res.success) {
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
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create meeting');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredMeetings = meetings; // Backend now handles filtering

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Meeting List</h1>
                    <p className="text-gray-500 mt-1">View and search through all your meetings and action items.</p>
                </div>
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
                    className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-md font-medium hover:bg-gray-800 transition-all shadow-md"
                >
                    <Plus size={20} />
                    <span>Create Meeting</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search meetings or points..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <select
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-all min-w-[150px]"
                            value={filterSite}
                            onChange={(e) => setFilterSite(e.target.value)}
                        >
                            <option value="">All Sites</option>
                            {sites.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        <input
                            type="date"
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-all"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />

                        {(searchTerm || filterSite || filterDate) && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterSite('');
                                    setFilterDate('');
                                    setPage(1);
                                }}
                                className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-1 px-2 whitespace-nowrap"
                            >
                                <X size={14} /> Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Meeting List Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Meeting Title</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location(s)</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department(s)</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action Items</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="animate-spin" size={24} />
                                        <span className="text-sm font-medium">Loading meetings...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredMeetings.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <AlertCircle size={32} strokeWidth={1.5} />
                                        <span className="text-base font-medium">No meetings found matching your criteria.</span>
                                        <button
                                            onClick={() => { setSearchTerm(''); setFilterSite(''); setFilterDate(''); setPage(1); }}
                                            className="text-xs text-black font-bold underline mt-2"
                                        >
                                            Clear all filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredMeetings.length > 0 ? filteredMeetings.map((meeting) => {
                                const isOrgAdmin = role?.toLowerCase() === 'orgadmin';
                                const isCreator = meeting.created_by && employee?.id && String(meeting.created_by) === String(employee.id);
                                const isAllowed = isOrgAdmin || isCreator;
                                return (
                                    <tr key={meeting.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-900 text-sm">{meeting.title}</div>
                                            <div className="text-[11px] text-gray-500 line-clamp-1 max-w-[200px]">{meeting.description || 'No agenda'}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-xs text-gray-900 font-bold">{formatToIST(meeting.meeting_date).split(',')[0]}</div>
                                            <div className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                                                <Clock size={10} />
                                                {formatToIST(meeting.meeting_date).split(',')[1]}
                                                {meeting.end_time && ` - ${formatToIST(meeting.end_time).split(',')[1]}`}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                                            <div className="text-gray-900 font-bold flex items-center gap-1.5">
                                                <MapPin size={12} className="text-gray-400" />
                                                {meeting.location || 'All Sites'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                {meeting.department_names ? meeting.department_names.split(', ').map((d: string, i: number) => (
                                                    <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-[4px] text-[9px] font-bold border border-gray-200">
                                                        {d}
                                                    </span>
                                                )) : <span className="text-gray-400 text-[10px]">General</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${meeting.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                                                meeting.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}
                                            >
                                                {meeting.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{meeting.total_points} total</span>
                                                {meeting.open_points > 0 && (
                                                    <span className="bg-red-50 border border-red-200 text-red-600 text-[9px] uppercase px-1.5 py-0.5 rounded font-black">{meeting.open_points} Open</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
                                            <div className="flex items-center justify-end gap-3">
                                                {isAllowed && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleEdit(meeting)}
                                                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-sm transition-all border border-blue-200 shadow-sm"
                                                            title="Edit Meeting"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(meeting.id)}
                                                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-sm transition-all border border-red-200 shadow-sm"
                                                            title="Delete Meeting"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                                <Link href={`${basePath}/${meeting.id}`} className="text-black hover:text-gray-700 underline flex items-center gap-1 ml-2">
                                                    View <ChevronRight size={14} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (null)
                        )}
                    </tbody>
                </table>
                {/* Pagination Footer */}
                {!loading && pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, pagination.total)} of {pagination.total}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all disabled:opacity-30 disabled:hover:shadow-none font-bold"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${page === p
                                        ? 'bg-black text-white shadow-md'
                                        : 'hover:bg-white hover:border-gray-200 border border-transparent text-gray-500'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}

                            <button
                                onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
                                disabled={page === pagination.totalPages}
                                className="p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all disabled:opacity-30 disabled:hover:shadow-none font-bold"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modern Squared Create Meeting Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-500/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-md shadow-2xl border border-gray-200 overflow-visible flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">{editingMeetingId ? 'Edit Meeting' : 'Create Meeting'}</h2>
                            <button
                                onClick={() => {
                                    setIsCreateModalOpen(false);
                                    setEditingMeetingId(null);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 flex items-center gap-2 font-bold text-sm rounded-md">
                                    <AlertCircle size={18} /> {error}
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5">Meeting Name *</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium text-sm text-gray-900"
                                            placeholder="e.g. Planning Session"
                                            value={meetingData.title}
                                            onChange={e => setMeetingData({ ...meetingData, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5">Site / Location</label>

                                        {meetingData.locations.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {meetingData.locations.map(loc => (
                                                    <div key={loc.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm border border-blue-100">
                                                        <span className="font-bold text-xs">{loc.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setMeetingData(prev => ({ ...prev, locations: prev.locations.filter(l => l.id !== loc.id) }))}
                                                            className="hover:text-blue-900 font-bold transition-colors ml-1"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <select
                                            className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium text-sm text-gray-900"
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
                                                <option key={s.id} value={s.id}>{s.name || `Site ${s.id}`}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5">Start Time *</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium text-sm text-gray-900"
                                            value={meetingData.meeting_date}
                                            onChange={e => setMeetingData({ ...meetingData, meeting_date: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5">End Time</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium text-sm text-gray-900"
                                            value={meetingData.end_time}
                                            onChange={e => setMeetingData({ ...meetingData, end_time: e.target.value })}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5">Target Departments</label>

                                        {meetingData.department_ids.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {meetingData.department_ids.map(id => {
                                                    const dept = availableDepartments.find(d => d.id === id);
                                                    return (
                                                        <div key={id} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm border border-gray-200">
                                                            <span className="font-bold text-xs">{dept?.name || `Dept ${id}`}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setMeetingData(prev => ({ ...prev, department_ids: prev.department_ids.filter(d => d !== id) }))}
                                                                className="hover:text-black font-bold transition-colors ml-1"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <select
                                            className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium text-sm text-gray-900"
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
                                </div>

                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5">Agenda</label>
                                    <textarea
                                        className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium text-sm text-gray-900 min-h-[100px]"
                                        placeholder="Outline the meeting agenda..."
                                        value={meetingData.description}
                                        onChange={e => setMeetingData({ ...meetingData, description: e.target.value })}
                                    />
                                </div>



                                <div className="border border-gray-200 bg-gray-50 p-4 rounded-md">
                                    <label className="block text-xs uppercase font-bold text-gray-500 mb-3 flex items-center gap-1.5">
                                        <Users size={14} /> Participants
                                    </label>

                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            className="w-full bg-white border border-gray-200 rounded-md px-4 pl-10 py-2.5 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm font-medium"
                                            placeholder="Search & select participants..."
                                            value={attendeeSearch}
                                            onChange={e => setAttendeeSearch(e.target.value)}
                                        />
                                        {attendeeSearch && (
                                            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-gray-200 shadow-xl rounded-md z-[100] max-h-[150px] overflow-y-auto custom-scrollbar p-1">
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
                                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 group transition-all border-b border-gray-100 last:border-0 rounded-md"
                                                        >
                                                            <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-[10px] font-bold group-hover:bg-black group-hover:text-white transition-all">
                                                                {(emp.name || emp.first_name || 'U')[0].toUpperCase()}
                                                            </div>
                                                            <span className="font-medium text-sm text-gray-700">{emp.name || emp.first_name + ' ' + emp.last_name}</span>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-4 text-center text-sm text-gray-500">No participants found.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {meetingData.attendees.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {meetingData.attendees.map(a => (
                                                <div key={a.employee_id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-sm text-xs border border-blue-100">
                                                    <span className="font-bold text-[10px]">{a.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttendee(a.employee_id)}
                                                        className="hover:text-blue-900 font-bold transition-colors ml-1"
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

                        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-3 rounded-b-sm">
                            <button
                                onClick={() => {
                                    setIsCreateModalOpen(false);
                                    setEditingMeetingId(null);
                                }}
                                className="px-5 py-2 rounded-sm text-sm font-bold text-gray-600 hover:text-black hover:bg-gray-100 border border-transparent shadow-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateSubmit}
                                disabled={submitting}
                                className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-sm font-bold hover:bg-gray-800 transition-all shadow-md disabled:opacity-50 text-sm"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : editingMeetingId ? <CheckCircle2 size={16} /> : <CheckCircle2 size={16} />}
                                {editingMeetingId ? 'Update Meeting' : 'Create Meeting'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
