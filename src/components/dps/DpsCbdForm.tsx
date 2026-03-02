"use client";

import React from 'react';
import { Building, FileCheck } from 'lucide-react';

interface DpsCbdFormProps {
    isEditMode: boolean;
    isExpired: () => boolean;
    scheduleValidFrom: string;
    setScheduleValidFrom: (v: string) => void;
    scheduleValidTill: string;
    setScheduleValidTill: (v: string) => void;
    getValidityDuration: () => number;
    clientBillTargetDate?: string;
    setClientBillTargetDate?: (v: string) => void;
    contractorBillTargetDate?: string;
    setContractorBillTargetDate?: (v: string) => void;
}

export function DpsCbdForm({
    isEditMode,
    isExpired,
    scheduleValidFrom,
    setScheduleValidFrom,
    scheduleValidTill,
    setScheduleValidTill,
    getValidityDuration,
    clientBillTargetDate = '',
    setClientBillTargetDate,
    contractorBillTargetDate = '',
    setContractorBillTargetDate
}: DpsCbdFormProps) {
    return (
        <div className="space-y-6">
            <style>{`
                fieldset:disabled .edit-btn, fieldset:disabled button { display: none !important; }
                fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea { background-color: transparent !important; border-color: transparent !important; opacity: 1; -webkit-appearance: none; appearance: none; color: #111; user-select: none; }
            `}</style>

            <fieldset disabled={!isEditMode} className="p-0 m-0 border-none space-y-6 w-full min-w-0">
                {/* 1. Schedule Validity */}
                <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start relative">
                        {isExpired() && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest z-10">Expired</div>}

                        <div className="flex-1 w-full space-y-4">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
                                <Building size={14} /> Main Schedule Validity
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Valid From</label>
                                    <input type="date" value={scheduleValidFrom || ''} onChange={e => setScheduleValidFrom(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-sm focus:border-black outline-none font-medium text-gray-700" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Valid Till</label>
                                    <input type="date" value={scheduleValidTill || ''} onChange={e => setScheduleValidTill(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-sm focus:border-black outline-none font-medium text-gray-700" />
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-32 flex flex-col items-center justify-center px-3 py-5 text-sm bg-gray-50 rounded-sm border border-gray-100 self-stretch">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Duration</span>
                            <span className="text-2xl font-black text-gray-900">{getValidityDuration()}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Days</span>
                        </div>
                    </div>
                </div>

                {/* 2. Billing Target Dates */}
                <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm space-y-6 text-sm">
                    <div className="space-y-1 border-b border-gray-50 pb-4">
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-3">
                            <FileCheck className="text-blue-600" /> Billing Target Dates
                        </h2>
                        <p className="text-xs text-gray-400 font-medium ml-9">Set specific target billing dates for this schedule period.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 p-4 bg-blue-50/20 border border-blue-100/50 rounded-sm">
                            <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest">Client Bill Target</label>
                            <input
                                type="date"
                                value={clientBillTargetDate || ''}
                                onChange={e => setClientBillTargetDate?.(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-sm focus:border-blue-500 outline-none font-bold text-blue-900 shadow-sm"
                            />
                            <p className="text-[9px] text-blue-400 font-medium">Expected date for client billing.</p>
                        </div>
                        <div className="space-y-2 p-4 bg-purple-50/20 border border-purple-100/50 rounded-sm">
                            <label className="block text-[10px] font-black text-purple-600 uppercase tracking-widest">Contractor Bill Target</label>
                            <input
                                type="date"
                                value={contractorBillTargetDate || ''}
                                onChange={e => setContractorBillTargetDate?.(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-sm focus:border-purple-500 outline-none font-bold text-purple-900 shadow-sm"
                            />
                            <p className="text-[9px] text-purple-400 font-medium">Expected date for contractor settlement.</p>
                        </div>
                    </div>
                </div>
            </fieldset>
        </div>
    );
}
