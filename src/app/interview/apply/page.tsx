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
        first_name: '',
        middle_name: '',
        last_name: '',
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
        resume_link: '',
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
            const combinedFullName = [
                formData.first_name,
                formData.middle_name,
                formData.last_name
            ].filter(Boolean).join(' ');

            let response;
            if (token === 'PUBLIC') {
                response = await apiClient.post('/hr-operation/public/openings/submit', {
                    ...formData,
                    full_name: combinedFullName,
                    orgId: searchParams.get('orgId')
                });
            } else {
                response = await apiClient.post('/interviews/public/submit', {
                    ...formData,
                    full_name: combinedFullName,
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
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
                <GlobalHeader role="org-admin" />
                <div className="flex-1 flex items-center justify-center px-4 py-10">
                    <div className="max-w-lg w-full bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center">
                        <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={48} className="text-green-500" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 tracking-tight">
                            Application received
                        </h1>
                        <p className="text-gray-500 mb-6 font-medium leading-relaxed text-sm md:text-base">
                            Your application for <span className="text-black font-bold">{interview.title}</span> has been
                            received. Our team will review your profile shortly.
                        </p>
                        <div className="pt-5 border-t border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Team {interview.company_name}
                            </p>
                        </div>
                    </div>
                </div>
                <GlobalFooter orgName={interview.company_name} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            <GlobalHeader role="org-admin" />

            <div className="flex-1 py-10 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Modern Branded Header */}
                    <div className="bg-white p-8 md:p-10 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden mb-6">
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full mb-6">
                                <Building2 size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{interview.company_name}</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-none mb-3">{interview.title}</h1>
                            <p className="text-gray-600 text-sm max-w-2xl mb-6">Fill in the required details to submit your job application.</p>

                            <div className="flex flex-wrap gap-x-12 gap-y-6">
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
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* 1. Personal Details */}
                        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[3px] mb-6 border-b border-gray-100 pb-4 flex items-center gap-3">
                                <span className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center text-[10px] tracking-normal">01</span>
                                Personal Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">First Name *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="First name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Middle Name</label>
                                    <input
                                        type="text"
                                        value={formData.middle_name}
                                        onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="Middle name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Last Name *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="Last name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Mobile Number *</label>
                                    <input
                                        required
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="+91 00000 00000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Email Address *</label>
                                    <input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="yourname@email.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={formData.dob}
                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Gender</label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-900 appearance-none bg-no-repeat bg-[right_1.25rem_center] cursor-pointer"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Current City</label>
                                    <input
                                        type="text"
                                        value={formData.current_city}
                                        onChange={(e) => setFormData({ ...formData, current_city: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="e.g. Mumbai, India"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Position Details */}
                        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[3px] mb-6 border-b border-gray-100 pb-4 flex items-center gap-3">
                                <span className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center text-[10px] tracking-normal">02</span>
                                Position Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Position Applied For</label>
                                    <input
                                        readOnly
                                        type="text"
                                        value={interview.title}
                                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-md outline-none text-sm text-gray-700 cursor-not-allowed"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Interview Location</label>
                                    <input
                                        readOnly
                                        type="text"
                                        value={typeof interview.location === 'object' ? interview.location.address : interview.location}
                                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-md outline-none text-sm text-gray-700 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Professional Information */}
                        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[3px] mb-6 border-b border-gray-100 pb-4 flex items-center gap-3">
                                <span className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center text-[10px] tracking-normal">03</span>
                                Professional Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Total Experience *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.total_experience}
                                        onChange={(e) => setFormData({ ...formData, total_experience: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="e.g. 3 Years"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Relevant Experience</label>
                                    <input
                                        type="text"
                                        value={formData.relevant_experience}
                                        onChange={(e) => setFormData({ ...formData, relevant_experience: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="e.g. 2 Years"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Current Company</label>
                                    <input
                                        type="text"
                                        value={formData.current_company}
                                        onChange={(e) => setFormData({ ...formData, current_company: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="Company Name"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Current Designation</label>
                                    <input
                                        type="text"
                                        value={formData.current_designation}
                                        onChange={(e) => setFormData({ ...formData, current_designation: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="Role / Title"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Notice Period</label>
                                    <input
                                        type="text"
                                        value={formData.notice_period}
                                        onChange={(e) => setFormData({ ...formData, notice_period: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="e.g. 30 Days"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Current Salary</label>
                                    <input
                                        type="text"
                                        value={formData.current_salary}
                                        onChange={(e) => setFormData({ ...formData, current_salary: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="LPA / Monthly"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Expected Salary *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.expected_salary}
                                        onChange={(e) => setFormData({ ...formData, expected_salary: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="Your expectation"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Work Experience History */}
                            <div className="mt-8 space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <h4 className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em]">Experience History</h4>
                                    <button
                                        type="button"
                                        onClick={addExperience}
                                        className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-md text-[10px] font-black uppercase tracking-[0.16em] hover:bg-gray-900 transition-all"
                                    >
                                        <Plus size={14} /> Add Experience
                                    </button>
                                </div>

                                {formData.work_experience.length === 0 && (
                                    <div className="text-center py-6 bg-gray-50/50 border border-dashed border-gray-200 rounded-lg">
                                        <Briefcase size={32} className="mx-auto text-gray-200 mb-3" />
                                        <p className="text-gray-500 text-xs font-medium uppercase tracking-[0.16em]">No history added yet</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Add previous roles to strengthen your application</p>
                                    </div>
                                )}

                                {formData.work_experience.map((exp: any, index: number) => (
                                    <div key={index} className="group relative p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-black/20 transition-all space-y-4">
                                        <button
                                            type="button"
                                            onClick={() => removeExperience(index)}
                                            className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Company Name</label>
                                                <input
                                                    type="text"
                                                    value={exp.company}
                                                    onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                                    placeholder="Recent Company"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Designation</label>
                                                <input
                                                    type="text"
                                                    value={exp.designation}
                                                    onChange={(e) => handleExperienceChange(index, 'designation', e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                                    placeholder="Your Role"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Working Duration</label>
                                                <input
                                                    type="text"
                                                    value={exp.duration}
                                                    onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                                    placeholder="e.g. 2020 - 2022"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Responsibilities / Achievements</label>
                                            <textarea
                                                value={exp.description}
                                                onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 h-24 resize-none placeholder:text-gray-400"
                                                placeholder="Briefly explain your responsibilities and achievements"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. Qualification */}
                        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[3px] mb-6 border-b border-gray-100 pb-4 flex items-center gap-3">
                                <span className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center text-[10px] tracking-normal">04</span>
                                Qualification
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Highest Education *</label>
                                    <select
                                        required
                                        value={formData.highest_education}
                                        onChange={(e) => setFormData({ ...formData, highest_education: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 appearance-none bg-no-repeat bg-[right_1.25rem_center] cursor-pointer"
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
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Specialization</label>
                                    <input
                                        type="text"
                                        value={formData.specialization}
                                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="Field of study"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Year of Passing</label>
                                    <input
                                        type="text"
                                        value={formData.year_of_passing}
                                        onChange={(e) => setFormData({ ...formData, year_of_passing: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                        placeholder="YYYY"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Academic History */}
                            <div className="mt-8 space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <h4 className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em]">Additional Qualifications</h4>
                                    <button
                                        type="button"
                                        onClick={addAcademic}
                                        className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition-all border border-orange-100"
                                    >
                                        <Plus size={14} /> Add Qualification
                                    </button>
                                </div>

                                {formData.academic_history.length === 0 && (
                                    <div className="text-center py-6 bg-gray-50/50 border border-dashed border-gray-200 rounded-lg">
                                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3">
                                            <span className="text-lg">🎓</span>
                                        </div>
                                        <p className="text-gray-500 text-xs font-medium uppercase tracking-[0.16em]">No additional degrees added</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Include certifications or multiple degrees</p>
                                    </div>
                                )}

                                {formData.academic_history.map((acad: any, index: number) => (
                                    <div key={index} className="group relative p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-black/20 transition-all space-y-4">
                                        <button
                                            type="button"
                                            onClick={() => removeAcademic(index)}
                                            className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Degree / Certification</label>
                                                <select
                                                    value={acad.degree}
                                                    onChange={(e) => handleAcademicChange(index, 'degree', e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 appearance-none bg-no-repeat bg-[right_1.25rem_center] cursor-pointer"
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
                                                <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Specialization</label>
                                                <input
                                                    type="text"
                                                    value={acad.specialization}
                                                    onChange={(e) => handleAcademicChange(index, 'specialization', e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                                    placeholder="Major"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">University / Board</label>
                                                <input
                                                    type="text"
                                                    value={acad.university}
                                                    onChange={(e) => handleAcademicChange(index, 'university', e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                                    placeholder="Institution"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Year</label>
                                                <input
                                                    type="text"
                                                    value={acad.year}
                                                    onChange={(e) => handleAcademicChange(index, 'year', e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                                    placeholder="YYYY"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 5. Resume & Documents */}
                        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[3px] mb-6 border-b border-gray-100 pb-4 flex items-center gap-3">
                                <span className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center text-[10px] tracking-normal">05</span>
                                Resume & Documents
                            </h3>

                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Resume Upload (PDF/DOC) *</label>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1 relative group">
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                onChange={handleFileChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                disabled={fileUploading}
                                            />
                                            <div className={`w-full h-full min-h-[56px] flex items-center gap-4 px-5 bg-white border border-dashed ${fileUploading ? 'border-gray-400 bg-gray-50' : 'border-gray-300 group-hover:border-black'} rounded-md transition-all`}>
                                                {fileUploading ? (
                                                    <div className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                                ) : (
                                                    <Upload className="text-gray-300 group-hover:text-blue-500 transition-colors" size={20} />
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {fileUploading ? 'Uploading resume...' : formData.resume_url ? 'File attached' : 'Choose file or drag here'}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 truncate max-w-[220px]">
                                                        Maximum 5MB (PDF or DOC)
                                                    </p>
                                                </div>
                                                {formData.resume_url && !fileUploading && (
                                                    <CheckCircle2 size={18} className="text-green-500 animate-in zoom-in" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-[1.5] relative group">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" size={20} />
                                            <input
                                                type="url"
                                                value={formData.resume_link}
                                                onChange={(e) => setFormData({ ...formData, resume_link: e.target.value })}
                                                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
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
                                    <label className="text-[11px] font-medium text-gray-900 uppercase tracking-[0.16em] ml-0.5">Portfolio / LinkedIn (Optional)</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                        <input
                                            type="url"
                                            value={formData.portfolio_link}
                                            onChange={(e) => setFormData({ ...formData, portfolio_link: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all text-sm text-gray-600 placeholder:text-gray-400"
                                            placeholder="linkedin.com/in/..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 6. Declaration */}
                        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
                            <label className="flex items-start gap-4 cursor-pointer group">
                                <div className="relative flex items-center justify-center mt-1">
                                    <input
                                        type="checkbox"
                                        required
                                        checked={formData.declaration_confirmed}
                                        onChange={(e) => setFormData({ ...formData, declaration_confirmed: e.target.checked })}
                                        className="peer appearance-none w-5 h-5 border border-gray-300 rounded-[4px] checked:bg-black checked:border-black transition-all cursor-pointer"
                                    />
                                    <CheckCircle2 size={14} className="absolute text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 select-none group-hover:text-black transition-colors">
                                        I confirm that the information provided is accurate and complete. *
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-[0.16em]">Team {interview.company_name} Data Protection Agreement</p>
                                </div>
                            </label>
                        </div>

                        {/* Final Submission */}
                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full py-4 bg-black text-white rounded-md font-semibold tracking-[0.2em] uppercase text-[11px] shadow-md hover:shadow-lg hover:-translate-y-[1px] transition-all flex items-center justify-center gap-3 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
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
