"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Briefcase, CheckCircle2, UserPlus, Clock, Search,
    Download, Calendar, ArrowRight, User, Mail,
    Phone, FileText, FileImage, FileWarning, LayoutGrid, DollarSign, Fingerprint, X, MoreVertical, Eye, ChevronLeft, ChevronRight, ChevronDown, Loader2, Send, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient, getBackendUrl } from '@/lib/apiClient';
import toast from 'react-hot-toast';

const StatsCard = ({ title, count, icon: Icon, color, onClick, isActive }: any) => {
    const colorMap: Record<string, { bg: string; border: string; text: string; textDark: string }> = {
        'blue': { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-black', textDark: 'text-gray-900' },
        'green': { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-600', textDark: 'text-green-900' },
        'yellow': { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-600', textDark: 'text-yellow-900' },
    };
    const colors = colorMap[color] || { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-600', textDark: 'text-gray-900' };

    return (
        <div
            onClick={onClick}
            className={`${colors.bg} rounded-xl p-4 border ${colors.border} cursor-pointer transition-all duration-200 ${isActive ? 'ring-2 ring-offset-1 ring-black shadow-sm' : 'hover:shadow-md'}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${colors.text}`}>{title}</p>
                    <h3 className={`text-2xl font-black mt-1 ${colors.textDark}`}>{count}</h3>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
            </div>
        </div>
    );
};

const DocumentPreview = ({ docs, onPreview }: { docs: any[], onPreview: (doc: any) => void }) => {
    if (!docs || docs.length === 0) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {docs.map((doc, idx) => {
                const url = doc.url || doc.link;
                const fileName = doc.name || doc.filename || doc.label || (url ? url.split('/').pop() : `Document ${idx + 1}`);
                const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                const isImage = url && (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg') || url.toLowerCase().endsWith('.png') || url.toLowerCase().endsWith('.webp') || url.toLowerCase().endsWith('.gif'));
                const isPDF = url && url.toLowerCase().endsWith('.pdf');
                const fullUrl = url ? (url.startsWith('http') ? url : `${getBackendUrl()}${url}`) : null;

                const handlePreview = (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (fullUrl) {
                        onPreview({
                            url: fullUrl,
                            name: fileName,
                            type: isImage ? 'image' : isPDF ? 'pdf' : 'other',
                            extension: fileExtension,
                            size: doc.size || 0,
                            uploaded_at: doc.uploaded_at || doc.created_at
                        });
                    }
                };

                const handleDownload = (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (fullUrl) {
                        const link = document.createElement('a');
                        link.href = fullUrl;
                        link.download = fileName;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                };

                return (
                    <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
                    >
                        <div className="flex-shrink-0 p-2 bg-white rounded-md border border-gray-200 group-hover:border-blue-300 transition-colors">
                            {isImage ? (
                                <FileText className="w-4 h-4 text-blue-500" />
                            ) : isPDF ? (
                                <FileText className="w-4 h-4 text-red-500" />
                            ) : (
                                <FileText className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{fileExtension}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handlePreview}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Preview document"
                            >
                                <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleDownload}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                title="Download document"
                            >
                                <Download className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default function OnboardingStatusManagement() {
    const [view, setView] = useState<'list' | 'details'>('list');
    const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Completed'>('All');
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [finalSalary, setFinalSalary] = useState<string>('');
    const [sendingLetter, setSendingLetter] = useState(false);
    const [updatingSalary, setUpdatingSalary] = useState(false);

    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [email, setEmail] = useState<string>('');

    // Salary state
    const [salaryType, setSalaryType] = useState<string>('');
    const [salaryAmount, setSalaryAmount] = useState<string>('');
    const [yearlyPackage, setYearlyPackage] = useState<string>('');

    // Bank details
    const [bankAccountNo, setBankAccountNo] = useState<string>('');
    const [ifscCode, setIfscCode] = useState<string>('');
    const [bankName, setBankName] = useState<string>('');
    const [bankBranch, setBankBranch] = useState<string>('');
    const [panNumber, setPanNumber] = useState<string>('');
    const [aadhaarNumber, setAadhaarNumber] = useState<string>('');
    const [pfUan, setPfUan] = useState<string>('');

    // Additional site/attendance
    const [inchargeSiteIds, setInchargeSiteIds] = useState<Set<number>>(new Set());
    const [allowPunchFromHQ, setAllowPunchFromHQ] = useState<boolean>(false);
    const [isFlexibleTime, setIsFlexibleTime] = useState<boolean>(false);

    // Missing fields state
    const [gender, setGender] = useState<string>('');
    const [dob, setDob] = useState<string>('');
    const [departmentId, setDepartmentId] = useState<number | ''>('');
    const [roleId, setRoleId] = useState<number | ''>('');
    const [reportingManagerId, setReportingManagerId] = useState<number | ''>('');
    const [workType, setWorkType] = useState<string>('');
    const [employmentStartDate, setEmploymentStartDate] = useState<string>('');
    const [assignedSiteIds, setAssignedSiteIds] = useState<Set<number>>(new Set());
    const [primarySiteId, setPrimarySiteId] = useState<number | ''>('');
    const [policyId, setPolicyId] = useState<number | ''>('');
    const [designation, setDesignation] = useState<string>('');

    // Lists for dropdowns
    const [departments, setDepartments] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);

    const [showOnboardingModal, setShowOnboardingModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [step, setStep] = useState(1);
    const [verifying, setVerifying] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');

    // Manager Search state
    const [managerSearchQuery, setManagerSearchQuery] = useState('');
    const [managersList, setManagersList] = useState<any[]>([]);
    const [managersLoading, setManagersLoading] = useState(false);
    const [showManagerDropdown, setShowManagerDropdown] = useState(false);

    // Form State (Restored & Enhanced)
    const [salaryComponents, setSalaryComponents] = useState<any[]>([]);
    const [availableDebits, setAvailableDebits] = useState<any[]>([]);
    const [salaryItems, setSalaryItems] = useState<any[]>([]);
    const [assignedDebitIds, setAssignedDebitIds] = useState<Set<number>>(new Set());
    const [shiftStartTime, setShiftStartTime] = useState<string>('');
    const [shiftEndTime, setShiftEndTime] = useState<string>('');
    const [weeklyOffDays, setWeeklyOffDays] = useState<Set<string>>(new Set());
    const [previewDoc, setPreviewDoc] = useState<{
        url: string;
        name: string;
        type?: 'image' | 'pdf' | 'other';
        extension?: string;
        size?: number;
        uploaded_at?: string;
    } | null>(null);

    // Enhanced Detail Modal State
    const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'onboarding' | 'documents' | 'journey'>('overview');
    const [applicationHistory, setApplicationHistory] = useState<any[]>([]);
    const [fetchingHistory, setFetchingHistory] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [managerDropdownRef] = useState<any>(null); // For future click-away if needed

    const isCompleted = (c: any) => !!(c.onboarding_details || c.onboarding_documents);

    const resetOnboardingForm = (candidate: any) => {
        setStep(1);
        setValidationMessage('');

        // onboarding_details may arrive as a JSON string or already-parsed object depending on MySQL driver
        let initialDetails: any = null;
        try {
            const raw = candidate.onboarding_details;
            if (raw) {
                initialDetails = typeof raw === 'string' ? JSON.parse(raw) : raw;
            }
        } catch { }
        const obDetails = initialDetails?.details || {};
        const obSalary = initialDetails?.salary_details || {};

        // Sync Basic Info
        setFirstName(candidate.first_name || candidate.candidate_name?.split(' ')[0] || '');
        setLastName(candidate.last_name || candidate.candidate_name?.split(' ').slice(1).join(' ') || '');
        setPhone(candidate.candidate_phone || obDetails?.phone || '');
        setEmail(candidate.candidate_email || '');
        setGender(candidate.gender || obDetails?.gender || '');
        setDob(candidate.dob ? candidate.dob.split('T')[0] : (obDetails?.dob ? String(obDetails.dob).split('T')[0] : ''));

        // Sync Job Info
        setDepartmentId(candidate.department_id || '');
        setRoleId(candidate.role_id || '');
        setReportingManagerId(candidate.reporting_manager_id || '');
        setWorkType(candidate.work_type || '');
        setDesignation(candidate.designation || candidate.position_name || '');

        const candStartDate = candidate.employment_start_date ? candidate.employment_start_date.split('T')[0] : '';
        setEmploymentStartDate(candStartDate);

        setAssignedSiteIds(new Set(candidate.site_ids || []));
        setPrimarySiteId(candidate.primary_site_id || '');
        setInchargeSiteIds(new Set());
        setAllowPunchFromHQ(false);
        setIsFlexibleTime(false);

        // Sync Attendance
        setPolicyId(candidate.attendance_policy_id || '');
        setShiftStartTime(candidate.shift_start_time || '');
        setShiftEndTime(candidate.shift_end_time || '');
        setWeeklyOffDays(new Set(candidate.weekly_off_days || []));

        // Sync Salary: proposed_salary is annual CTC → monthly = CTC / 12
        const annualCTC = Number(candidate.proposed_salary || 0);
        const monthlySalary = annualCTC > 0 ? Math.round(annualCTC / 12) : 0;
        setFinalSalary(monthlySalary > 0 ? String(monthlySalary) : '');
        setSalaryAmount(monthlySalary > 0 ? String(monthlySalary) : '');
        setYearlyPackage(annualCTC > 0 ? String(annualCTC) : '');
        setSalaryType('Monthly');
        setSalaryItems(candidate.salary_breakdown || []);
        setAssignedDebitIds(new Set(candidate.assigned_debit_ids || []));

        // Bank details from onboarding submission — try multiple JSON key variants
        const pan = obSalary?.pan_number || obSalary?.pan || obDetails?.pan_number || obDetails?.pan || '';
        const aadh = obSalary?.aadhaar_number || obSalary?.aadhaar || obDetails?.aadhaar_number || obDetails?.aadhaar || '';
        const uan = obSalary?.pf_uan || obSalary?.uan || obSalary?.pf_number || obDetails?.pf_uan || obDetails?.uan || '';
        const accNo = obSalary?.bank_account_no || obSalary?.bank_account || obDetails?.bank_account_no || '';
        const ifsc = obSalary?.ifsc_code || obSalary?.ifsc || obDetails?.ifsc_code || '';
        const bName = obSalary?.bank_name || obDetails?.bank_name || '';
        const bBranch = obSalary?.branch_name || obSalary?.bank_branch || obDetails?.branch_name || '';

        setBankAccountNo(accNo);
        setIfscCode(ifsc);
        setBankName(bName);
        setBankBranch(bBranch);
        setPanNumber(pan);
        setAadhaarNumber(aadh);
        setPfUan(uan);
    };

    useEffect(() => {
        fetchCandidates();
        fetchSalaryConfig();
    }, []);

    const fetchSalaryConfig = async () => {
        try {
            const fetchSafe = async (url: string) => {
                try {
                    const res = await apiClient.get(url, {}, { withAuth: true });
                    return res?.success ? res.data : res;
                } catch (e) {
                    console.error(`Failed to fetch ${url}:`, e);
                    return null;
                }
            };

            const extractArray = (res: any, key?: string) => {
                if (!res) return [];
                if (Array.isArray(res)) return res;
                if (key && Array.isArray(res[key])) return res[key];
                const firstArray = Object.values(res).find(v => Array.isArray(v));
                return Array.isArray(firstArray) ? firstArray : [];
            };

            const [components, debits, depts, all_roles, all_sites, all_policies, all_managers] = await Promise.all([
                fetchSafe('/organization/salary-components?status=active'),
                fetchSafe('/organization/employees/additional-debits?status=active'),
                fetchSafe('/organization/departments'),
                fetchSafe('/organization/roles'),
                fetchSafe('/sites'),
                fetchSafe('/organization/attendance-rules'),
                fetchSafe('/organization/employees?limit=1000')
            ]);

            setSalaryComponents(extractArray(components));
            setAvailableDebits(extractArray(debits));
            setDepartments(extractArray(depts, 'departments'));
            setRoles(extractArray(all_roles, 'roles'));
            setSites(extractArray(all_sites, 'sites'));
            setPolicies(extractArray(all_policies, 'policies'));
            setManagers(extractArray(all_managers, 'data'));
        } catch (err) {
            console.error('Failed to fetch configuration data', err);
        }
    };

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/onboarding-status/candidates', {}, { withAuth: true });
            if (res.success) {
                setCandidates(res.data);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to load onboarding status');
        } finally {
            setLoading(false);
        }
    };

    const fetchApplicationHistory = async (applicationId: number) => {
        setFetchingHistory(true);
        try {
            const res = await apiClient.get(`/hr-operation/applications/${applicationId}/history`, {}, { withAuth: true });
            if (res.success) {
                setApplicationHistory(res.data);
            }
        } catch (err: any) {
            console.error('Failed to fetch history:', err);
        } finally {
            setFetchingHistory(false);
        }
    };

    const sendAppointment = async () => {
        if (!selected) return;
        setSendingLetter(true);
        try {
            const res = await apiClient.post(`/hiring-onboarding/applications/${selected.id}/appointment`, {}, { withAuth: true });
            if (res.success) {
                toast.success('Appointment letter sent');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to send appointment letter');
        } finally {
            setSendingLetter(false);
        }
    };

    const addSalary = async () => {
        if (!selected) return;
        setUpdatingSalary(true);
        try {
            const res = await apiClient.post(`/hiring-onboarding/applications/${selected.id}/salary`, {
                final_salary: finalSalary,
                salary_breakdown: salaryItems,
                assigned_debit_ids: Array.from(assignedDebitIds),
                shift_start_time: shiftStartTime,
                shift_end_time: shiftEndTime,
                weekly_off_days: Array.from(weeklyOffDays)
            }, { withAuth: true });
            if (res.success) {
                toast.success('Salary information updated');
                // Update local state
                const updated = { ...selected, proposed_salary: finalSalary, final_salary: finalSalary };
                setCandidates(prev => prev.map(c => c.id === selected.id ? updated : c));
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to update salary');
        } finally {
            setUpdatingSalary(false);
        }
    };

    const saveOnboardingEmployee = async () => {
        if (!selected) return;

        // Basic validation
        if (!firstName.trim() || !lastName.trim()) { setValidationMessage('First and last name are required'); return; }
        if (!email.trim()) { setValidationMessage('Email is required'); return; }
        if (!departmentId) { setValidationMessage('Department is required'); return; }
        if (!roleId) { setValidationMessage('Role is required'); return; }
        if (!primarySiteId) { setValidationMessage('Primary site is required'); return; }
        if (!workType) { setValidationMessage('Work type is required'); return; }

        setVerifying(true);
        setValidationMessage('');
        try {
            // Step 1: Create the employee via the standard Add Employee endpoint
            const siteAssignments = Array.from(assignedSiteIds).map(sid => ({
                site_id: sid,
                is_incharge: inchargeSiteIds.has(sid),
                is_primary: Number(sid) === Number(primarySiteId)
            }));

            const empPayload = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                gender: gender || null,
                date_of_birth: dob || null,
                phone: phone || null,
                email: email.trim(),
                department_id: typeof departmentId === 'number' ? departmentId : null,
                role_id: typeof roleId === 'number' ? roleId : null,
                reporting_manager_id: typeof reportingManagerId === 'number' ? reportingManagerId : null,
                designation: designation || null,
                work_type: workType || null,
                employment_start_date: employmentStartDate || null,
                site_ids: Array.from(assignedSiteIds),
                primary_site_id: primarySiteId || null,
                site_assignments: siteAssignments,
                incharge: inchargeSiteIds.size > 0,
                allow_punch_from_hq: allowPunchFromHQ,
                assigned_debit_ids: Array.from(assignedDebitIds),
                salary_type: salaryType || 'Monthly',
                salary_amount: salaryAmount ? Number(salaryAmount) : (finalSalary ? Number(finalSalary) : null),
                yearly_package: yearlyPackage ? Number(yearlyPackage) : null,
                salary_breakdown: salaryItems.filter(si => si.component_id && si.amount).map(si => ({
                    component_id: si.component_id,
                    name: si.component_name,
                    type: si.component_type,
                    amount: Number(si.amount)
                })),
                bank_account_no: bankAccountNo || null,
                ifsc_code: ifscCode || null,
                bank_name: bankName || null,
                bank_branch: bankBranch || null,
                pan_number: panNumber || null,
                aadhaar_number: aadhaarNumber || null,
                pf_uan: pfUan || null,
                weekly_off_days: Array.from(weeklyOffDays),
                flexible_time: isFlexibleTime,
                shift_start_time: isFlexibleTime ? null : (shiftStartTime || null),
                shift_end_time: isFlexibleTime ? null : (shiftEndTime || null),
                attendance_policy_id: typeof policyId === 'number' ? policyId : null,
            };

            const empRes = await apiClient('/organization/employees', { method: 'POST', body: empPayload });
            const employeeId = empRes?.id || empRes?.employee_id || null;

            // Step 2: Mark the application as Onboarded and log history
            try {
                await apiClient.post(
                    `/onboarding-status/applications/${selected.id}/complete-onboarded`,
                    { employee_id: employeeId },
                    { withAuth: true }
                );
            } catch (markErr) {
                console.error('Failed to mark application as onboarded:', markErr);
            }

            toast.success('Employee account created successfully!');
            setShowOnboardingModal(false);
            const updated = { ...selected, status: 'Onboarded', hr_onboarding_verified: 1 };
            setSelected(updated);
            setCandidates(prev => prev.map(c => c.id === selected.id ? updated : c));
        } catch (err: any) {
            toast.error(err.message || 'Failed to create employee account');
        } finally {
            setVerifying(false);
        }
    };

    // Keep verifyOnboarding as an alias for backwards compatibility (no longer used in UI)
    const verifyOnboarding = saveOnboardingEmployee;

    const handleSalaryItemUpdate = (componentId: number, amount: number) => {
        setSalaryItems(prev => {
            const existing = prev.find(i => i.component_id === componentId);
            if (existing) {
                if (amount === 0) return prev.filter(i => i.component_id !== componentId);
                return prev.map(i => i.component_id === componentId ? { ...i, amount } : i);
            }
            if (amount === 0) return prev;
            const comp = salaryComponents.find(c => c.id === componentId);
            return [...prev, { component_id: componentId, component_name: comp.component_name, component_type: comp.component_type.toLowerCase(), amount }];
        });
    };

    const toggleDebit = (debitId: number) => {
        setAssignedDebitIds(prev => {
            const next = new Set(prev);
            if (next.has(debitId)) next.delete(debitId);
            else next.add(debitId);
            return next;
        });
    };

    const toggleWeeklyDay = (day: string) => {
        setWeeklyOffDays(prev => {
            const next = new Set(prev);
            if (next.has(day)) next.delete(day);
            else next.add(day);
            return next;
        });
    };

    const filteredCandidatesBySearch = candidates.filter(c => {
        const search = searchTerm.toLowerCase();
        return (
            (c.candidate_name || '').toLowerCase().includes(search) ||
            (c.position_name || '').toLowerCase().includes(search)
        );
    });

    const filteredCandidates = filteredCandidatesBySearch.filter(c => {
        if (filterStatus === 'Pending') return !isCompleted(c);
        if (filterStatus === 'Completed') return isCompleted(c);
        return true;
    });

    // Reset pagination when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);

    const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
    const paginatedCandidates = filteredCandidates.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const pendingCount = candidates.filter(c => !isCompleted(c)).length;
    const completedCount = candidates.filter(c => isCompleted(c)).length;

    return (
        <div className="p-4 md:p-8 bg-gray-50/50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                    {view === 'list' ? (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                        <CheckCircle2 size={32} className="text-black" />
                                        Onboarding Status
                                    </h1>
                                    <p className="mt-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                                        Track candidate document submissions and verify onboarding data.
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
                                    <StatsCard
                                        title="Pending"
                                        count={pendingCount}
                                        icon={Clock}
                                        color="yellow"
                                        onClick={() => setFilterStatus('Pending')}
                                        isActive={filterStatus === 'Pending'}
                                    />
                                    <StatsCard
                                        title="Completed"
                                        count={completedCount}
                                        icon={CheckCircle2}
                                        color="green"
                                        onClick={() => setFilterStatus('Completed')}
                                        isActive={filterStatus === 'Completed'}
                                    />
                                    <StatsCard
                                        title="Total"
                                        count={candidates.length}
                                        icon={UserPlus}
                                        color="blue"
                                        onClick={() => setFilterStatus('All')}
                                        isActive={filterStatus === 'All'}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search candidate, position..."
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-black/5 transition-all text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                <th className="px-6 py-3 text-left">Candidate</th>
                                                <th className="px-6 py-3 text-left">Position</th>
                                                <th className="px-6 py-3 text-left">Status</th>
                                                <th className="px-6 py-3 text-center">Documents</th>
                                                <th className="px-6 py-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-10">
                                                        <div className="flex flex-col items-center justify-center space-y-4 py-20">
                                                            <Loader2 size={40} className="animate-spin text-gray-200" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fetching Data...</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : paginatedCandidates.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-20 text-center">
                                                        <div className="flex flex-col items-center justify-center space-y-3">
                                                            <FileText size={40} className="text-gray-100" />
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No candidates found</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedCandidates.map(candidate => {
                                                    const completed = isCompleted(candidate);
                                                    return (
                                                        <tr key={candidate.id} className="group hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-6 py-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs border border-indigo-200">
                                                                        {candidate.candidate_name?.[0]?.toUpperCase()}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                                                            {candidate.first_name && candidate.last_name ? `${candidate.first_name} ${candidate.last_name}` : candidate.candidate_name}
                                                                        </div>
                                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">#{candidate.id}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                                                                    <Briefcase size={14} className="text-gray-400" />
                                                                    {candidate.position_name}
                                                                </div>
                                                            </td>

                                                            <td className="px-6 py-5">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${completed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                                    <span className={`text-xs font-semibold ${completed ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                                        {completed ? 'Completed' : 'Pending'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <FileText size={14} className={completed ? 'text-blue-500' : 'text-gray-400'} />
                                                                    <span className={`text-xs font-semibold ${completed ? 'text-blue-600' : 'text-gray-500'}`}>
                                                                        {completed ? 'Submitted' : 'Pending'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelected(candidate);
                                                                            setShowDetailModal(true);
                                                                            fetchApplicationHistory(candidate.id);
                                                                        }}
                                                                        className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
                                                                    >
                                                                        <Eye size={14} className="text-gray-500" />
                                                                        View
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelected(candidate);
                                                                            // Reset form & Sync data
                                                                            resetOnboardingForm(candidate);
                                                                            setShowOnboardingModal(true);
                                                                        }}
                                                                        className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 hover:border-blue-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                                                                    >
                                                                        <UserPlus size={14} className="text-white" />
                                                                        Onboard
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination UI */}
                                {totalPages > 1 && (
                                    <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredCandidates.length)} of {filteredCandidates.length} Candidates
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="p-2 rounded-lg border border-gray-100 text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>

                                            <div className="flex items-center gap-1">
                                                {[...Array(totalPages)].map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setCurrentPage(i + 1)}
                                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1
                                                            ? 'bg-black text-white'
                                                            : 'text-gray-400 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className="p-2 rounded-lg border border-gray-100 text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* --- NEW MODALS --- */}

            {/* 1. Detail Modal (Submission History & Docs) */}
            <AnimatePresence>
                {showDetailModal && selected && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setShowDetailModal(false)}
                        />
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-white">
                                            {selected.first_name?.[0] || selected.candidate_name[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-900 tracking-tight">
                                                {selected.first_name && selected.last_name ? `${selected.first_name} ${selected.last_name}` : selected.candidate_name}
                                            </h2>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate #{selected.id} • {selected.position_name}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Tab Navigation */}
                            <div className="flex px-6 border-b border-slate-100 bg-white sticky top-[81px] z-20">
                                {(['overview', 'onboarding', 'documents', 'journey'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveDetailTab(tab)}
                                        className={`px-4 py-4 text-xs font-bold capitalize transition-all relative ${activeDetailTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {tab}
                                        {activeDetailTab === tab && (
                                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeDetailTab}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="space-y-6"
                                    >
                                        {(() => {
                                            let details: any = null;
                                            let docs: any = null;
                                            try { details = selected.onboarding_details ? JSON.parse(selected.onboarding_details) : null; } catch { }
                                            try { docs = selected.onboarding_documents ? JSON.parse(selected.onboarding_documents) : null; } catch { }
                                            const perCompany = (docs?.per_company) || {};
                                            const generalDocs = (docs?.general) || [];

                                            // Handle multiple possible JSON structures for onboarding details
                                            const onboardingData = details?.details || details || {};
                                            const salaryData = details?.salary_details || details?.details || details || {};

                                            switch (activeDetailTab) {
                                                case 'overview':
                                                    return (
                                                        <div className="space-y-6">
                                                            <section className="space-y-3">
                                                                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                                                    <User size={14} className="text-slate-400" />
                                                                    Profile Information
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                                    {[
                                                                        { label: 'Email', value: selected.candidate_email },
                                                                        { label: 'Phone', value: selected.candidate_phone },
                                                                        { label: 'Gender', value: selected.gender || onboardingData.gender || '-' },
                                                                        { label: 'DOB', value: selected.dob ? selected.dob.split('T')[0] : (onboardingData.dob || '-') },
                                                                        { label: 'Location', value: selected.location || '-' },
                                                                        { label: 'Applied At', value: selected.applied_at ? new Date(selected.applied_at).toLocaleDateString() : '-' }
                                                                    ].map((item, idx) => (
                                                                        <div key={idx} className="space-y-0.5">
                                                                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">{item.label}</p>
                                                                            <p className="text-xs font-semibold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">{item.value}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </section>


                                                        </div>
                                                    );

                                                case 'onboarding':
                                                    return (
                                                        <div className="space-y-6">
                                                            <section className="space-y-3">
                                                                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                                                    <Fingerprint size={14} className="text-slate-400" />
                                                                    Identification & Contact
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                                                        <p className="text-[10px] font-medium text-slate-500 uppercase">Emergency Contact</p>
                                                                        <p className="text-xs font-bold text-slate-900 mt-0.5">{onboardingData.emergency_contact || '-'}</p>
                                                                    </div>
                                                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                                                        <p className="text-[10px] font-medium text-slate-500 uppercase">Aadhaar Number</p>
                                                                        <p className="text-xs font-bold text-slate-900 mt-0.5">{salaryData.aadhaar_number || salaryData.aadhaar || '-'}</p>
                                                                    </div>
                                                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                                                        <p className="text-[10px] font-medium text-slate-500 uppercase">PAN Number</p>
                                                                        <p className="text-xs font-bold text-slate-900 mt-0.5">{salaryData.pan_number || salaryData.pan || '-'}</p>
                                                                    </div>
                                                                </div>
                                                            </section>

                                                            <section className="space-y-3">
                                                                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                                                    <DollarSign size={14} className="text-slate-400" />
                                                                    Bank Details
                                                                </h4>
                                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                                                                    <div className="col-span-2 space-y-0.5">
                                                                        <p className="text-[10px] font-medium text-slate-500 uppercase">Bank Name</p>
                                                                        <p className="text-xs font-bold text-slate-900">{salaryData.bank_name || '-'}</p>
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[10px] font-medium text-slate-500 uppercase">Account Number</p>
                                                                        <p className="text-xs font-bold text-slate-900">{salaryData.bank_account_no || salaryData.bank_account || '-'}</p>
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[10px] font-medium text-slate-500 uppercase">IFSC Code</p>
                                                                        <p className="text-xs font-bold text-slate-900">{salaryData.ifsc_code || salaryData.ifsc || '-'}</p>
                                                                    </div>
                                                                </div>
                                                            </section>

                                                            <section className="space-y-3">
                                                                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                                                    <LayoutGrid size={14} className="text-slate-400" />
                                                                    Address Details
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                                                                        <p className="text-[10px] font-medium text-slate-500 uppercase">Current Address</p>
                                                                        <p className="text-xs font-bold text-slate-900 leading-normal">{onboardingData.current_address || onboardingData.address || '-'}</p>
                                                                        {onboardingData.current_pincode && <p className="text-[10px] font-semibold text-slate-400">Pincode: {onboardingData.current_pincode}</p>}
                                                                    </div>
                                                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                                                                        <p className="text-[10px] font-medium text-slate-500 uppercase">Permanent Address</p>
                                                                        <p className="text-xs font-bold text-slate-900 leading-normal">{onboardingData.permanent_address || '-'}</p>
                                                                        {onboardingData.permanent_pincode && <p className="text-[10px] font-semibold text-slate-400">Pincode: {onboardingData.permanent_pincode}</p>}
                                                                    </div>
                                                                </div>
                                                            </section>

                                                            <section className="space-y-3">
                                                                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                                                    <DollarSign size={14} className="text-slate-400" />
                                                                    Proposed Salary Breakdown
                                                                </h4>
                                                                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                                                    <table className="w-full text-left text-[10px]">
                                                                        <thead className="bg-slate-50 border-b border-slate-100">
                                                                            <tr>
                                                                                <th className="px-4 py-2 font-bold text-slate-500 uppercase">Component</th>
                                                                                <th className="px-4 py-2 font-bold text-slate-500 uppercase text-right">Amount</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-50">
                                                                            {(selected.salary_breakdown || []).map((item: any, idx: number) => (
                                                                                <tr key={idx}>
                                                                                    <td className="px-4 py-2 font-semibold text-slate-700">{item.component_name}</td>
                                                                                    <td className="px-4 py-2 font-bold text-slate-900 text-right">₹{item.amount.toLocaleString()}</td>
                                                                                </tr>
                                                                            ))}
                                                                            <tr className="bg-indigo-50/30">
                                                                                <td className="px-4 py-2 font-black text-indigo-600 uppercase">Total Monthly Cost</td>
                                                                                <td className="px-4 py-2 font-black text-indigo-600 text-right text-xs">₹{Number(selected.proposed_salary || 0).toLocaleString()}</td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </section>
                                                        </div>
                                                    );

                                                case 'documents':
                                                    return (
                                                        <div className="space-y-6">
                                                            <section className="space-y-3">
                                                                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                                                    <Briefcase size={14} className="text-slate-400" />
                                                                    Employment History
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    {(details?.employment_history || []).length === 0 ? (
                                                                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                                                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">No previous work history recorded</p>
                                                                        </div>
                                                                    ) : (
                                                                        (details?.employment_history || []).map((e: any, i: number) => (
                                                                            <div key={i} className="p-4 bg-white border border-slate-100 rounded-xl space-y-3 shadow-sm hover:shadow-md transition-shadow">
                                                                                <div className="flex justify-between items-start">
                                                                                    <div>
                                                                                        <p className="text-sm font-bold text-slate-900">{e.company_name}</p>
                                                                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">{e.designation}</p>
                                                                                    </div>
                                                                                    {e.start_date && (
                                                                                        <div className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                                                                            {new Date(e.start_date).toLocaleDateString()} - {e.end_date ? new Date(e.end_date).toLocaleDateString() : 'Present'}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="pt-3 border-t border-slate-50">
                                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-2">Attached Documents</p>
                                                                                    <DocumentPreview docs={perCompany[e.id] || []} onPreview={setPreviewDoc} />
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </section>

                                                            <section className="space-y-3">
                                                                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                                                    <FileText size={14} className="text-slate-400" />
                                                                    Mandatory & Other Documents
                                                                </h4>
                                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[80px]">
                                                                    {generalDocs.length === 0 ? (
                                                                        <div className="flex items-center justify-center h-20">
                                                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">No general documents available</p>
                                                                        </div>
                                                                    ) : (
                                                                        <DocumentPreview docs={generalDocs} onPreview={setPreviewDoc} />
                                                                    )}
                                                                </div>
                                                            </section>
                                                        </div>
                                                    );

                                                case 'journey':
                                                    return (
                                                        <div className="space-y-6">
                                                            <section className="space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                                                        <Clock size={14} className="text-slate-400" />
                                                                        Application Journey
                                                                    </h4>
                                                                    {fetchingHistory && <Loader2 size={12} className="animate-spin text-slate-400" />}
                                                                </div>

                                                                <div className="relative pl-5 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                                                                    {applicationHistory.length === 0 && !fetchingHistory ? (
                                                                        <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-200 text-center">
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">No journey history available</p>
                                                                        </div>
                                                                    ) : (
                                                                        applicationHistory.map((event, idx) => (
                                                                            <div key={idx} className="relative">
                                                                                <div className={`absolute -left-[30px] top-1 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${idx === 0 ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                                                                    {idx === 0 ? <CheckCircle2 size={10} className="text-white" /> : <div className="w-1 h-1 rounded-full bg-white" />}
                                                                                </div>
                                                                                <div className="bg-white border border-slate-50 p-3 rounded-lg shadow-sm hover:shadow transition-shadow">
                                                                                    <div className="flex items-center justify-between mb-1">
                                                                                        <p className="text-[11px] font-bold text-slate-900 uppercase">{event.event_type}</p>
                                                                                        <p className="text-[9px] font-medium text-slate-400">
                                                                                            {new Date(event.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                                                        </p>
                                                                                    </div>
                                                                                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{event.notes}</p>
                                                                                    {event.action_by_name && (
                                                                                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-50">
                                                                                            <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                                                                                                <User size={8} className="text-slate-500" />
                                                                                            </div>
                                                                                            <span className="text-[9px] font-bold text-slate-500 uppercase">{event.action_by_name}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </section>
                                                        </div>
                                                    );
                                            }
                                        })()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 2. Onboarding Proceed Modal (5 Steps) */}
            <AnimatePresence>
                {showOnboardingModal && selected && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
                            onClick={() => !verifying && setShowOnboardingModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-30">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 leading-tight">Create Employee Account</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5, 6].map((s) => (
                                                <div key={s} className={`h-1 w-5 rounded-full transition-colors duration-300 ${s <= step ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">Step {step}: {step === 1 ? 'Personal' : step === 2 ? 'Job' : step === 3 ? 'Attendance' : step === 4 ? 'Salary' : step === 5 ? 'Documents' : 'Review'}</span>
                                    </div>
                                </div>
                                <button onClick={() => !verifying && setShowOnboardingModal(false)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {validationMessage && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-semibold flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-red-600 animate-pulse" />
                                        {validationMessage}
                                    </div>
                                )}

                                <AnimatePresence mode="wait">
                                    {step === 1 && (
                                        <motion.div key="step1" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">First Name *</label>
                                                    <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Last Name *</label>
                                                    <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Email *</label>
                                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="employee@company.com" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Phone Number</label>
                                                    <input inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="10-digit number" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all" />
                                                </div>
                                                <div className="space-y-1.5 col-span-2">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1">Applied Position</label>
                                                    <input disabled value={selected.position_name} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg font-medium text-sm text-slate-400 cursor-not-allowed" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Gender</label>
                                                    <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all">
                                                        <option value="">Select Gender</option>
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Date of Birth</label>
                                                    <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 2 && (
                                        <motion.div key="step2" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Department *</label>
                                                    <select value={departmentId} onChange={e => setDepartmentId(Number(e.target.value))} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all">
                                                        <option value="">Select Department</option>
                                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Role *</label>
                                                    <select value={roleId} onChange={e => setRoleId(Number(e.target.value))} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all">
                                                        <option value="">Select Role</option>
                                                        {roles.filter(r => !departmentId || Number(r.department_id) === Number(departmentId)).map(r => (
                                                            <option key={r.id} value={r.id}>{r.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Designation *</label>
                                                    <input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Senior Software Engineer" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all" />
                                                </div>
                                                <div className="space-y-1.5 relative">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Reporting Manager *</label>
                                                    <div
                                                        onClick={() => setShowManagerDropdown(!showManagerDropdown)}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 cursor-pointer flex justify-between items-center hover:border-slate-300 transition-colors"
                                                    >
                                                        <span className={reportingManagerId ? 'text-slate-900' : 'text-slate-400'}>
                                                            {reportingManagerId ? managers.find(m => m.id === reportingManagerId)?.first_name + ' ' + managers.find(m => m.id === reportingManagerId)?.last_name : 'Select Manager'}
                                                        </span>
                                                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showManagerDropdown ? 'rotate-180' : ''}`} />
                                                    </div>
                                                    {showManagerDropdown && (
                                                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[80] overflow-hidden">
                                                            <div className="p-2 border-b border-slate-50">
                                                                <input
                                                                    autoFocus
                                                                    placeholder="Search manager..."
                                                                    value={managerSearchQuery}
                                                                    onChange={e => setManagerSearchQuery(e.target.value)}
                                                                    className="w-full px-3 py-1.5 bg-slate-50 rounded-md text-xs font-semibold outline-none border-none focus:bg-white transition-colors"
                                                                />
                                                            </div>
                                                            <div className="max-h-40 overflow-y-auto">
                                                                {managers.filter(m => (m.first_name + ' ' + m.last_name).toLowerCase().includes(managerSearchQuery.toLowerCase())).map(m => (
                                                                    <div
                                                                        key={m.id}
                                                                        onClick={() => {
                                                                            setReportingManagerId(m.id);
                                                                            setShowManagerDropdown(false);
                                                                            setManagerSearchQuery('');
                                                                        }}
                                                                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-900 flex flex-col"
                                                                    >
                                                                        <span>{m.first_name} {m.last_name}</span>
                                                                        <span className="text-[9px] text-slate-400 uppercase font-medium">{m.designation || 'Staff'}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Primary Site *</label>
                                                    <select
                                                        value={primarySiteId}
                                                        onChange={e => {
                                                            const sid = Number(e.target.value);
                                                            setPrimarySiteId(sid);
                                                            setAssignedSiteIds(prev => new Set(prev).add(sid));
                                                        }}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                                                    >
                                                        <option value="">Select Primary Site</option>
                                                        {sites.map(s => <option key={s.id} value={s.id}>{s.name || s.site_name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Work Type *</label>
                                                    <select value={workType} onChange={e => setWorkType(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all">
                                                        <option value="">Select Work Type</option>
                                                        <option value="Full-time">Full-time</option>
                                                        <option value="Part-time">Part-time</option>
                                                        <option value="Contract">Contract</option>
                                                        <option value="Internship">Internship</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Join Date *</label>
                                                    <input type="date" value={employmentStartDate} onChange={e => setEmploymentStartDate(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 3 && (
                                        <motion.div key="step3" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-5">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Attendance Policy *</label>
                                                <select value={policyId} onChange={e => setPolicyId(Number(e.target.value))} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all">
                                                    <option value="">Select Policy</option>
                                                    {policies.map(p => <option key={p.id} value={p.id}>{p.policy_name}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Shift Start</label>
                                                    <input type="time" value={shiftStartTime} onChange={e => setShiftStartTime(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Shift End</label>
                                                    <input type="time" value={shiftEndTime} onChange={e => setShiftEndTime(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Weekly Off Days</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                        <button
                                                            key={day}
                                                            onClick={() => toggleWeeklyDay(day)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${weeklyOffDays.has(day) ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                                        >
                                                            {day}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 4 && (
                                        <motion.div key="step4" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Salary Type *</label>
                                                    <select value={salaryType} onChange={e => setSalaryType(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all">
                                                        <option value="">Select</option>
                                                        <option value="Monthly">Monthly</option>
                                                        <option value="Daily">Daily</option>
                                                        <option value="Hourly">Hourly</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Yearly Package (Annual CTC)</label>
                                                    <input
                                                        type="number"
                                                        value={yearlyPackage}
                                                        onChange={e => {
                                                            const v = e.target.value;
                                                            setYearlyPackage(v);
                                                            if (salaryType === 'Monthly' || !salaryType) {
                                                                const y = Number(v);
                                                                setSalaryAmount(y > 0 ? String(Math.round(y / 12)) : '');
                                                                setFinalSalary(y > 0 ? String(Math.round(y / 12)) : '');
                                                            }
                                                        }}
                                                        placeholder="e.g. 600000"
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 col-span-2">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Monthly Salary Amount *</label>
                                                    <div className="relative group">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                                            <DollarSign size={16} />
                                                            <span className="w-px h-4 bg-slate-200" />
                                                        </div>
                                                        <input
                                                            type="number"
                                                            value={salaryAmount || finalSalary}
                                                            onChange={e => { setSalaryAmount(e.target.value); setFinalSalary(e.target.value); }}
                                                            placeholder="0.00"
                                                            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-lg text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                                                        />
                                                    </div>
                                                    {yearlyPackage && Number(yearlyPackage) > 0 && (
                                                        <p className="text-[10px] text-slate-500 mt-1 ml-1">Annual CTC ₹{Number(yearlyPackage).toLocaleString()} ÷ 12 = ₹{Math.round(Number(yearlyPackage) / 12).toLocaleString()}/month</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                                    <LayoutGrid size={14} className="text-slate-400" />
                                                    Salary Breakdown
                                                </h4>
                                                <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-sm">
                                                    <table className="w-full text-left text-xs">
                                                        <thead>
                                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                                <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-tight">Component</th>
                                                                <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-tight">Type</th>
                                                                <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-tight text-right">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {salaryComponents.map(comp => {
                                                                const item = salaryItems.find(i => i.component_id === comp.id);
                                                                return (
                                                                    <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                                                                        <td className="px-4 py-2.5 font-semibold text-slate-700">{comp.component_name}</td>
                                                                        <td className="px-4 py-2.5">
                                                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${comp.component_type === 'Earning' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                                                {comp.component_type}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2.5">
                                                                            <input
                                                                                type="number"
                                                                                value={item?.amount || ''}
                                                                                onChange={e => handleSalaryItemUpdate(comp.id, Number(e.target.value))}
                                                                                className="w-full text-right bg-transparent font-bold text-indigo-600 outline-none focus:border-indigo-600 border border-transparent rounded px-2 py-0.5"
                                                                                placeholder="0.00"
                                                                            />
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                                    <Fingerprint size={14} className="text-slate-400" />
                                                    Additional Debits
                                                </h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {availableDebits.map(debit => {
                                                        const active = assignedDebitIds.has(debit.id);
                                                        return (
                                                            <button
                                                                key={debit.id}
                                                                onClick={() => toggleDebit(debit.id)}
                                                                className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between gap-3 ${active ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className={`text-[11px] font-bold truncate ${active ? 'text-indigo-900' : 'text-slate-700'}`}>{debit.debit_name}</p>
                                                                    <p className="text-[9px] font-medium text-slate-400 uppercase">
                                                                        {debit.debit_type === 'fixed' ? `₹${debit.fixed_amount}` : `${debit.percentage_value}% of Gross`}
                                                                    </p>
                                                                    {debit.description && (
                                                                        <p className="text-[8px] text-slate-400 mt-0.5 leading-tight line-clamp-1">{debit.description}</p>
                                                                    )}
                                                                </div>
                                                                <div className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200'}`}>
                                                                    {active && <Check size={10} strokeWidth={4} />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 5 && (
                                        <motion.div key="step5" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-5">
                                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                                <p className="text-[11px] font-semibold text-indigo-700">These fields are pre-filled from the candidate's onboarding submission. Review and update if needed.</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">PAN Number</label>
                                                    <input
                                                        value={panNumber}
                                                        onChange={e => setPanNumber(e.target.value.toUpperCase())}
                                                        placeholder="ABCDE1234F"
                                                        maxLength={10}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Aadhaar Number</label>
                                                    <input
                                                        value={aadhaarNumber}
                                                        onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                                        placeholder="12-digit Aadhaar"
                                                        inputMode="numeric"
                                                        maxLength={12}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">PF / UAN Number</label>
                                                    <input
                                                        value={pfUan}
                                                        onChange={e => setPfUan(e.target.value)}
                                                        placeholder="UAN number"
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Bank Account No.</label>
                                                    <input
                                                        value={bankAccountNo}
                                                        onChange={e => setBankAccountNo(e.target.value)}
                                                        placeholder="Account number"
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">IFSC Code</label>
                                                    <input
                                                        value={ifscCode}
                                                        onChange={e => setIfscCode(e.target.value.toUpperCase())}
                                                        placeholder="SBIN0000123"
                                                        maxLength={11}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tight ml-1">Bank Name</label>
                                                    <input
                                                        value={bankName}
                                                        onChange={e => setBankName(e.target.value)}
                                                        placeholder="e.g. State Bank of India"
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 6 && (
                                        <motion.div key="step6" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-6">
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                                                    {firstName[0]?.toUpperCase() || selected.candidate_name[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-900 leading-tight">{firstName} {lastName}</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{email || selected.candidate_email}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-white border border-slate-100 rounded-lg space-y-3 shadow-sm">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Job Information</h4>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-medium text-slate-500">Department</span>
                                                            <span className="text-[10px] font-bold text-slate-900">{departments.find(d => d.id === departmentId)?.name || '-'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-medium text-slate-500">Role</span>
                                                            <span className="text-[10px] font-bold text-slate-900">{roles.find(r => r.id === roleId)?.name || '-'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-medium text-slate-500">Work Type</span>
                                                            <span className="text-[10px] font-bold text-slate-900">{workType || '-'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-medium text-slate-500">Join Date</span>
                                                            <span className="text-[10px] font-bold text-slate-900">{employmentStartDate || '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-white border border-slate-100 rounded-lg space-y-3 shadow-sm">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Attendance & Site</h4>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-medium text-slate-500">Primary Site</span>
                                                            <span className="text-[10px] font-bold text-slate-900 truncate ml-2 text-right">{sites.find(s => s.id === primarySiteId)?.name || sites.find(s => s.id === primarySiteId)?.site_name || '-'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-medium text-slate-500">Shift</span>
                                                            <span className="text-[10px] font-bold text-slate-900">{shiftStartTime && shiftEndTime ? `${shiftStartTime} – ${shiftEndTime}` : 'Not set'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-medium text-slate-500">Weekly Off</span>
                                                            <span className="text-[10px] font-bold text-slate-900">{weeklyOffDays.size > 0 ? Array.from(weeklyOffDays).join(', ') : 'None'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-slate-900 rounded-lg col-span-full flex items-center justify-between shadow-lg">
                                                    <div>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Monthly Salary</p>
                                                        <p className="text-2xl font-bold text-white">₹{Number(salaryAmount || finalSalary || 0).toLocaleString()}</p>
                                                        {yearlyPackage && Number(yearlyPackage) > 0 && (
                                                            <p className="text-[9px] text-slate-400 mt-0.5">Annual CTC: ₹{Number(yearlyPackage).toLocaleString()}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Active Debits</p>
                                                        <p className="text-lg font-bold text-white">{assignedDebitIds.size}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
                                <button
                                    onClick={() => step > 1 && setStep(step - 1)}
                                    disabled={step === 1 || verifying}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${step === 1 ? 'invisible' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <ChevronLeft size={16} />
                                    Previous Step
                                </button>

                                {step < 6 ? (
                                    <button
                                        onClick={() => setStep(step + 1)}
                                        className="px-6 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2"
                                    >
                                        Next
                                        <ArrowRight size={16} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={saveOnboardingEmployee}
                                        disabled={verifying}
                                        className="px-6 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {verifying ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Creating Employee...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} />
                                                Create Employee Account
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {previewDoc && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setPreviewDoc(null)}
                    >
                        <motion.button
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            onClick={() => setPreviewDoc(null)}
                        >
                            <X size={24} />
                        </motion.button>

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="max-w-5xl w-full max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                        {previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                                            <FileText size={24} className="text-white" />
                                        ) : (
                                            <FileImage size={24} className="text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900">{previewDoc.name}</h3>
                                        <p className="text-sm font-medium text-gray-500 mt-1">
                                            {previewDoc.url.toLowerCase().endsWith('.pdf') ? 'PDF Document' : 'Image File'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={previewDoc.url}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-3 bg-gray-50 hover:bg-black hover:text-white rounded-2xl transition-all flex items-center gap-2 group"
                                    >
                                        <Download size={18} />
                                        <span className="text-sm font-medium hidden group-hover:block">Download</span>
                                    </a>
                                </div>
                            </div>

                            <div className="p-6 flex items-center justify-center bg-gray-50 min-h-[400px]">
                                {previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                                    <iframe
                                        src={previewDoc.url}
                                        className="w-full h-[70vh] rounded-xl border-2 border-gray-200 shadow-lg"
                                        title="PDF Preview"
                                    />
                                ) : (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <img
                                            src={previewDoc.url}
                                            alt="preview"
                                            className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border-2 border-gray-200"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const parent = target.parentElement;
                                                if (parent) {
                                                    const errorDiv = document.createElement('div');
                                                    errorDiv.className = 'text-center p-8';
                                                    errorDiv.innerHTML = `
                                                        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                            <FileWarning size={32} class="text-gray-400" />
                                                        </div>
                                                        <h4 class="text-lg font-bold text-gray-700 mb-2">Unable to preview file</h4>
                                                        <p class="text-sm text-gray-500">This file type cannot be previewed in the browser</p>
                                                        <a href="${previewDoc.url}" download class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                                            <Download size={16} />
                                                            Download File
                                                        </a>
                                                    `;
                                                    parent.appendChild(errorDiv);
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
