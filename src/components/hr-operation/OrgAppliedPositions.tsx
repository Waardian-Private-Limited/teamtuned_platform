"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Briefcase, Search, Filter, ArrowUpRight, Plus, X, Building2, MapPin, DollarSign, Send, Download, Edit3, Trash2, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function OrgAppliedPositions() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [positions, setPositions] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const [applicants, setApplicants] = useState<any[]>([]);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [currentJob, setCurrentJob] = useState<any>(null);
    const [expandedCandidateId, setExpandedCandidateId] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        department: '',
        type: 'Full-time',
        location: '',
        description: '',
        requirements: '',
        salary_range: '',
        status: 'Active'
    });

    const fetchPositions = async () => {
        try {
            const res = await apiClient.get('/hr-operation/applied-positions', {}, { withAuth: true });
            if (res.success) {
                setPositions(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch positions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPositions();
    }, []);

    const filteredPositions = useMemo(() => {
        return positions.filter(p => {
            const matchesSearch = p.position_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.department.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [positions, searchQuery, statusFilter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                const res = await apiClient.put(`/hr-operation/openings/${editingId}`, formData, { withAuth: true });
                if (res.success) {
                    toast.success('Position updated successfully');
                    closeModal();
                    fetchPositions();
                }
            } else {
                const res = await apiClient.post('/hr-operation/openings', formData, { withAuth: true });
                if (res.success) {
                    toast.success('Position posted successfully');
                    closeModal();
                    fetchPositions();
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this position? This action cannot be undone.')) return;
        try {
            const res = await apiClient.delete(`/hr-operation/openings/${id}`, { withAuth: true });
            if (res.success) {
                toast.success('Position deleted');
                fetchPositions();
            }
        } catch (err: any) {
            toast.error(err.message || 'Delete failed');
        }
    };

    const handleEdit = (job: any) => {
        setEditingId(job.id);
        setFormData({
            title: job.position_name,
            department: job.department,
            type: job.type || 'Full-time',
            location: job.location || '',
            description: job.description || '',
            requirements: job.requirements || '',
            salary_range: job.salary_range || '',
            status: job.status
        });
        setIsModalOpen(true);
    };

    const handleViewApplicants = async (job: any) => {
        setCurrentJob(job);
        setViewModalOpen(true);
        setLoading(true);
        try {
            const res = await apiClient.get(`/hr-operation/applied-positions/${job.id}/applicants`, {}, { withAuth: true });
            if (res.success) {
                setApplicants(res.data);
            }
        } catch (err: any) {
            toast.error('Failed to load applicants');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (appId: number, status: string) => {
        try {
            const res = await apiClient.put(`/hr-operation/applications/${appId}/status`, { status }, { withAuth: true });
            if (res.success) {
                toast.success(`Candidate marked as ${status}`);
                // Refresh list
                setApplicants(prev => prev.map(app =>
                    app.id === appId ? { ...app, status } : app
                ));
            }
        } catch (err: any) {
            toast.error('Failed to update status');
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedCandidateId(prev => (prev === id ? null : id));
    };
    const closeModal = () => {
        setIsModalOpen(false);
        setViewModalOpen(false);
        setEditingId(null);
        setCurrentJob(null);
        setExpandedCandidateId(null);
        setApplicants([]);
        setFormData({
            title: '',
            department: '',
            type: 'Full-time',
            location: '',
            description: '',
            requirements: '',
            salary_range: '',
            status: 'Active'
        });
    };

    const exportToExcel = () => {
        const dataToExport = filteredPositions.map(p => ({
            'Position ID': `TT-${p.id}`,
            'Title': p.position_name,
            'Department': p.department,
            'Applications': p.apps_count,
            'Status': p.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Applied Positions");
        XLSX.writeFile(wb, "Applied_Positions_Report.xlsx");
        toast.success('Excel report downloaded');
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Applied Positions</h1>
                        <p className="mt-1 text-gray-500 font-medium">Manage recruitment lifecycle, track applications, and export reports.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 px-5 py-3 bg-white text-gray-700 rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-all font-bold active:scale-95"
                        >
                            <Download size={20} />
                            Export Excel
                        </button>
                        <button
                            onClick={() => { closeModal(); setIsModalOpen(true); }}
                            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl hover:bg-gray-800 transition-all shadow-xl font-bold active:scale-95"
                        >
                            <Plus size={20} />
                            Post New Position
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                        { label: 'Total Applications', value: positions.reduce((acc, curr) => acc + (curr.apps_count || 0), 0), change: '+12%', icon: Briefcase, color: 'blue' },
                        { label: 'Active Openings', value: positions.filter(p => p.status === 'Active').length, change: '+2', icon: Briefcase, color: 'green' },
                        { label: 'Shortlisted', value: '45', change: '-5%', icon: CheckCircle2, color: 'purple' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-7 rounded-[32px] shadow-sm border border-gray-50 flex items-start justify-between">
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                                <h3 className="text-4xl font-black text-gray-900 mt-3">{stat.value}</h3>
                                <div className={`flex items-center gap-1 mt-3 ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                    <span className="text-[10px] font-black">{stat.change}</span>
                                    <span className="text-[10px] text-gray-400 uppercase font-black">Growth</span>
                                </div>
                            </div>
                            <div className={`p-4 rounded-2xl bg-${stat.color}-50 shadow-inner`}>
                                <stat.icon size={28} className={`text-${stat.color}-600`} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search and Filters */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 mb-8 flex flex-col md:flex-row gap-5 items-center justify-between">
                    <div className="relative w-full md:w-[400px] text-black">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 font-bold" size={20} />
                        <input
                            type="text"
                            placeholder="Search by title or dept..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-gray-50/50 border border-gray-100 rounded-[20px] focus:ring-4 focus:ring-black/5 outline-none transition-all text-sm font-bold placeholder:text-gray-300"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex bg-gray-100 p-1 rounded-2xl">
                            {['All', 'Active', 'Closed'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === status
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {status.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <button className="p-4 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-black hover:border-black transition-all shadow-sm">
                            <Filter size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Content Table */}
                <div className="bg-white rounded-[40px] shadow-2xl shadow-blue-900/5 border border-gray-50 overflow-hidden text-black animate-in fade-in slide-in-from-bottom-5 duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-50">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Position Detail</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Department</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Applicants</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">State</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-10 py-16 text-center text-gray-300 font-bold animate-pulse">Initializing Data Pool...</td></tr>
                                ) : filteredPositions.length === 0 ? (
                                    <tr><td colSpan={5} className="px-10 py-16 text-center text-gray-300 font-bold">No Records Match Your Search</td></tr>
                                ) : filteredPositions.map((job) => (
                                    <tr key={job.id} className="hover:bg-gray-50/80 transition-all group">
                                        <td className="px-10 py-7">
                                            <div className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{job.position_name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black uppercase text-gray-300">Ref: TT-{job.id}</span>
                                                <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                                                <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider">Posted {new Date().toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7">
                                            <span className="px-4 py-1.5 bg-gray-100 rounded-[10px] text-[10px] font-black text-gray-500 uppercase tracking-widest border border-gray-100 group-hover:bg-white group-hover:border-gray-200 transition-all">
                                                {job.department}
                                            </span>
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-3">
                                                    {[1, 2, 3].map(n => (
                                                        <div key={n} className="w-8 h-8 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 tracking-tighter">C{n}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="text-xs font-black text-gray-900">{job.apps_count} ACTIVE</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${job.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100 shadow-sm'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${job.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                                {job.status}
                                            </div>
                                        </td>
                                        <td className="px-10 py-7 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => handleViewApplicants(job)}
                                                    className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 rounded-xl transition-all shadow-sm font-bold text-xs flex items-center gap-2"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(job)}
                                                    className="p-3 bg-white text-gray-400 hover:text-blue-600 border border-gray-100 hover:border-blue-100 rounded-xl transition-all shadow-sm"
                                                    title="Edit Position"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(job.id)}
                                                    className="p-3 bg-white text-gray-400 hover:text-red-600 border border-gray-100 hover:border-red-100 rounded-xl transition-all shadow-sm"
                                                    title="Delete Position"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                            <div className="group-hover:hidden">
                                                <MoreHorizontal className="text-gray-300 ml-auto" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Combined Create/Edit Position Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-300 text-black border border-white/10">
                        <div className="p-10 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                                    <div className="p-3 bg-black text-white rounded-2xl shadow-xl">
                                        <Briefcase size={24} />
                                    </div>
                                    {editingId ? 'Edit Position' : 'Post New Opening'}
                                </h2>
                                <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-widest">{editingId ? `UPDATING TT-${editingId}` : 'BROADCAST NEW OPPORTUNITY'}</p>
                            </div>
                            <button onClick={closeModal} className="p-4 hover:bg-white rounded-full transition-all border border-transparent hover:border-gray-100 shadow-sm">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 max-h-[65vh] overflow-y-auto custom-scrollbar bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Job Title *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Senior DevOps Engineer"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 font-bold transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Department *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Infrastructure"
                                        value={formData.department}
                                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 font-bold transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Employment Type</label>
                                    <div className="relative">
                                        <select
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 appearance-none font-bold"
                                        >
                                            <option>Full-time</option>
                                            <option>Part-time</option>
                                            <option>Contract</option>
                                            <option>Internship</option>
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <MoreHorizontal size={20} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Work Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                        <input
                                            type="text"
                                            placeholder="London, UK (Hybrid)"
                                            value={formData.location}
                                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 font-bold transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Salary Package</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Competitive / Performance Based"
                                            value={formData.salary_range}
                                            onChange={e => setFormData({ ...formData, salary_range: e.target.value })}
                                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 font-bold transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Visibility Status</label>
                                    <div className="relative">
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 appearance-none font-bold"
                                        >
                                            <option>Active</option>
                                            <option>Closed</option>
                                            <option>Draft</option>
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <MoreHorizontal size={20} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Job Description</label>
                                <textarea
                                    placeholder="Outline the core responsibilities and team mission..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-6 bg-gray-50 border border-gray-100 rounded-3xl outline-none focus:ring-4 focus:ring-black/5 min-h-[140px] font-medium leading-relaxed transition-all"
                                />
                            </div>

                            <div className="mt-8 space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Minimum Requirements</label>
                                <textarea
                                    placeholder="Experience, technologies, soft skills..."
                                    value={formData.requirements}
                                    onChange={e => setFormData({ ...formData, requirements: e.target.value })}
                                    className="w-full p-6 bg-gray-50 border border-gray-100 rounded-3xl outline-none focus:ring-4 focus:ring-black/5 min-h-[140px] font-medium leading-relaxed transition-all"
                                />
                            </div>
                        </form>

                        <div className="p-10 bg-gray-50/50 border-t border-gray-50 flex gap-6">
                            <button
                                onClick={closeModal}
                                className="flex-1 py-5 px-8 bg-white border border-gray-200 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
                            >
                                DISCARD CHANGES
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 py-5 px-8 bg-black text-white font-black rounded-2xl shadow-2xl hover:shadow-black/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 tracking-[1px] uppercase text-xs"
                            >
                                {submitting ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Send size={20} />
                                        {editingId ? 'Push Update' : 'Broadcast Opening'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Applicants Modal */}
            {viewModalOpen && currentJob && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/10">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-gray-900">Applicants for {currentJob.position_name}</h2>
                                <p className="text-sm text-gray-500 font-bold mt-1">Reviewing {applicants.length} candidates</p>
                            </div>
                            <button onClick={closeModal} className="p-3 hover:bg-white rounded-full transition-all border border-transparent hover:border-gray-100 shadow-sm">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                            {applicants.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📭</div>
                                    <h3 className="text-lg font-black text-gray-400">No Applications Yet</h3>
                                    <p className="text-gray-400 text-sm mt-2">Check back later for new candidates.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {applicants.map((app) => (
                                        <div key={app.id} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-6">
                                            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center w-full">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-lg font-black text-gray-900">{app.candidate_name}</h3>
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${app.status === 'Shortlisted' ? 'bg-green-100 text-green-700' :
                                                            app.status === 'Rejected' ? 'bg-red-50 text-red-500' :
                                                                'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {app.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500 font-medium">
                                                        <div className="flex items-center gap-1"><span className="text-gray-300">📧</span> {app.candidate_email}</div>
                                                        <div className="flex items-center gap-1"><span className="text-gray-300">📱</span> {app.candidate_phone}</div>
                                                        <div className="flex items-center gap-1"><span className="text-gray-300">💼</span> {app.total_experience || 'N/A'} Exp</div>
                                                        <div className="flex items-center gap-1"><span className="text-gray-300">💰</span> {app.expected_salary || 'N/A'}</div>
                                                    </div>

                                                    <div className="flex gap-4 mt-4">
                                                        <button
                                                            onClick={() => toggleExpand(app.id)}
                                                            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-black hover:underline bg-gray-100 px-3 py-2 rounded-lg transition-all"
                                                        >
                                                            {expandedCandidateId === app.id ? 'Collapse Details' : 'Expand Details'}
                                                        </button>
                                                        {app.resume_url && (
                                                            <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline bg-blue-50 px-3 py-2 rounded-lg">
                                                                <Download size={14} /> View Resume / CV
                                                            </a>
                                                        )}
                                                        {app.portfolio_link && (
                                                            <a href={app.portfolio_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-black hover:underline bg-gray-100 px-3 py-2 rounded-lg">
                                                                <ArrowUpRight size={14} /> Portfolio
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-50">
                                                    <button
                                                        onClick={() => handleStatusUpdate(app.id, 'Shortlisted')}
                                                        disabled={app.status === 'Shortlisted'}
                                                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all border ${app.status === 'Shortlisted'
                                                            ? 'bg-green-50 text-green-400 border-green-50 cursor-default opacity-50'
                                                            : 'bg-white text-green-600 border-green-100 hover:bg-green-50 shadow-sm'
                                                            }`}
                                                    >
                                                        FIT (Select)
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(app.id, 'Rejected')}
                                                        disabled={app.status === 'Rejected'}
                                                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all border ${app.status === 'Rejected'
                                                            ? 'bg-red-50 text-red-400 border-red-50 cursor-default opacity-50'
                                                            : 'bg-white text-red-500 border-red-100 hover:bg-red-50 shadow-sm'
                                                            }`}
                                                    >
                                                        UNFIT (Reject)
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded Details Section */}
                                            {expandedCandidateId === app.id && (
                                                <div className="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
                                                        {/* Professional Profile */}
                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-50 pb-2">Professional Profile</h4>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                <div>
                                                                    <span className="text-gray-400 text-xs font-bold block mb-0.5">Current Company</span>
                                                                    <p className="font-bold text-gray-900">{app.current_company || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400 text-xs font-bold block mb-0.5">Designation</span>
                                                                    <p className="font-bold text-gray-900">{app.current_designation || 'N/A'}</p>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <span className="text-gray-400 text-xs font-bold block mb-0.5">Current Salary</span>
                                                                        <p className="font-bold text-gray-900">{app.current_salary || 'N/A'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-400 text-xs font-bold block mb-0.5">Notice Period</span>
                                                                        <p className="font-bold text-gray-900">{app.notice_period || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Personal Details */}
                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-50 pb-2">Personal Details</h4>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <span className="text-gray-400 text-xs font-bold block mb-0.5">DOB</span>
                                                                        <p className="font-bold text-gray-900">{app.dob ? new Date(app.dob).toLocaleDateString() : 'N/A'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-400 text-xs font-bold block mb-0.5">Gender</span>
                                                                        <p className="font-bold text-gray-900">{app.gender || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400 text-xs font-bold block mb-0.5">Current City</span>
                                                                    <p className="font-bold text-gray-900">{app.current_city || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Education */}
                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-50 pb-2">Education</h4>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                <div>
                                                                    <span className="text-gray-400 text-xs font-bold block mb-0.5">Highest Education</span>
                                                                    <p className="font-bold text-gray-900">{app.highest_education || 'N/A'}</p>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <span className="text-gray-400 text-xs font-bold block mb-0.5">Passing Year</span>
                                                                        <p className="font-bold text-gray-900">{app.year_of_passing || 'N/A'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-400 text-xs font-bold block mb-0.5">Specialization</span>
                                                                        <p className="font-bold text-gray-900">{app.specialization || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Detailed History Tables */}
                                                    {(app.work_experience || app.academic_history) && (
                                                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                            {app.work_experience && (
                                                                <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                                                    <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                                                                        Work Experience
                                                                    </h4>
                                                                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                                                                        <table className="w-full text-left text-xs">
                                                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                                                <tr>
                                                                                    <th className="px-4 py-3 font-bold text-gray-500">Company</th>
                                                                                    <th className="px-4 py-3 font-bold text-gray-500">Role</th>
                                                                                    <th className="px-4 py-3 font-bold text-gray-500">Duration</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-50">
                                                                                {(() => {
                                                                                    try {
                                                                                        const exp = typeof app.work_experience === 'string' ? JSON.parse(app.work_experience) : app.work_experience;
                                                                                        return Array.isArray(exp) && exp.length > 0 ? exp.map((e: any, i: number) => (
                                                                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                                                                <td className="px-4 py-3 font-bold text-gray-900">{e.company}</td>
                                                                                                <td className="px-4 py-3 text-gray-600 font-medium">{e.designation}</td>
                                                                                                <td className="px-4 py-3 text-gray-500">{e.duration}</td>
                                                                                            </tr>
                                                                                        )) : <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 font-medium">No work experience listed</td></tr>
                                                                                    } catch (err) {
                                                                                        return <tr><td colSpan={3} className="px-4 py-6 text-center text-red-400 font-medium">Error loading data</td></tr>
                                                                                    }
                                                                                })()}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {app.academic_history && (
                                                                <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                                                    <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                                                                        Academic History
                                                                    </h4>
                                                                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                                                                        <table className="w-full text-left text-xs">
                                                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                                                <tr>
                                                                                    <th className="px-4 py-3 font-bold text-gray-500">Degree</th>
                                                                                    <th className="px-4 py-3 font-bold text-gray-500">Institute</th>
                                                                                    <th className="px-4 py-3 font-bold text-gray-500">Year</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-50">
                                                                                {(() => {
                                                                                    try {
                                                                                        const acad = typeof app.academic_history === 'string' ? JSON.parse(app.academic_history) : app.academic_history;
                                                                                        return Array.isArray(acad) && acad.length > 0 ? acad.map((e: any, i: number) => (
                                                                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                                                                <td className="px-4 py-3 font-bold text-gray-900">{e.degree}</td>
                                                                                                <td className="px-4 py-3 text-gray-600 font-medium">{e.university || e.institute}</td>
                                                                                                <td className="px-4 py-3 text-gray-500">{e.year}</td>
                                                                                            </tr>
                                                                                        )) : <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 font-medium">No academic record listed</td></tr>
                                                                                    } catch (err) {
                                                                                        return <tr><td colSpan={3} className="px-4 py-6 text-center text-red-400 font-medium">Error loading data</td></tr>
                                                                                    }
                                                                                })()}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
