"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { Send, DollarSign } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function OnboardingStatusContent() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [finalSalary, setFinalSalary] = useState<string>('');
  const [sendingLetter, setSendingLetter] = useState(false);
  const [updatingSalary, setUpdatingSalary] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [includeSalaryInLetter, setIncludeSalaryInLetter] = useState(false);
  const [linkGenerating, setLinkGenerating] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkExpires, setLinkExpires] = useState<string | null>(null);
  const { organization } = useAuth();
  const ModalPortal = ({ children }: { children: React.ReactNode }) => {
    if (typeof document === 'undefined') return null;
    return createPortal(children, document.body);
  };

  useEffect(() => {
    const fetchCandidates = async () => {
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
    fetchCandidates();
  }, []);

  const confirmSendAppointment = async () => {
    if (!selected) return;
    setSendingLetter(true);
    try {
      const res = await apiClient.post(`/hiring-onboarding/applications/${selected.id}/appointment`, { include_salary: includeSalaryInLetter }, { withAuth: true });
      if (res.success) {
        toast.success('Appointment letter sent');
        setPreviewOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send appointment letter');
    } finally {
      setSendingLetter(false);
    }
  };

  const generateOnboardingLink = async () => {
    if (!selected) return;
    setLinkGenerating(true);
    setLinkToken(null);
    setLinkExpires(null);
    try {
      const res = await apiClient.post(`/hiring-onboarding/links/${selected.id}`, {}, { withAuth: true });
      if (res.success && res.data?.token) {
        setLinkToken(res.data.token);
        setLinkExpires(res.data.expires_at || null);
        toast.success('Onboarding link generated');
      } else {
        toast.error('Failed to generate link');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate link');
    } finally {
      setLinkGenerating(false);
    }
  };

  const addSalary = async () => {
    if (!selected) return;
    setUpdatingSalary(true);
    try {
      const res = await apiClient.post(`/hiring-onboarding/applications/${selected.id}/salary`, {
        final_salary: finalSalary
      }, { withAuth: true });
      if (res.success) {
        toast.success('Salary updated');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update salary');
    } finally {
      setUpdatingSalary(false);
    }
  };

  const verifyOnboarding = async () => {
    if (!selected) return;
    try {
      const res = await apiClient.post(`/onboarding-status/applications/${selected.id}/verify`, {}, { withAuth: true });
      if (res.success) {
        toast.success('Onboarding verified');
        setSelected({ ...selected, hr_onboarding_verified: 1 });
        setCandidates(prev => prev.map(c => c.id === selected.id ? { ...c, hr_onboarding_verified: 1 } : c));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify onboarding');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Onboarding Status</h2>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="text-left py-2">Candidate</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(c => {
                  const completed = !!(c.onboarding_details || c.onboarding_documents);
                  return (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2">
                        <button
                          className="text-left font-bold hover:underline"
                          onClick={() => {
                            setSelected(c);
                            setFinalSalary(c.proposed_salary || '');
                          }}
                        >
                          {c.candidate_name}
                        </button>
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded-full font-bold ${completed ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}>
                          {completed ? 'Completed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black">Public Onboarding Link</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={generateOnboardingLink}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-2xl text-sm font-bold hover:border-black transition-all"
                  disabled={linkGenerating}
                >
                  {linkGenerating ? 'Generating...' : 'Generate Link'}
                </button>
                {linkToken && (
                  <>
                    <button
                      type="button"
                      className="px-4 py-2 bg-black text-white rounded-2xl font-black"
                      onClick={async () => {
                        const url = `${window.location.origin}/public/onboarding?token=${linkToken}&orgId=${organization?.id}`;
                        await navigator.clipboard.writeText(url);
                        toast.success('Link copied');
                      }}
                    >
                      Copy Link
                    </button>
                  </>
                )}
              </div>
              {linkToken && (
                <div className="text-xs text-gray-600">
                  Link: <span className="font-bold break-all">{`${window.location.origin}/public/onboarding?token=${linkToken}&orgId=${organization?.id}`}</span>
                  {linkExpires && <div>Expires: {new Date(linkExpires).toLocaleString()}</div>}
                </div>
              )}
            </div>

      <div className="lg:col-span-2">
        <h2 className="text-xl font-black">Actions</h2>
        {!selected ? (
          <p className="text-gray-500">Select a candidate from the sidebar to manage appointment letter and salary.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-black">{selected.candidate_name}</p>
                <p className="text-xs text-gray-500 uppercase font-bold">{selected.position_name}</p>
                <p className="text-xs text-gray-500 font-medium">{selected.candidate_email} • {selected.candidate_phone}</p>
                {selected.location && (
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Location: {selected.location}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setIncludeSalaryInLetter(false); setPreviewOpen(true); }}
                className="px-4 py-2 bg-black text-white rounded-2xl font-black flex items-center gap-2"
              >
                <Send size={18} />
                Preview Appointment Letter
              </button>
            </div>

            {(() => {
              let details: any = null;
              let docs: any = null;
              try { details = selected.onboarding_details ? JSON.parse(selected.onboarding_details) : null; } catch {}
              try { docs = selected.onboarding_documents ? JSON.parse(selected.onboarding_documents) : null; } catch {}
              const perCompany = (docs?.per_company) || {};
              const generalDocs = (docs?.general) || [];
              const isDPune = String(selected.location || '').toLowerCase().includes('dpune') || String(selected.location || '').toLowerCase().includes('pune');
              const mandated = isDPune ? ['experience','reliev','salary','bank','uan'] : ['experience','salary'];
              const missing: string[] = [];
              if (details?.employment_history && Array.isArray(details.employment_history)) {
                for (const entry of details.employment_history) {
                  const uploaded = (perCompany[entry.id] || []).map((d: any) => (d.name || d.filename || d.url || '').toLowerCase());
                  for (const key of mandated) {
                    if (!uploaded.some((n: string) => n.includes(key))) {
                      if (key === 'experience') missing.push('Experience Letter');
                      else if (key === 'reliev') missing.push('Relieving Letter');
                      else if (key === 'salary') missing.push('Last 3 Months Salary Slips');
                      else if (key === 'bank') missing.push('Bank Statement');
                      else if (key === 'uan') missing.push('PF UAN Details');
                    }
                  }
                }
              }
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black">Candidate Submitted Details</h3>
                    <button type="button" onClick={() => setShowDetails(s => !s)} className="text-xs font-bold text-gray-600">
                      {showDetails ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Address</p>
                        <p className="text-sm font-bold">{details?.details?.address || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Bank Account</p>
                        <p className="text-sm font-bold">{details?.details?.bank_account || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">IFSC</p>
                        <p className="text-sm font-bold">{details?.details?.ifsc || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Emergency Contact</p>
                        <p className="text-sm font-bold">{details?.details?.emergency_contact || '-'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase">General Documents</p>
                        <ul className="text-xs text-gray-600">
                          {generalDocs.length ? generalDocs.map((d: any, i: number) => <li key={i} className="truncate">{d.name || d.filename || d.url}</li>) : <li>None</li>}
                        </ul>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Employment History</p>
                        <div className="space-y-2">
                          {(details?.employment_history || []).map((e: any, i: number) => (
                            <div key={i} className="p-3 bg-white border border-gray-100 rounded-xl">
                              <p className="text-xs font-bold">{e.company_name}</p>
                              <p className="text-[10px] text-gray-500">Designation: {e.designation || '-'}</p>
                              {(() => {
                                const docsForCompany = (perCompany[e.id] || []);
                                const byType: Record<string, any[]> = {};
                                for (const d of docsForCompany) {
                                  const type = (d.label || d.name || 'Other');
                                  byType[type] = byType[type] || [];
                                  byType[type].push(d);
                                }
                                const order = [
                                  'Experience Letter',
                                  'Relieving Letter',
                                  'Last 3 Months Salary Slips',
                                  'PF / UAN Details Document',
                                  'Bank Statement',
                                  'Form 16',
                                  'Promotion / Increment Letter',
                                  'Other'
                                ];
                                return (
                                  <div className="mt-2 space-y-2">
                                    {order.map((label) => {
                                      const list = byType[label] || [];
                                      if (!list.length) return null;
                                      return (
                                        <div key={label}>
                                          <p className="text-[10px] font-black text-gray-400 uppercase">{label}</p>
                                          <ul className="text-[11px] text-gray-600 mt-1">
                                            {list.map((d, j) => (
                                              <li key={j} className="truncate">{d.filename || d.url || d.name}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                              {(() => {
                                const docsForCompany = (perCompany[e.id] || []);
                                const names = docsForCompany.map((d: any) => String(d.name || d.label || '').toLowerCase());
                                const requiredKeys = isDPune ? ['experience','reliev','salary','bank','uan'] : ['experience','salary'];
                                const missingThis = requiredKeys.filter((k: string) => !names.some((n: string) => n.includes(k)));
                                return missingThis.length ? (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-xl text-[11px] font-bold text-yellow-800">
                                    Missing for {e.company_name || 'company'}: {missingThis.map(m => {
                                      if (m === 'experience') return 'Experience Letter';
                                      if (m === 'reliev') return 'Relieving Letter';
                                      if (m === 'salary') return 'Last 3 Months Salary Slips';
                                      if (m === 'bank') return 'Bank Statement';
                                      if (m === 'uan') return 'PF / UAN Details Document';
                                      return m;
                                    }).join(', ')}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          ))}
                        </div>
                      </div>
                      {missing.length > 0 && (
                        <div className="md:col-span-2">
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs font-bold text-yellow-800">
                            Missing mandatory documents{isDPune ? ' for dPune' : ''}: {missing.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Salary</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input
                  type="text"
                  value={finalSalary}
                  onChange={e => setFinalSalary(e.target.value)}
                  placeholder="e.g. 5,00,000"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                />
              </div>
              <button
                type="button"
                onClick={addSalary}
                disabled={updatingSalary || !selected?.hr_onboarding_verified}
                className="px-4 py-2 bg-white border border-gray-200 rounded-2xl text-sm font-bold hover:border-black transition-all"
              >
                {updatingSalary ? 'Updating...' : 'Add Salary'}
              </button>
              
              {!selected?.hr_onboarding_verified && (
                <div className="text-xs text-gray-500 mt-2">
                  Verify onboarding to enable appointment letter and salary actions.
                </div>
              )}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={verifyOnboarding}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-2xl text-sm font-bold hover:border-black transition-all"
                >
                  Verify Onboarding
                </button>
              </div>
            </div>

            {previewOpen && (
              <ModalPortal>
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                  <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black">Appointment Letter Preview</h3>
                    <button className="text-sm font-bold text-gray-500" onClick={() => setPreviewOpen(false)}>Close</button>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-sm">Dear {selected.candidate_name},</p>
                      <p className="text-sm mt-2">
                        We are pleased to offer you the position of <span className="font-bold">{selected.position_name}</span>
                        {selected.location ? <> at our <span className="font-bold">{selected.location}</span> location</> : null}.
                      </p>
                      {!includeSalaryInLetter ? (
                        <p className="text-sm mt-2 text-gray-600">Salary details will be shared separately.</p>
                      ) : (
                        <p className="text-sm mt-2">Your final salary: <span className="font-bold">{finalSalary || selected.final_salary || 'TBD'}</span></p>
                      )}
                      <p className="text-sm mt-2">
                        Please proceed with onboarding formalities and document verification.
                      </p>
                      <p className="text-sm mt-4">Regards,<br />HR Team</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input type="checkbox" checked={includeSalaryInLetter} onChange={e => setIncludeSalaryInLetter(e.target.checked)} />
                      Show salary in appointment letter
                    </label>
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" className="px-4 py-2 bg-white border border-gray-200 rounded-2xl text-sm font-bold" onClick={() => setPreviewOpen(false)}>Cancel</button>
                      <button type="button" className="px-4 py-2 bg-black text-white rounded-2xl font-black" onClick={confirmSendAppointment} disabled={sendingLetter || !selected?.hr_onboarding_verified}>
                        {sendingLetter ? 'Sending...' : 'Send Letter'}
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              </ModalPortal>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <OnboardingStatusContent />
    </Suspense>
  );
}
