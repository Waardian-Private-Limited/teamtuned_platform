"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Briefcase, MapPin, Calendar, Clock, CheckCircle2, AlertCircle, Upload, Send, Building2, Globe, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import GlobalHeader from '@/components/shared/GlobalHeader';
import GlobalFooter from '@/components/shared/GlobalFooter';

function InterviewContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const job_id = searchParams.get('job');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [interview, setInterview] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [fileUploading, setFileUploading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        dob: '',
        gender: '',
        current_city: '',
        total_experience: '',
        relevant_experience: '',
        current_company: '',
        current_designation: '',
        notice_period: '',
        current_salary: '',
        expected_salary: '',
        highest_education: '',
        specialization: '',
        year_of_passing: '',
        resume_url: '',
        portfolio_link: '',
        work_experience: [] as any[],
        academic_history: [] as any[],
        declaration_confirmed: false,
        job_id: job_id || ''
    });

    const addExperience = () => {
        setFormData(prev => ({
            ...prev,
            work_experience: [
                ...prev.work_experience,
                { company: '', designation: '', duration: '', description: '' }
            ]
        }));
    };

    const removeExperience = (index: number) => {
        setFormData(prev => ({
            ...prev,
            work_experience: prev.work_experience.filter((_, i) => i !== index)
        }));
    };

    const handleExperienceChange = (index: number, field: string, value: string) => {
        setFormData(prev => {
            const newExp = [...prev.work_experience];
            newExp[index] = { ...newExp[index], [field]: value };
            return { ...prev, work_experience: newExp };
        });
    };

    const addAcademic = () => {
        setFormData(prev => ({
            ...prev,
            academic_history: [
                ...prev.academic_history,
                { degree: '', specialization: '', year: '', university: '' }
            ]
        }));
    };

    const removeAcademic = (index: number) => {
        setFormData(prev => ({
            ...prev,
            academic_history: prev.academic_history.filter((_, i) => i !== index)
        }));
    };

    const handleAcademicChange = (index: number, field: string, value: string) => {
        setFormData(prev => {
            const newAcad = [...prev.academic_history];
            newAcad[index] = { ...newAcad[index], [field]: value };
            return { ...prev, academic_history: newAcad };
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const orgId = searchParams.get('orgId');
        if (!orgId) {
            toast.error('Organization context missing. Cannot upload.');
            return;
        }

        setFileUploading(true);
        const formDataUpload = new FormData();
        formDataUpload.append('files', file);

        try {
            const response = await apiClient.post(`/files/public-upload?orgId=${orgId}`, formDataUpload);
            if (response.success && response.files?.[0]) {
                setFormData(prev => ({ ...prev, resume_url: response.files[0].url }));
                toast.success('Resume uploaded successfully!');
            } else {
                toast.error('Upload failed. Please try a different file.');
            }
        } catch (err: any) {
            toast.error(err.message || 'File upload failed');
        } finally {
            setFileUploading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            setError('Invalid or missing application token');
            setLoading(false);
            return;
        }

        const fetchDetails = async () => {
            try {
                if (token === 'PUBLIC' && job_id) {
                    const response = await apiClient.get(`/hr-operation/public/openings/details/${job_id}?orgId=${searchParams.get('orgId')}`);
                    if (response.success) {
                        setInterview({
                            company_name: response.data.organizationName,
                            title: response.data.title,
                            location: response.data.location || 'Headquarters',
                            date: new Date(),
                            instructions: response.data.description,
                            type: 'JOB_OPENING'
                        });
                        setFormData(prev => ({ ...prev, job_id: job_id }));
                    } else {
                        setError('Job position not found');
                    }
                } else {
                    const response = await apiClient.get(`/interviews/public/details?token=${token}`);
                    if (response.success) {
                        setInterview(response.data);
                    } else {
                        setError(response.message || 'Failed to load details');
                    }
                }
            } catch (err: any) {
                setError(err.message || 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [token, job_id, searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        if (!formData.declaration_confirmed) {
            toast.error('Please confirm the declaration before submitting.');
            return;
        }

        setSubmitting(true);
        try {
            let response;
            if (token === 'PUBLIC') {
                response = await apiClient.post('/hr-operation/public/openings/submit', {
                    ...formData,
                    orgId: searchParams.get('orgId')
                });
            } else {
                response = await apiClient.post('/interviews/public/submit', {
                    ...formData,
                    token
                });
            }

            if (response.success) {
                setSubmitted(true);
                toast.success('Application submitted successfully!');
            } else {
                toast.error(response.message || 'Submission failed');
            }
        } catch (err: any) {
            toast.error(err.message || 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-bold tracking-widest uppercase text-xs">Validating Portal...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl text-center border border-red-50">
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <AlertCircle size={40} className="text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Access Denied</h1>
                    <p className="text-gray-500 mb-8 font-medium">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-black text-white rounded-2xl font-black tracking-widest uppercase text-xs shadow-lg hover:shadow-black/20 transition-all active:scale-95"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white p-12 rounded-[48px] shadow-2xl text-center border border-green-50">
                    <div className="w-28 h-28 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                        <CheckCircle2 size={56} className="text-green-500" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Success!</h1>
                    <p className="text-gray-500 mb-6 font-medium leading-relaxed">
                        Your application for <span className="text-black font-bold">{interview.title}</span> has been received. Our team will review your profile shortly.
                    </p>
                    <div className="pt-6 border-t border-gray-50">
                        <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Team {interview.company_name}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            <GlobalHeader role="org-admin" />

            <div className="flex-1 py-16 px-4">
                <div className="max-w-5xl mx-auto">
                    {/* Modern Branded Header */}
                    <div className="bg-white p-10 md:p-14 rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden mb-8">
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full mb-6">
                                <Building2 size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{interview.company_name}</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-none mb-4">{interview.title}</h1>
                            <p className="text-gray-400 font-medium text-lg max-w-2xl mb-10">Complete the form below to initiate your professional journey with us.</p>

                            <div className="flex flex-wrap gap-x-12 gap-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Interview Date</p>
                                        <p className="font-bold text-gray-900">{new Date(interview.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Office Location</p>
                                        <p className="font-bold text-gray-900">{typeof interview.location === 'object' ? `${interview.location.city}, ${interview.location.country}` : interview.location}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent"></div>
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-100/20 rounded-full blur-3xl text-blue-500"></div>
                    </div>

                    {/* Main Application Form */}
                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* 1. Personal Details */}
                        <div className="bg-white p-10 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[4px] mb-10 border-b border-gray-50 pb-6 flex items-center gap-4">
                                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] tracking-normal">01</span>
                                Personal Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Mobile Number *</label>
                                    <input
                                        required
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="+91 00000 00000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address *</label>
                                    <input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="yourname@email.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={formData.dob}
                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Gender</label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold appearance-none bg-no-repeat bg-[right_1.5rem_center] cursor-pointer"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Current City</label>
                                    <input
                                        type="text"
                                        value={formData.current_city}
                                        onChange={(e) => setFormData({ ...formData, current_city: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="e.g. Mumbai, India"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Position Details */}
                        <div className="bg-white p-10 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[4px] mb-10 border-b border-gray-50 pb-6 flex items-center gap-4">
                                <span className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] tracking-normal">02</span>
                                Position Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Position Applied For</label>
                                    <input
                                        readOnly
                                        type="text"
                                        value={interview.title}
                                        className="w-full px-6 py-4 bg-gray-100 border border-gray-100 rounded-2xl outline-none font-bold text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Interview Date</label>
                                    <input
                                        readOnly
                                        type="text"
                                        value={new Date(interview.date).toDateString()}
                                        className="w-full px-6 py-4 bg-gray-100 border border-gray-100 rounded-2xl outline-none font-bold text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Interview Location</label>
                                    <input
                                        readOnly
                                        type="text"
                                        value={typeof interview.location === 'object' ? interview.location.address : interview.location}
                                        className="w-full px-6 py-4 bg-gray-100 border border-gray-100 rounded-2xl outline-none font-bold text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Professional Information */}
                        <div className="bg-white p-10 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[4px] mb-10 border-b border-gray-50 pb-6 flex items-center gap-4">
                                <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] tracking-normal">03</span>
                                Professional Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Total Experience *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.total_experience}
                                        onChange={(e) => setFormData({ ...formData, total_experience: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="e.g. 3 Years"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Relevant Experience</label>
                                    <input
                                        type="text"
                                        value={formData.relevant_experience}
                                        onChange={(e) => setFormData({ ...formData, relevant_experience: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="e.g. 2 Years"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Current Company</label>
                                    <input
                                        type="text"
                                        value={formData.current_company}
                                        onChange={(e) => setFormData({ ...formData, current_company: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="Company Name"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Current Designation</label>
                                    <input
                                        type="text"
                                        value={formData.current_designation}
                                        onChange={(e) => setFormData({ ...formData, current_designation: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="Role / Title"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Notice Period</label>
                                    <input
                                        type="text"
                                        value={formData.notice_period}
                                        onChange={(e) => setFormData({ ...formData, notice_period: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="e.g. 30 Days"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Current Salary</label>
                                    <input
                                        type="text"
                                        value={formData.current_salary}
                                        onChange={(e) => setFormData({ ...formData, current_salary: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="LPA / Monthly"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Expected Salary *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.expected_salary}
                                        onChange={(e) => setFormData({ ...formData, expected_salary: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="Your expectation"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Work Experience History */}
                            <div className="mt-12 space-y-8">
                                <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Experience History</h4>
                                    <button
                                        type="button"
                                        onClick={addExperience}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100"
                                    >
                                        <Plus size={14} /> Add Experience
                                    </button>
                                </div>

                                {formData.work_experience.length === 0 && (
                                    <div className="text-center py-10 bg-gray-50/30 border-2 border-dashed border-gray-100 rounded-[32px]">
                                        <Briefcase size={32} className="mx-auto text-gray-200 mb-3" />
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No history added yet</p>
                                        <p className="text-[10px] text-gray-300 mt-1">Add previous roles to strengthen your application</p>
                                    </div>
                                )}

                                {formData.work_experience.map((exp: any, index: number) => (
                                    <div key={index} className="group relative p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm hover:border-blue-100 transition-all space-y-6">
                                        <button
                                            type="button"
                                            onClick={() => removeExperience(index)}
                                            className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Company Name</label>
                                                <input
                                                    type="text"
                                                    value={exp.company}
                                                    onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm"
                                                    placeholder="Recent Company"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Designation</label>
                                                <input
                                                    type="text"
                                                    value={exp.designation}
                                                    onChange={(e) => handleExperienceChange(index, 'designation', e.target.value)}
                                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm"
                                                    placeholder="Your Role"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Working Duration</label>
                                                <input
                                                    type="text"
                                                    value={exp.duration}
                                                    onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)}
                                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm"
                                                    placeholder="e.g. 2020 - 2022"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Responsibilities / Achievements</label>
                                            <textarea
                                                value={exp.description}
                                                onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm h-24 resize-none"
                                                placeholder="Briefly explain what you did there..."
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. Qualification */}
                        <div className="bg-white p-10 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[4px] mb-10 border-b border-gray-50 pb-6 flex items-center gap-4">
                                <span className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px] tracking-normal">04</span>
                                Qualification
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Highest Education *</label>
                                    <select
                                        required
                                        value={formData.highest_education}
                                        onChange={(e) => setFormData({ ...formData, highest_education: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold appearance-none bg-no-repeat bg-[right_1.5rem_center] cursor-pointer"
                                    >
                                        <option value="">Select Education</option>
                                        <option value="Doctorate">Doctorate (PhD)</option>
                                        <option value="Masters">Master's Degree (MBA, MA, MSc)</option>
                                        <option value="Bachelors">Bachelor's Degree (B.Tech, BA, BSc)</option>
                                        <option value="PG Diploma">Post Graduate Diploma</option>
                                        <option value="Diploma">Diploma</option>
                                        <option value="Higher Secondary">Higher Secondary (12th)</option>
                                        <option value="Secondary">Secondary (10th)</option>
                                        <option value="Certification">Professional Certification</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Specialization</label>
                                    <input
                                        type="text"
                                        value={formData.specialization}
                                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="Field of study"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Year of Passing</label>
                                    <input
                                        type="text"
                                        value={formData.year_of_passing}
                                        onChange={(e) => setFormData({ ...formData, year_of_passing: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                        placeholder="YYYY"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Academic History */}
                            <div className="mt-12 space-y-8">
                                <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Additional Qualifications</h4>
                                    <button
                                        type="button"
                                        onClick={addAcademic}
                                        className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition-all border border-orange-100"
                                    >
                                        <Plus size={14} /> Add Qualification
                                    </button>
                                </div>

                                {formData.academic_history.length === 0 && (
                                    <div className="text-center py-10 bg-gray-50/30 border-2 border-dashed border-gray-100 rounded-[32px]">
                                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3">
                                            <span className="text-lg">🎓</span>
                                        </div>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No additional degrees added</p>
                                        <p className="text-[10px] text-gray-300 mt-1">Include certifications or multiple degrees</p>
                                    </div>
                                )}

                                {formData.academic_history.map((acad: any, index: number) => (
                                    <div key={index} className="group relative p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm hover:border-orange-100 transition-all space-y-6">
                                        <button
                                            type="button"
                                            onClick={() => removeAcademic(index)}
                                            className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Degree / Certification</label>
                                                <select
                                                    value={acad.degree}
                                                    onChange={(e) => handleAcademicChange(index, 'degree', e.target.value)}
                                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-sm appearance-none bg-no-repeat bg-[right_1.5rem_center] cursor-pointer"
                                                >
                                                    <option value="">Select Degree</option>
                                                    <option value="Doctorate">Doctorate (PhD)</option>
                                                    <option value="Masters">Master's Degree</option>
                                                    <option value="Bachelors">Bachelor's Degree</option>
                                                    <option value="PG Diploma">PG Diploma</option>
                                                    <option value="Diploma">Diploma</option>
                                                    <option value="Higher Secondary">12th Standard</option>
                                                    <option value="Secondary">10th Standard</option>
                                                    <option value="Certification">Certification</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Specialization</label>
                                                <input
                                                    type="text"
                                                    value={acad.specialization}
                                                    onChange={(e) => handleAcademicChange(index, 'specialization', e.target.value)}
                                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-sm"
                                                    placeholder="Major"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">University / Board</label>
                                                <input
                                                    type="text"
                                                    value={acad.university}
                                                    onChange={(e) => handleAcademicChange(index, 'university', e.target.value)}
                                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-sm"
                                                    placeholder="Institution"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Year</label>
                                                <input
                                                    type="text"
                                                    value={acad.year}
                                                    onChange={(e) => handleAcademicChange(index, 'year', e.target.value)}
                                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-sm"
                                                    placeholder="YYYY"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 5. Resume & Documents */}
                        <div className="bg-white p-10 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[4px] mb-10 border-b border-gray-50 pb-6 flex items-center gap-4">
                                <span className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] tracking-normal">05</span>
                                Resume & Documents
                            </h3>

                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Resume Upload (PDF/DOC) *</label>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1 relative group">
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                onChange={handleFileChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                disabled={fileUploading}
                                            />
                                            <div className={`w-full h-full min-h-[64px] flex items-center gap-4 px-6 bg-gray-50 border-2 border-dashed ${fileUploading ? 'border-blue-200 bg-blue-50/10' : 'border-gray-100 group-hover:border-blue-200'} rounded-[24px] transition-all`}>
                                                {fileUploading ? (
                                                    <div className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                                ) : (
                                                    <Upload className="text-gray-300 group-hover:text-blue-500 transition-colors" size={20} />
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-gray-700">
                                                        {fileUploading ? 'Uploading Resume...' : formData.resume_url ? 'File Attached' : 'Choose File or Drag here'}
                                                    </p>
                                                    <p className="text-[9px] text-gray-400 font-medium truncate max-w-[200px]">
                                                        {formData.resume_url || 'Maximum 5MB (PDF or DOC)'}
                                                    </p>
                                                </div>
                                                {formData.resume_url && !fileUploading && (
                                                    <CheckCircle2 size={18} className="text-green-500 animate-in zoom-in" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-[1.5] relative group">
                                            <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                                            <input
                                                required
                                                type="url"
                                                value={formData.resume_url}
                                                onChange={(e) => setFormData({ ...formData, resume_url: e.target.value })}
                                                className="w-full pl-16 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-[24px] focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300 text-sm"
                                                placeholder="Or paste LinkedIn/Drive link"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-2 ml-4">
                                        <AlertCircle size={14} className="text-blue-500" />
                                        Upload your latest CV for immediate review.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Portfolio / LinkedIn (Optional)</label>
                                    <div className="relative">
                                        <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                        <input
                                            type="url"
                                            value={formData.portfolio_link}
                                            onChange={(e) => setFormData({ ...formData, portfolio_link: e.target.value })}
                                            className="w-full pl-16 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-[24px] focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold placeholder:text-gray-300"
                                            placeholder="linkedin.com/in/..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 6. Declaration */}
                        <div className="bg-white p-10 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
                            <label className="flex items-start gap-4 cursor-pointer group">
                                <div className="relative flex items-center justify-center mt-1">
                                    <input
                                        type="checkbox"
                                        required
                                        checked={formData.declaration_confirmed}
                                        onChange={(e) => setFormData({ ...formData, declaration_confirmed: e.target.checked })}
                                        className="peer appearance-none w-6 h-6 border-2 border-gray-200 rounded-lg checked:bg-green-500 checked:border-green-500 transition-all cursor-pointer"
                                    />
                                    <CheckCircle2 size={14} className="absolute text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-700 select-none group-hover:text-black transition-colors">
                                        I confirm that the information provided is accurate and complete. *
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Team {interview.company_name} Data Protection Agreement</p>
                                </div>
                            </label>
                        </div>

                        {/* Final Submission */}
                        <div className="pt-10 flex flex-col items-center">
                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full max-w-md py-6 bg-black text-white rounded-[24px] font-black tracking-[4px] uppercase text-xs shadow-2xl shadow-black/20 hover:shadow-black/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {submitting ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        SUBMIT APPLICATION
                                        <Send size={18} />
                                    </>
                                )}
                            </button>
                            <p className="mt-8 text-[10px] text-gray-400 font-bold uppercase tracking-widest">Secure & Encrypted Application Portal</p>
                        </div>

                    </form>
                </div>
            </div>

            <GlobalFooter orgName={interview.company_name} />
        </div>
    );
}

export default function InterviewApplyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>}>
            <InterviewContent />
        </Suspense>
    );
}
