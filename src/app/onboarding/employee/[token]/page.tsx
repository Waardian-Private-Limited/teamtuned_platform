'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { encryptPassword } from '@/lib/crypto';

interface PrefillOrg { id: number; name: string; status: string; logo_url?: string | null }
interface PrefillUser { id: number; email: string; status: string }

type SalaryComponent = { name: string; type: 'credit' | 'debit'; amount: number; is_taxable?: boolean };
type LeaveBalance = { leave_type: string; total_allocated: number; used?: number; carry_forward?: boolean; expiry_date?: string | null };

// Define attendance policy details type used for read-only display
type AttendancePolicyDetails = {
  grace_period_minutes?: number;
  max_late_marks_per_month?: number;
  late_mark_penalty?: number;
  standard_work_hours?: number;
  late_logout_redeem_minutes?: number;
  auto_convert_to_compoff?: boolean;
  min_extra_work_for_compoff_minutes?: number;
  compoff_requires_approval?: boolean;
};

type EmployeePrefill = {
  id?: number;
  first_name?: string;
  last_name?: string;
  gender?: string | null;
  date_of_birth?: string | null;
  phone_number?: string | null;
  email?: string;
  department_id?: number | null;
  role_id?: number | null;
  reporting_manager_id?: number | null;
  work_type?: string | null;
  employment_start_date?: string | null;
  incharge?: boolean;
  allow_punch_from_hq?: boolean;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  attendance_policy_id?: number | null;
  flexible_time?: boolean;
  flexible_hours?: number | null;
  salary_type?: string | null;
  salary_amount?: number | null;
  yearly_package?: number | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_relation?: string | null;
  site_ids?: number[];
  weekly_off_days?: string[];
  salary_breakdown?: SalaryComponent[];
  permanent_address?: string | null;
  permanent_pincode?: string | null;
  current_address?: string | null;
  current_pincode?: string | null;
  bank_account_no?: string | null;
  ifsc_code?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  pan_number?: string | null;
  aadhaar_number?: string | null;
  leave_balances?: LeaveBalance[];
  // New display-only fields
  department_name?: string | null;
  role_name?: string | null;
  reporting_manager_name?: string | null;
  site_names?: string[];
  attendance_policy_name?: string | null;
  attendance_policy?: AttendancePolicyDetails;
};

interface ValidateResponse {
  success: boolean;
  organization: PrefillOrg;
  invitedUser: PrefillUser;
  employee?: EmployeePrefill | null;
  message?: string;
}

