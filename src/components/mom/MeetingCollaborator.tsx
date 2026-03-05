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
    ImageIcon, Download, Building, CheckCircle
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { getSocket } from '@/lib/socket';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
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

const MeetingCollaborator = ({ meetingId, initialMeeting }: { meetingId: string, initialMeeting?: any }) => {
    const { employee } = useAuth();
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
    const [tagType, setTagType] = useState<'@' | '#'>('@');
    const [tagResults, setTagResults] = useState<any[]>([]);
    const [employeesList, setEmployeesList] = useState<any[]>([]);
    const [departmentsList, setDepartmentsList] = useState<any[]>([]);
    const [selectedAssignments, setSelectedAssignments] = useState<any[]>([]);
    const [pointToDelete, setPointToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [pointToUpdate, setPointToUpdate] = useState<number | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [expandedHistoryPointId, setExpandedHistoryPointId] = useState<number | null>(null);
    const [newAttachments, setNewAttachments] = useState<File[]>([]);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const socketRef = useRef<any>(null);

    useEffect(() => {
        fetchData();
        const socket = getSocket();
        socketRef.current = socket;

        if (socket) {
            socket.emit('join_meeting', meetingId);
            socket.on('point_added', (point: any) => setPoints(prev => [point, ...prev]));
            socket.on('point_updated', (updatedPoint: any) => setPoints(prev => prev.map(p => p.id === updatedPoint.id ? updatedPoint : p)));
            socket.on('point_deleted', (data: any) => setPoints(prev => prev.filter(p => p.id !== data.point_id)));
            socket.on('attendee_updated', (data: any) => {
                setMeeting((prev: any) => ({
                    ...prev,
                    attendees: prev.attendees.map((a: any) =>
                        a.employee_id === data.employee_id ? { ...a, status: data.status } : a
                    )
                }));
            });
        }

        return () => {
            if (socket) {
                socket.emit('leave_meeting', meetingId);
                socket.off('point_added');
                socket.off('point_updated');
                socket.off('point_deleted');
                socket.off('attendee_updated');
            }
        };
    }, [meetingId]);

    const fetchData = async () => {
        try {
            const [detailsRes, employeesRes, deptsRes] = await Promise.all([
                apiClient.get(`/mom/details/${meetingId}`, { withAuth: true }),
                apiClient.get('/organization/employees', { withAuth: true }),
                apiClient.get('/organization/departments', { withAuth: true })
            ]);
            if (detailsRes.success) {
                setMeeting(detailsRes.meeting);
                setPoints(detailsRes.meeting.points || []);
            }
            // Backend returns { data: [...] } for these usually
            setEmployeesList(employeesRes.data || employeesRes || []);
            setDepartmentsList(deptsRes.data || deptsRes || []);
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Failed to load meeting data');
        } finally {
            setLoading(false);
        }
    };

    const handleInputTitle = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart || 0;
        const lastChar = value[cursorPos - 1];

        // Reset if moving away from mention
        const words = value.slice(0, cursorPos).split(/\s/);
        const lastWord = words[words.length - 1];

        if (lastChar === '@' || lastChar === '#') {
            setTagType(lastChar === '@' ? '@' : '#');
            setTagQuery('');
            setShowTagPopover(true);
        } else if (showTagPopover) {
            if (lastWord.startsWith('@') || lastWord.startsWith('#')) {
                setTagQuery(lastWord.slice(1));
            } else {
                setShowTagPopover(false);
            }
        }

        if (editingPointId !== null && editingPointId !== -1) setEditText(value);
        else setNewPoint(value);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
        }
        // Reset the input value so the same file could be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
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
            const list = tagType === '@' ? employeesList : departmentsList;
            const filtered = list.filter((item: any) =>
                (item.name || `${item.first_name} ${item.last_name}`).toLowerCase().includes(tagQuery.toLowerCase())
            );
            setTagResults(filtered.slice(0, 5));
        }
    }, [tagQuery, showTagPopover, tagType, employeesList, departmentsList]);

    const selectTag = (item: any) => {
        const type = tagType === '@' ? 'employee' : 'department';
        const name = item.name || `${item.first_name} ${item.last_name}`;
        if (!selectedAssignments.find(a => a.id === (item.id || item.id_pk) && a.type === type)) {
            setSelectedAssignments(prev => [...prev, { id: (item.id || item.id_pk), type, name }]);
        }

        const isEdit = editingPointId !== null && editingPointId !== -1;
        const currentText = isEdit ? editText : newPoint;
        const words = currentText.split(' ');
        words.pop(); // Remove trigger char or partial query
        const updatedText = words.join(' ') + (words.length > 0 ? ' ' : '') + (tagType === '@' ? '@' : '#') + name + ' ';

        if (isEdit) setEditText(updatedText);
        else setNewPoint(updatedText);

        setShowTagPopover(false);
        setTimeout(() => inputRef.current?.focus(), 10);
    };

    const addPoint = async () => {
        if (!newPoint.trim()) return;
        setIsUpdating(true);
        try {
            await apiClient.post('/mom/point/add', {
                meeting_id: meetingId,
                point_text: newPoint,
                assignments: selectedAssignments
            }, { withAuth: true });
            setNewPoint('');
            setSelectedAssignments([]);
            setNewAttachments([]);
            setEditingPointId(null);
            setPointToUpdate(null);
            toast.success('Point added');
        } catch (err) { toast.error('Failed to add point'); }
        finally { setIsUpdating(false); }
    };

    const updatePoint = async (pointId: number) => {
        setIsUpdating(true);
        try {
            await apiClient.put(`/mom/point/update/${pointId}`, {
                point_text: editText,
                assignments: selectedAssignments
            }, { withAuth: true });
            setEditingPointId(null);
            setSelectedAssignments([]);
            setPointToUpdate(null);
            toast.success('Point updated');
        } catch (err) { toast.error('Failed to update point'); }
        finally { setIsUpdating(false); }
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
            fetchData();
        } catch (err) { toast.error('Failed to mark attendance'); }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <div className="size-10 border-4 border-[#136dec] border-t-transparent animate-spin"></div>
        </div>
    );

    if (!meeting) return <div className="p-10 text-black font-black">Meeting not found</div>;

    const isAttended = meeting.attendees?.find((a: any) => a.employee_id === employee?.id)?.status === 'attended';

    return (
        <div className="flex h-screen bg-white text-black font-['Inter'] overflow-hidden">
            {/* Sidebar (Left) */}
            <aside className="w-56 border-r border-slate-100 bg-white hidden lg:flex flex-col p-4 shrink-0 overflow-y-auto">
                <div className="flex items-center gap-2 text-[#136dec] px-2 mb-8">
                    <FileText size={20} className="stroke-[3]" />
                    <h2 className="text-black text-sm font-black tracking-tighter uppercase whitespace-nowrap">MOM Editor v3.2</h2>
                </div>

                <div className="flex flex-col gap-1">
                    <button className="flex items-center gap-3 p-2.5 bg-black text-white font-black text-[11px] uppercase tracking-wider">
                        <Layout size={16} /> Dashboard
                    </button>
                    <button className="flex items-center gap-3 p-2.5 text-slate-400 hover:bg-slate-50 font-black text-[11px] uppercase tracking-wider transition-all text-left">
                        <Star size={16} /> Important
                    </button>
                    <button className="flex items-center gap-3 p-2.5 text-slate-400 hover:bg-slate-50 font-black text-[11px] uppercase tracking-wider transition-all text-left">
                        <Archive size={16} /> Archives
                    </button>
                    <button className="flex items-center gap-3 p-2.5 text-slate-400 hover:bg-slate-50 font-black text-[11px] uppercase tracking-wider transition-all text-left">
                        <Settings size={16} /> Settings
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
                        <span>Organization</span> <ChevronRight size={12} />
                        <span>Meetings</span> <ChevronRight size={12} />
                        <span className="text-black">Current Session</span>
                    </div>
                    {!isAttended ? (
                        <button
                            onClick={markAttendance}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest shadow-md rounded-lg flex items-center gap-2 transition-all"
                        >
                            <CheckCircle size={14} /> Mark Attendance
                        </button>
                    ) : (
                        <button
                            onClick={() => window.history.back()}
                            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 text-[11px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all"
                        >
                            <X size={14} /> Leave Meeting
                        </button>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto px-8 py-8">
                    <div className="max-w-4xl mx-auto space-y-8">
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
                            <button
                                onClick={() => { setEditingPointId(-1); setNewPoint(''); setSelectedAssignments([]); setNewAttachments([]); }}
                                className="px-5 py-3 bg-[#136dec] hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-100 rounded-lg active:scale-95 transition-all"
                            >
                                <Plus size={18} strokeWidth={3} /> Add Point
                            </button>
                        </div>

                        {/* Composer / Points List */}
                        <div className="space-y-4 pb-32">
                            {editingPointId === -1 && (
                                <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 p-5 relative animate-in fade-in slide-in-from-top-4 transition-all">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-md text-[9px] font-black uppercase tracking-widest">New Drafting</span>
                                                <button onClick={() => { setTagType('#'); setShowTagPopover(true); }} className="px-2 py-0.5 border border-slate-200 text-black rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-slate-50 transition-colors">
                                                    <Building size={10} className="text-blue-600" /> Dept Tag
                                                </button>
                                                <button onClick={() => { setTagType('@'); setShowTagPopover(true); }} className="px-2 py-0.5 border border-slate-200 text-black rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-slate-50 transition-colors">
                                                    <User size={10} className="text-emerald-600" /> User Tag
                                                </button>
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
                                            placeholder="for tagging user use @SARAH and for department use #HR..."
                                        />

                                        <div className="flex flex-wrap gap-2 pb-2">
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
                                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 px-2 py-1 -ml-2 rounded-md transition-colors"><Paperclip size={14} /> Attach Doc</button>
                                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 px-2 py-1 -ml-2 rounded-md transition-colors"><ImageIcon size={14} /> Add Image</button>
                                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                                        </div>
                                    </div>

                                    {showTagPopover && (
                                        <div className="absolute top-12 left-0 w-64 bg-white shadow-xl rounded-xl border border-slate-100 z-50 p-2 overflow-hidden overflow-y-auto max-h-64 custom-scrollbar">
                                            {tagResults.map((item: any) => (
                                                <button key={item.id} onClick={() => selectTag(item)} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group">
                                                    <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                        {tagType === '@' ? <User size={14} className="text-emerald-600" /> : <Building size={14} className="text-blue-600" />}
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
                            )}

                            {points.map((point) => {
                                const isEditing = editingPointId === point.id;
                                const isAssigned = point.assignments?.length > 0;

                                if (isEditing) return (
                                    <div key={point.id} className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 p-5 relative transition-all">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-between">
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setTagType('#'); setShowTagPopover(true); }} className="px-2 py-0.5 border border-slate-200 rounded-md text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-slate-50 transition-colors">
                                                        <Building size={10} className="text-blue-600" /> Dept
                                                    </button>
                                                    <button onClick={() => { setTagType('@'); setShowTagPopover(true); }} className="px-2 py-0.5 border border-slate-200 rounded-md text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-slate-50 transition-colors">
                                                        <User size={10} className="text-emerald-600" /> User
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => setEditingPointId(null)} className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">Cancel</button>
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
                                                {selectedAssignments.map((a, i) => (
                                                    <span key={i} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-black text-[9px] font-black uppercase flex items-center gap-1">
                                                        {a.type === 'department' ? <Building size={10} className="text-blue-600" /> : <User size={10} className="text-emerald-600" />}{a.name}
                                                        <X size={10} className="ml-1 cursor-pointer text-slate-400 hover:text-red-500 transition-colors" onClick={() => setSelectedAssignments(prev => prev.filter((_, idx) => idx !== i))} />
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );

                                return (
                                    <div key={point.id} className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all group">
                                        <div className="p-5 flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`px-2 py-0.5 rounded-md ${isAssigned ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100' : 'bg-rose-50 text-rose-700 font-bold border border-rose-100'} text-[9px] uppercase tracking-widest`}>
                                                        {isAssigned ? 'ASSIGNED' : 'UNASSIGNED'}
                                                    </div>
                                                    {point.status !== 'assigned' && point.status !== 'unassigned' && (
                                                        <div className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 font-bold border border-slate-100 text-[9px] uppercase tracking-widest">
                                                            {point.status?.replace('_', ' ').toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => {
                                                        setEditingPointId(point.id);
                                                        setEditText(point.point_text);
                                                        setSelectedAssignments(point.assignments ? point.assignments.map((a: any) => ({
                                                            id: a.assignee_id || a.id,
                                                            type: a.assignee_type || a.type,
                                                            name: a.assignee_name || a.name
                                                        })) : []);
                                                    }} className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"><Edit3 size={15} /></button>
                                                    <button onClick={() => setPointToDelete(point.id)} className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                                                </div>
                                            </div>

                                            <p className="text-[15px] font-medium text-slate-900 leading-relaxed tracking-tight break-words">
                                                {point.point_text}
                                            </p>

                                            {expandedHistoryPointId === point.id && point.history && point.history.length > 0 && (
                                                <div className="mt-2 p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col gap-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                                        <History size={12} /> Edit History
                                                    </h4>
                                                    <div className="flex flex-col gap-3">
                                                        {point.history.map((h: any) => (
                                                            <div key={h.id} className="text-sm bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
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

                                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col gap-1.5 min-h-[28px] justify-center">
                                                        {isAssigned ? (
                                                            <>
                                                                {point.assignments.filter((a: any) => (a.assignee_type || a.type) === 'department').length > 0 && (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="size-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                                                            <Building size={10} />
                                                                        </div>
                                                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest break-words overflow-hidden line-clamp-1 max-w-[200px]" title={point.assignments.filter((a: any) => (a.assignee_type || a.type) === 'department').map((a: any) => a.assignee_name || a.name).join(', ')}>
                                                                            {point.assignments.filter((a: any) => (a.assignee_type || a.type) === 'department').map((a: any) => a.assignee_name || a.name).join(', ')}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {point.assignments.filter((a: any) => (a.assignee_type || a.type) === 'employee').length > 0 && (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="size-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                                                            <User size={10} />
                                                                        </div>
                                                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest break-words overflow-hidden line-clamp-1 max-w-[200px]" title={point.assignments.filter((a: any) => (a.assignee_type || a.type) === 'employee').map((a: any) => a.assignee_name || a.name).join(', ')}>
                                                                            {point.assignments.filter((a: any) => (a.assignee_type || a.type) === 'employee').map((a: any) => a.assignee_name || a.name).join(', ')}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <div className="size-5 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm shrink-0">
                                                                    <AlertCircle size={10} />
                                                                </div>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                    No assignee
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                                                    {point.history && point.history.length > 0 && (
                                                        <button
                                                            onClick={() => setExpandedHistoryPointId(expandedHistoryPointId === point.id ? null : point.id)}
                                                            className={`flex items-center gap-1.5 transition-colors ${expandedHistoryPointId === point.id ? 'text-blue-600' : 'hover:text-blue-500'}`}
                                                            title="View edit history"
                                                        >
                                                            <History size={12} className={expandedHistoryPointId === point.id ? "animate-pulse" : ""} /> Edited (x{point.history.length})
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
                        {meeting.attendees?.filter((a: any) => a.status === 'attended').length || 0} Joined
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
                        {meeting.attachments?.length > 0 ? meeting.attachments.map((file: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50 group cursor-pointer hover:bg-slate-100 transition-all">
                                <div className="p-1.5 rounded-md bg-blue-100 text-blue-600">
                                    <FileText size={14} />
                                </div>
                                <span className="text-[11px] font-medium text-slate-700 truncate flex-1">{file.file_name}</span>
                                <Download size={14} className="text-slate-400 group-hover:text-slate-600" />
                            </div>
                        )) : (
                            <p className="text-[10px] text-slate-400 text-center py-4">No attachments</p>
                        )}
                        <button className="w-full py-2.5 rounded-lg border border-dashed border-slate-200 text-[11px] font-bold text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all">
                            + ADD FILES
                        </button>
                    </div>
                </div>
            </aside>

            {/* Discussion Modal */}
            {selectedPoint && (
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
            )}

            {/* Custom Delete Confirmation Modal */}
            {pointToDelete !== null && (
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
            )}

            {/* Custom Update/Save Confirmation Modal */}
            {pointToUpdate !== null && (
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
            )}
        </div>
    );
};

export default MeetingCollaborator;