"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload, Send, Plus, Trash2 } from 'lucide-react';
import GlobalHeader from '@/components/shared/GlobalHeader';
import GlobalFooter from '@/components/shared/GlobalFooter';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';

function OnboardingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const orgId = searchParams.get('orgId');
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState<any>({
    address: '',
    bank_account: '',
    ifsc: '',
    emergency_contact: '',
    pan: '',
    aadhaar: ''
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [employmentHistory, setEmploymentHistory] = useState<any[]>([]);
  const [companyDocs, setCompanyDocs] = useState<Record<number, any[]>>({});
  const [companyDocType, setCompanyDocType] = useState<Record<number, string>>({});
  const [totalExperienceMonths, setTotalExperienceMonths] = useState<number>(0);

  useEffect(() => {
    const fetchInfo = async () => {
      if (!token || !orgId) {
        setError('Invalid link');
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get(`/hiring-onboarding/public/form/${token}?orgId=${orgId}`);
        if (res.success) {
          setMeta(res.data);
          try {
            const prevWork = res.data.work_experience ? JSON.parse(res.data.work_experience) : [];
            if (Array.isArray(prevWork)) {
              setEmploymentHistory(prevWork.map((w: any, idx: number) => ({
                id: idx + 1,
                company_name: w.company || '',
                designation: w.designation || '',
                start_date: w.start_date || '',
                end_date: w.end_date || '',
                reason_for_leaving: '',
                last_drawn_ctc: '',
                uan_pf_number: ''
              })));
            }
          } catch {}
        } else {
          setError(res.message || 'Failed to load');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [token, orgId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, companyId?: number, docKey?: string) => {
    const inputEl = e.currentTarget as HTMLInputElement;
    const files = inputEl?.files;
    if (!files || !files.length || !orgId) return;
    if (companyId && !docKey) {
      toast.error('Select a document name before uploading');
      return;
    }
    if (!companyId && !docKey) {
      toast.error('Select a document name before uploading');
      return;
    }
    setUploading(true);
    try {
      // Upload each file individually for reliability with server limit
      const uploaded: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append('files', files[i]);
        const r = await apiClient.post(`/files/public-upload?orgId=${orgId}`, fd);
        if (r.success && r.files?.[0]) {
          uploaded.push(r.files[0]);
        }
      }
      if (uploaded.length) {
        if (companyId) {
          const labelMap: Record<string, string> = {
            experience: 'Experience Letter',
            reliev: 'Relieving Letter',
            salary: 'Last 3 Months Salary Slips',
            uan: 'PF / UAN Details Document',
            bank: 'Bank Statement',
            form16: 'Form 16',
            promo: 'Promotion / Increment Letter',
          };
          setCompanyDocs(prev => ({
            ...prev,
            [companyId]: [
              ...(prev[companyId] || []),
              ...uploaded.map(f => ({ ...f, name: docKey, label: labelMap[docKey || ''] || docKey }))
            ]
          }));
        } else {
          const labelMap: Record<string, string> = {
            pan: 'PAN',
            aadhaar: 'Aadhaar',
          };
          setDocuments(prev => [
            ...prev,
            ...uploaded.map(f => ({ ...f, name: docKey, label: labelMap[docKey || ''] || docKey }))
          ]);
        }
        toast.success(`${uploaded.length} file(s) uploaded`);
      } else {
        toast.error('Upload failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputEl) inputEl.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !orgId) return;
    setSubmitting(true);
    try {
      let valid = true;
      if (employmentHistory.length > 0) {
        const needs = [
          { key: 'experience', label: 'Experience Letter' },
          { key: 'reliev', label: 'Relieving Letter' },
          { key: 'salary', label: 'Last 3 Months Salary Slips' },
          { key: 'uan', label: 'PF / UAN Details Document' },
        ];
        for (const entry of employmentHistory) {
          const docs = companyDocs[entry.id] || [];
          const names = docs.map(d => (d.name || d.filename || d.url || '').toLowerCase());
          const missing: string[] = [];
          needs.forEach(n => {
            const has = names.some(x => x.includes(n.key));
            if (!has) missing.push(n.label);
          });
          if (missing.length > 0) {
            toast.error(`Missing mandatory documents for ${entry.company_name || 'previous company'}: ${missing.join(', ')}`);
            valid = false;
            break;
          }
        }
      }
        // Validate general mandatory docs: PAN and Aadhaar
        const generalNames = documents.map(d => String(d.name || d.label || '').toLowerCase());
        const generalMissing: string[] = [];
        if (!generalNames.some(n => n.includes('pan'))) generalMissing.push('PAN');
        if (!generalNames.some(n => n.includes('aadhaar'))) generalMissing.push('Aadhaar');
        if (generalMissing.length) {
          toast.error(`Missing mandatory documents: ${generalMissing.join(', ')}`);
          valid = false;
        }
      if (!valid) {
        setSubmitting(false);
        return;
      }
      const res = await apiClient.post(`/hiring-onboarding/public/form/${token}/submit`, {
        orgId,
        details,
        employment_history: employmentHistory,
        company_documents: { general: documents, per_company: companyDocs }
      });
      if (res.success) {
        toast.success('Details submitted successfully');
      } else {
        toast.error(res.message || 'Submission failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalHeader role="employee" />
      <div className="max-w-3xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center text-gray-400 font-bold">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500 font-bold">{error}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-3xl border border-gray-100">
            <h1 className="text-2xl font-black">Onboarding Details</h1>
            <p className="text-gray-500 text-sm">
              {meta?.candidate_name} for {meta?.position_name} — {meta?.department}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">Email</label>
                <input disabled className="w-full p-4 bg-gray-100 border border-gray-200 rounded-xl" value={meta?.candidate_email || ''} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">Phone</label>
                <input disabled className="w-full p-4 bg-gray-100 border border-gray-200 rounded-xl" value={meta?.candidate_phone || ''} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">DOB</label>
                <input disabled className="w-full p-4 bg-gray-100 border border-gray-200 rounded-xl" value={meta?.dob || ''} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">Gender</label>
                <input disabled className="w-full p-4 bg-gray-100 border border-gray-200 rounded-xl" value={meta?.gender || ''} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">City</label>
                <input disabled className="w-full p-4 bg-gray-100 border border-gray-200 rounded-xl" value={meta?.current_city || ''} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">Highest Education</label>
                <input disabled className="w-full p-4 bg-gray-100 border border-gray-200 rounded-xl" value={meta?.highest_education || ''} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">Address</label>
                <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl" value={details.address} onChange={e => setDetails({ ...details, address: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">Bank Account</label>
                <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl" value={details.bank_account} onChange={e => setDetails({ ...details, bank_account: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">IFSC</label>
                <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl" value={details.ifsc} onChange={e => setDetails({ ...details, ifsc: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">Emergency Contact</label>
                <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl" value={details.emergency_contact} onChange={e => setDetails({ ...details, emergency_contact: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">PAN</label>
                <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl" value={details.pan} onChange={e => setDetails({ ...details, pan: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">Aadhaar</label>
                <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl" value={details.aadhaar} onChange={e => setDetails({ ...details, aadhaar: e.target.value })} />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase">Documents</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">PAN</p>
                  <div className="flex items-center gap-3">
                    <button type="button" className="px-4 py-2 bg-black text-white rounded-xl font-bold" onClick={() => document.getElementById('doc-file-pan')?.click()}>
                      <Upload size={16} className="inline mr-2" />
                      Upload
                    </button>
                    <input id="doc-file-pan" type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, undefined, 'pan')} />
                    {uploading && <span className="text-xs text-gray-500">Uploading...</span>}
                  </div>
                  <ul className="text-sm text-gray-600 mt-2">
                    {documents
                      .filter(d => String(d.name || d.label || '').toLowerCase().includes('pan'))
                      .map((d, i) => (
                        <li key={i} className="truncate">{(d.label || d.name)} — {(d.filename || d.url || '')}</li>
                      ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Aadhaar</p>
                  <div className="flex items-center gap-3">
                    <button type="button" className="px-4 py-2 bg-black text-white rounded-xl font-bold" onClick={() => document.getElementById('doc-file-aadhaar')?.click()}>
                      <Upload size={16} className="inline mr-2" />
                      Upload
                    </button>
                    <input id="doc-file-aadhaar" type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, undefined, 'aadhaar')} />
                    {uploading && <span className="text-xs text-gray-500">Uploading...</span>}
                  </div>
                  <ul className="text-sm text-gray-600 mt-2">
                    {documents
                      .filter(d => String(d.name || d.label || '').toLowerCase().includes('aadhaar'))
                      .map((d, i) => (
                        <li key={i} className="truncate">{(d.label || d.name)} — {(d.filename || d.url || '')}</li>
                      ))}
                  </ul>
                </div>
              </div>
              <div className="text-[11px] text-gray-600">Mandatory: PAN, Aadhaar</div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black">Previous Employment</h2>
                <button type="button" onClick={() => {
                  const id = (employmentHistory[employmentHistory.length - 1]?.id || 0) + 1;
                  setEmploymentHistory(prev => [...prev, { id, company_name: '', designation: '', start_date: '', end_date: '', reason_for_leaving: '', last_drawn_ctc: '', uan_pf_number: '' }]);
                }} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold hover:border-black">
                  <Plus size={14} className="inline mr-1" /> Add Another Company
                </button>
              </div>
              <p className="text-xs text-gray-500">Total Experience: {(totalExperienceMonths / 12).toFixed(2)} years</p>
              {employmentHistory.map((e) => (
                <div key={e.id} className="p-4 border border-gray-100 rounded-2xl bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Company #{e.id}</p>
                    <button type="button" onClick={() => {
                      setEmploymentHistory(prev => prev.filter(x => x.id !== e.id));
                      setCompanyDocs(prev => {
                        const copy = { ...prev };
                        delete copy[e.id];
                        return copy;
                      });
                    }} className="text-red-600 text-xs font-bold flex items-center gap-1">
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input placeholder="Previous Company Name*" className="p-3 bg-white border border-gray-200 rounded-xl" value={e.company_name} onChange={v => setEmploymentHistory(prev => prev.map(x => x.id === e.id ? { ...x, company_name: v.target.value } : x))} />
                    <input placeholder="Designation*" className="p-3 bg-white border border-gray-200 rounded-xl" value={e.designation} onChange={v => setEmploymentHistory(prev => prev.map(x => x.id === e.id ? { ...x, designation: v.target.value } : x))} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" className="p-3 bg-white border border-gray-200 rounded-xl" placeholder="Date of Joining*" value={e.start_date} onChange={v => setEmploymentHistory(prev => prev.map(x => x.id === e.id ? { ...x, start_date: v.target.value } : x))} />
                      <input type="date" className="p-3 bg-white border border-gray-200 rounded-xl" placeholder="Last Working Date*" value={e.end_date} onChange={v => setEmploymentHistory(prev => prev.map(x => x.id === e.id ? { ...x, end_date: v.target.value } : x))} />
                    </div>
                    <input placeholder="Reason for Leaving*" className="p-3 bg-white border border-gray-200 rounded-xl md:col-span-2" value={e.reason_for_leaving} onChange={v => setEmploymentHistory(prev => prev.map(x => x.id === e.id ? { ...x, reason_for_leaving: v.target.value } : x))} />
                    <input placeholder="Last Drawn CTC*" className="p-3 bg-white border border-gray-200 rounded-xl" value={e.last_drawn_ctc} onChange={v => setEmploymentHistory(prev => prev.map(x => x.id === e.id ? { ...x, last_drawn_ctc: v.target.value } : x))} />
                    <input placeholder="UAN / PF Number (if applicable)*" className="p-3 bg-white border border-gray-200 rounded-xl" value={e.uan_pf_number} onChange={v => setEmploymentHistory(prev => prev.map(x => x.id === e.id ? { ...x, uan_pf_number: v.target.value } : x))} />
                  </div>
                  <div className="mt-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Company-wise Documents</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Experience Letter</p>
                        <div className="flex items-center gap-3">
                          <button type="button" className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold" onClick={() => document.getElementById(`doc-file-${e.id}-experience`)?.click()}>
                            <Upload size={14} className="inline mr-1" /> Upload
                          </button>
                          <input id={`doc-file-${e.id}-experience`} type="file" multiple className="hidden" onChange={(ev) => handleFileUpload(ev, e.id, 'experience')} />
                        </div>
                        <ul className="text-xs text-gray-600 mt-2">
                          {(companyDocs[e.id] || [])
                            .filter(d => String(d.name || d.label || '').toLowerCase().includes('experience'))
                            .map((d, i) => <li key={i} className="truncate">{(d.label || d.name)} — {(d.filename || d.url || '')}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Relieving Letter</p>
                        <div className="flex items-center gap-3">
                          <button type="button" className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold" onClick={() => document.getElementById(`doc-file-${e.id}-reliev`)?.click()}>
                            <Upload size={14} className="inline mr-1" /> Upload
                          </button>
                          <input id={`doc-file-${e.id}-reliev`} type="file" multiple className="hidden" onChange={(ev) => handleFileUpload(ev, e.id, 'reliev')} />
                        </div>
                        <ul className="text-xs text-gray-600 mt-2">
                          {(companyDocs[e.id] || [])
                            .filter(d => String(d.name || d.label || '').toLowerCase().includes('reliev'))
                            .map((d, i) => <li key={i} className="truncate">{(d.label || d.name)} — {(d.filename || d.url || '')}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Last 3 Months Salary Slips</p>
                        <div className="flex items-center gap-3">
                          <button type="button" className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold" onClick={() => document.getElementById(`doc-file-${e.id}-salary`)?.click()}>
                            <Upload size={14} className="inline mr-1" /> Upload
                          </button>
                          <input id={`doc-file-${e.id}-salary`} type="file" multiple className="hidden" onChange={(ev) => handleFileUpload(ev, e.id, 'salary')} />
                        </div>
                        <ul className="text-xs text-gray-600 mt-2">
                          {(companyDocs[e.id] || [])
                            .filter(d => String(d.name || d.label || '').toLowerCase().includes('salary'))
                            .map((d, i) => <li key={i} className="truncate">{(d.label || d.name)} — {(d.filename || d.url || '')}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">PF / UAN Details Document</p>
                        <div className="flex items-center gap-3">
                          <button type="button" className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold" onClick={() => document.getElementById(`doc-file-${e.id}-uan`)?.click()}>
                            <Upload size={14} className="inline mr-1" /> Upload
                          </button>
                          <input id={`doc-file-${e.id}-uan`} type="file" multiple className="hidden" onChange={(ev) => handleFileUpload(ev, e.id, 'uan')} />
                        </div>
                        <ul className="text-xs text-gray-600 mt-2">
                          {(companyDocs[e.id] || [])
                            .filter(d => String(d.name || d.label || '').toLowerCase().includes('uan'))
                            .map((d, i) => <li key={i} className="truncate">{(d.label || d.name)} — {(d.filename || d.url || '')}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Bank Statement</p>
                        <div className="flex items-center gap-3">
                          <button type="button" className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold" onClick={() => document.getElementById(`doc-file-${e.id}-bank`)?.click()}>
                            <Upload size={14} className="inline mr-1" /> Upload
                          </button>
                          <input id={`doc-file-${e.id}-bank`} type="file" multiple className="hidden" onChange={(ev) => handleFileUpload(ev, e.id, 'bank')} />
                        </div>
                        <ul className="text-xs text-gray-600 mt-2">
                          {(companyDocs[e.id] || [])
                            .filter(d => String(d.name || d.label || '').toLowerCase().includes('bank'))
                            .map((d, i) => <li key={i} className="truncate">{(d.label || d.name)} — {(d.filename || d.url || '')}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Form 16</p>
                        <div className="flex items-center gap-3">
                          <button type="button" className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold" onClick={() => document.getElementById(`doc-file-${e.id}-form16`)?.click()}>
                            <Upload size={14} className="inline mr-1" /> Upload
                          </button>
                          <input id={`doc-file-${e.id}-form16`} type="file" multiple className="hidden" onChange={(ev) => handleFileUpload(ev, e.id, 'form16')} />
                        </div>
                        <ul className="text-xs text-gray-600 mt-2">
                          {(companyDocs[e.id] || [])
                            .filter(d => String(d.name || d.label || '').toLowerCase().includes('form16'))
                            .map((d, i) => <li key={i} className="truncate">{(d.label || d.name)} — {(d.filename || d.url || '')}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Promotion / Increment Letter</p>
                        <div className="flex items-center gap-3">
                          <button type="button" className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold" onClick={() => document.getElementById(`doc-file-${e.id}-promo`)?.click()}>
                            <Upload size={14} className="inline mr-1" /> Upload
                          </button>
                          <input id={`doc-file-${e.id}-promo`} type="file" multiple className="hidden" onChange={(ev) => handleFileUpload(ev, e.id, 'promo')} />
                        </div>
                        <ul className="text-xs text-gray-600 mt-2">
                          {(companyDocs[e.id] || [])
                            .filter(d => String(d.name || d.label || '').toLowerCase().includes('promo'))
                            .map((d, i) => <li key={i} className="truncate">{(d.label || d.name)} — {(d.filename || d.url || '')}</li>)}
                        </ul>
                      </div>
                    </div>
                    {(() => {
                      const docsForCompany = (companyDocs[e.id] || []);
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
                                <ul className="text-xs text-gray-600 mt-1">
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
                    <div className="mt-2 text-xs text-gray-500">
                      Mandatory: Experience Letter, Relieving Letter, Last 3 Months Salary Slips, PF / UAN Details Document
                      <br />
                      Optional: Bank Statement (salary credit proof), Form 16, Promotion / Increment Letter
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Salary details removed as requested */}
            <button type="submit" disabled={submitting} className="w-full py-4 bg-black text-white rounded-2xl font-black flex items-center justify-center gap-2">
              <Send size={18} />
              Submit Details
            </button>
          </form>
        )}
      </div>
      <GlobalFooter orgName={meta?.position_name ? undefined : undefined} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}