export default function EmployeeOnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params);
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [organization, setOrganization] = React.useState<PrefillOrg | null>(null);
  const [invitedUser, setInvitedUser] = React.useState<PrefillUser | null>(null);
  const [form, setForm] = React.useState<EmployeePrefill>({});
  const [saving, setSaving] = React.useState(false);

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showSuccess, setShowSuccess] = React.useState(false);

  // Compute read-only values for display
  const nonEditable = React.useMemo(() => ({
    department: form.department_name || '-',
    role: form.role_name || '-',
    reporting_manager: form.reporting_manager_name || '-',
    work_type: form.work_type || '-',
    employment_start_date: form.employment_start_date || '-',
    shift_start_time: form.shift_start_time || '-',
    shift_end_time: form.shift_end_time || '-',
    flexible_time: !!form.flexible_time,
    flexible_hours: form.flexible_hours,
    attendance_policy_name: form.attendance_policy_name || '-',
    attendance_policy: form.attendance_policy,
    salary_type: form.salary_type || '-',
    salary_amount: form.salary_amount,
    yearly_package: form.yearly_package,
    salary_breakdown: form.salary_breakdown || [],
    weekly_off_days: form.weekly_off_days || [],
    site_names: form.site_names || [],
    leave_balances: form.leave_balances || [],
  }), [form]);

  // Required editable fields (only essential information)
  const REQUIRED_FIELDS: Array<keyof EmployeePrefill> = [
    'first_name',
    'last_name',
    'email',
    'phone_number',
    'gender',
    'date_of_birth',
  ];

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient<ValidateResponse>(`/onboarding/employee/validate/${encodeURIComponent(token)}`, { method: 'GET' });
        if (data && data.success) {
          setOrganization(data.organization);
          setInvitedUser(data.invitedUser);
          const emp = data.employee || {};
          setForm({ ...emp, email: emp.email || data.invitedUser?.email });
        } else {
          setError(data?.message || 'Invalid or expired token');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to validate token');
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const update = <K extends keyof EmployeePrefill>(key: K, value: EmployeePrefill[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (REQUIRED_FIELDS.includes(key)) {
      const isEmpty = value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
      setFieldErrors(prev => {
        const next = { ...prev };
        if (isEmpty) next[String(key)] = 'Required';
        else delete next[String(key)];
        return next;
      });
    }
  };

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [ifscLoading, setIfscLoading] = React.useState(false);
  const [sameAsCurrent, setSameAsCurrent] = React.useState(false);

  const fetchIfscDetails = async (ifsc: string) => {
    try {
      if (!ifsc || ifsc.length < 4) return;
      setIfscLoading(true);
      const res = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`);
      if (!res.ok) throw new Error('Invalid IFSC code');
      const data = await res.json();
      // Razorpay IFSC API returns BANK and BRANCH among other fields
      const bankName: string | undefined = data?.BANK;
      const branchName: string | undefined = data?.BRANCH;
      setForm(prev => ({
        ...prev,
        bank_name: bankName || prev.bank_name || '',
        bank_branch: branchName || prev.bank_branch || '',
      }));
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch IFSC details');
    } finally {
      setIfscLoading(false);
    }
  };

  // Sync permanent address/pincode when same-as-current is enabled
  React.useEffect(() => {
    if (sameAsCurrent) {
      setForm(prev => ({
        ...prev,
        permanent_address: prev.current_address || '',
        permanent_pincode: prev.current_pincode || '',
      }));
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next['permanent_address'];
        delete next['permanent_pincode'];
        return next;
      });
    }
  }, [sameAsCurrent, form.current_address, form.current_pincode]);

  const validateRequired = (): string | null => {
    const missing: string[] = [];
    const errs: Record<string, string> = {};
    REQUIRED_FIELDS.forEach(key => {
      const v = (form[key] as any);
      const isEmpty = v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
      if (isEmpty) {
        missing.push(String(key));
        errs[String(key)] = 'Required';
      }
    });
    setFieldErrors(errs);
    if (missing.length > 0) {
      return `Please fill all required fields`;
    }
    return null;
  };

  const complete = async () => {
    setSaving(true);
    setError(null);
    try {
      // Validate required fields (all except banking fields)
      const reqErr = validateRequired();
      if (reqErr) {
        setError(reqErr);
        setSaving(false);
        return;
      }

      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters');
        setSaving(false);
        return;
      }
      // Require at least one uppercase, one number, and one special character
      const hasUpper = /[A-Z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);
      if (!hasUpper || !hasNumber || !hasSpecial) {
        setError('Password must include an uppercase letter, a number, and a special character');
        setSaving(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setSaving(false);
        return;
      }

      // Build details from current state without modifying read-only arrays
      const details: EmployeePrefill = { ...form };

      const passwordEnc = await encryptPassword(password);
      await apiClient('/onboarding/employee/complete', {
        method: 'POST',
        body: { token, password, confirmPassword, passwordEnc, details },
      });
      setShowSuccess(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to complete onboarding');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-3 text-gray-700">
          <div className="h-10 w-10 border-b-2 border-gray-700 rounded-full animate-spin" />
          <p className="text-sm">Validating invite...</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-white rounded-xl p-6 w-full max-w-md text-center space-y-4 border shadow-sm">
          <h2 className="text-xl font-semibold text-black-700">Onboarding Complete</h2>
          <p className="text-gray-600">You can now log in to your account.</p>
          <button onClick={() => router.replace('/login')} className="w-full bg-blue-600 text-white py-3 rounded-xl">Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black py-8">
      {/* Brand header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={'/assets/teamTunedLogos.png'} alt="TeamTuned" className="w-10 h-10 rounded object-cover" />
          <div className="flex flex-col">
            <div className="text-lg font-semibold">TeamTuned</div>
            <div className="text-xs text-gray-400 italic">Crafted By Waardian</div>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-4xl">
        <div className="bg-white rounded-xl p-6 space-y-6 border shadow-sm">
          <div className="text-center space-y-2">
            {organization?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={organization.logo_url} alt="Logo" className="h-12 mx-auto" />
            ) : null}
            <h1 className="text-lg font-semibold">Welcome, {form?.first_name || ''} to {organization?.name || 'TeamTuned'}</h1>
            <p className="text-sm text-gray-600">Please review details and set a password.</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">{error}</div>}

          {/* Profile (editable) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">First Name <span className="text-red-600">*</span></label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['first_name'] ? 'border-red-500' : 'border-gray-300'}`} value={form.first_name || ''} onChange={e => update('first_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Last Name <span className="text-red-600">*</span></label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['last_name'] ? 'border-red-500' : 'border-gray-300'}`} value={form.last_name || ''} onChange={e => update('last_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Email <span className="text-red-600">*</span></label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['email'] ? 'border-red-500' : 'border-gray-300'}`} value={form.email || ''} onChange={e => update('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Phone <span className="text-red-600">*</span></label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['phone_number'] ? 'border-red-500' : 'border-gray-300'}`} value={form.phone_number || ''} onChange={e => update('phone_number', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Gender <span className="text-red-600">*</span></label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['gender'] ? 'border-red-500' : 'border-gray-300'}`} value={form.gender || ''} onChange={e => update('gender', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Date of Birth <span className="text-red-600">*</span></label>
              <input type="date" className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['date_of_birth'] ? 'border-red-500' : 'border-gray-300'}`} value={form.date_of_birth || ''} onChange={e => update('date_of_birth', e.target.value)} />
            </div>
          </div>

          {/* Emergency Contact (editable) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Emergency Contact Name</label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['emergency_contact_name'] ? 'border-red-500' : 'border-gray-300'}`} value={form.emergency_contact_name || ''} onChange={e => update('emergency_contact_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Emergency Contact Relation</label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['emergency_contact_relation'] ? 'border-red-500' : 'border-gray-300'}`} value={form.emergency_contact_relation || ''} onChange={e => update('emergency_contact_relation', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Emergency Contact Number</label>
              <input type="tel" className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['emergency_contact_number'] ? 'border-red-500' : 'border-gray-300'}`} value={form.emergency_contact_number || ''} onChange={e => update('emergency_contact_number', e.target.value)} />
            </div>
          </div>

          {/* Organization (read-only) */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Organization</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-600">Department</div>
                <div className="font-semibold">{nonEditable.department || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Role</div>
                <div className="font-semibold">{nonEditable.role || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Reporting Manager</div>
                <div className="font-semibold">{nonEditable.reporting_manager || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Work Type</div>
                <div className="font-semibold">{nonEditable.work_type || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Employment Start Date</div>
                <div className="font-semibold">{nonEditable.employment_start_date || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Flexible Time</div>
                <div className="font-semibold">{nonEditable.flexible_time ? 'Yes' : 'No'}</div>
              </div>
              {nonEditable.flexible_time ? (
                <div>
                  <div className="text-xs text-gray-600">Flexible Hours</div>
                  <div className="font-semibold">{nonEditable.flexible_hours ?? '-'}</div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-xs text-gray-600">Shift Start Time</div>
                    <div className="font-semibold">{nonEditable.shift_start_time || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Shift End Time</div>
                    <div className="font-semibold">{nonEditable.shift_end_time || '-'}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Attendance Policy (read-only) */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Attendance Policy</h2>
            <div>
              <div className="text-xs text-gray-600">Policy</div>
              <div className="font-semibold">{nonEditable.attendance_policy_name || '-'}</div>
            </div>
            {nonEditable.attendance_policy && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-600">Grace Period (mins)</div>
                  <div className="font-semibold">{nonEditable.attendance_policy.grace_period_minutes ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Max Late Marks/Month</div>
                  <div className="font-semibold">{nonEditable.attendance_policy.max_late_marks_per_month ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Late Mark Penalty</div>
                  <div className="font-semibold">{nonEditable.attendance_policy.late_mark_penalty ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Standard Work Hours(Mins)</div>
                  <div className="font-semibold">{nonEditable.attendance_policy.standard_work_hours ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Late Logout Redeem (mins)</div>
                  <div className="font-semibold">{nonEditable.attendance_policy.late_logout_redeem_minutes ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Auto Convert To Compoff</div>
                  <div className="font-semibold">{nonEditable.attendance_policy.auto_convert_to_compoff ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Min Extra Work For Compoff (mins)</div>
                  <div className="font-semibold">{nonEditable.attendance_policy.min_extra_work_for_compoff_minutes ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Compoff Requires Approval</div>
                  <div className="font-semibold">{nonEditable.attendance_policy.compoff_requires_approval ? 'Yes' : 'No'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Salary (read-only) */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Salary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-600">Salary Type</div>
                <div className="font-semibold">{nonEditable.salary_type || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Salary Amount</div>
                <div className="font-semibold">{nonEditable.salary_amount ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Yearly Package</div>
                <div className="font-semibold">{nonEditable.yearly_package ?? '-'}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Salary Breakdown</div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {(nonEditable.salary_breakdown || []).length === 0 && (
                  <div className="p-3 text-sm">No salary components</div>
                )}
                {(nonEditable.salary_breakdown || []).map((c: SalaryComponent, idx: number) => (
                  <div key={idx} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 border-t border-gray-100">
                    <div className="font-semibold">{c.name}</div>
                    <div>{c.type === 'credit' ? 'Earning' : 'Deduction'}</div>
                    <div className="text-right">{c.amount}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly Off Days (read-only) */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Weekly Off Days</h2>
            <div className="flex flex-wrap gap-2">
              {(nonEditable.weekly_off_days || []).map((d: string, idx: number) => (
                <span key={idx} className="px-3 py-1 border border-gray-200 rounded-full">{d}</span>
              ))}
              {(!nonEditable.weekly_off_days || nonEditable.weekly_off_days.length === 0) && <span>-</span>}
            </div>
          </div>

          {/* Sites (read-only) */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Sites</h2>
            <div className="flex flex-wrap gap-2">
              {(nonEditable.site_names || []).map((s: string, idx: number) => (
                <span key={idx} className="px-3 py-1 border border-gray-200 rounded-full">{s}</span>
              ))}
              {(!nonEditable.site_names || nonEditable.site_names.length === 0) && <span>-</span>}
            </div>
          </div>

          {/* Leave Balances (read-only) */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Leave Balances</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {(nonEditable.leave_balances || []).length === 0 && (
                <div className="p-3 text-sm">No leave data</div>
              )}
              {(nonEditable.leave_balances || []).map((l: LeaveBalance, idx: number) => (
                <div key={idx} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 border-t border-gray-100">
                  <div className="font-semibold">{l.leave_type.toUpperCase()}</div>
                  <div>Total: {l.total_allocated}</div>
                  <div>Carry Forward: {l.carry_forward ? 'Yes' : 'No'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Addresses (editable) */}
          <div className="flex items-center gap-3 mb-2">
            <input type="checkbox" checked={sameAsCurrent} onChange={e => setSameAsCurrent(e.target.checked)} />
            <span className="text-sm text-gray-700">Permanent address same as current</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Permanent Address</label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['permanent_address'] ? 'border-red-500' : 'border-gray-300'}`} value={form.permanent_address || ''} onChange={e => update('permanent_address', e.target.value)} disabled={sameAsCurrent} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Permanent Pincode</label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['permanent_pincode'] ? 'border-red-500' : 'border-gray-300'}`} value={form.permanent_pincode || ''} onChange={e => update('permanent_pincode', e.target.value)} disabled={sameAsCurrent} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Current Address</label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['current_address'] ? 'border-red-500' : 'border-gray-300'}`} value={form.current_address || ''} onChange={e => update('current_address', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Current Pincode</label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['current_pincode'] ? 'border-red-500' : 'border-gray-300'}`} value={form.current_pincode || ''} onChange={e => update('current_pincode', e.target.value)} />
            </div>
          </div>

          {/* Bank (editable) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Bank Account No <span className="text-gray-500"></span></label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-black" value={form.bank_account_no || ''} onChange={e => update('bank_account_no', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">IFSC Code <span className="text-gray-500"></span></label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-black" value={form.ifsc_code || ''} onChange={e => update('ifsc_code', e.target.value)} onBlur={() => fetchIfscDetails(form.ifsc_code || '')} />
              {ifscLoading && <div className="text-xs text-gray-500 mt-1">Fetching IFSC details…</div>}
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Bank Name <span className="text-gray-500"></span></label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-black" value={form.bank_name || ''} onChange={e => update('bank_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Bank Branch <span className="text-gray-500"></span></label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-black" value={form.bank_branch || ''} onChange={e => update('bank_branch', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">PAN Number</label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['pan_number'] ? 'border-red-500' : 'border-gray-300'}`} value={form.pan_number || ''} onChange={e => update('pan_number', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Aadhaar Number</label>
              <input className={`w-full border rounded-lg px-3 py-2 bg-white text-black ${fieldErrors['aadhaar_number'] ? 'border-red-500' : 'border-gray-300'}`} value={form.aadhaar_number || ''} onChange={e => update('aadhaar_number', e.target.value)} />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Password <span className="text-red-600">*</span></label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-black" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Confirm Password <span className="text-red-600">*</span></label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-black" placeholder="••••••••" />
            </div>
            <button onClick={complete} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-xl">{saving ? 'Saving...' : 'Complete Onboarding'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}