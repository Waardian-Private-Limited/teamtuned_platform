"use client";

import React, { useEffect, useState, Suspense } from 'react';
import GlobalHeader from '@/components/shared/GlobalHeader';
import GlobalFooter from '@/components/shared/GlobalFooter';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Send, DollarSign } from 'lucide-react';

function OnboardingStatusContent() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [finalSalary, setFinalSalary] = useState<string>('');
  const [sendingLetter, setSendingLetter] = useState(false);
  const [updatingSalary, setUpdatingSalary] = useState(false);
  const { organization } = useAuth();

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
    <div className="min-h-screen bg-gray-50">
      <GlobalHeader role="org-admin" />
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white rounded-[40px] shadow-sm border border-gray-100 p-6">
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
              <div className="mt-4 text-xs text-gray-500">
                Example: Candidate Kasim — status displays in the table when loaded.
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-[40px] shadow-sm border border-gray-100 p-8">
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
                </div>
                <button
                  type="button"
                  onClick={sendAppointment}
                  disabled={sendingLetter || !selected?.hr_onboarding_verified}
                  className="px-4 py-2 bg-black text-white rounded-2xl font-black flex items-center gap-2"
                >
                  <Send size={18} />
                  {sendingLetter ? 'Sending...' : 'Send Appointment Letter'}
                </button>
              </div>

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
            </div>
          )}
        </div>
      </div>
      <GlobalFooter orgName={organization?.name} />
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
