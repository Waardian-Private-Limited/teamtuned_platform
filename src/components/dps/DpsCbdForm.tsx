"use client";

import React from 'react';
import { ClipboardCheck } from 'lucide-react';

interface DpsCbdFormProps {
    isEditMode: boolean;
    isExpired: () => boolean;
    scheduleValidFrom: string;
    setScheduleValidFrom: (v: string) => void;
    scheduleValidTill: string;
    setScheduleValidTill: (v: string) => void;
    getValidityDuration: () => number;
}

export function DpsCbdForm({
    isEditMode,
    isExpired,
    scheduleValidFrom,
    setScheduleValidFrom,
    scheduleValidTill,
    setScheduleValidTill,
    getValidityDuration
}: DpsCbdFormProps) {
    return (
        <div className="space-y-6">
            <style>{`
                fieldset:disabled .edit-btn, fieldset:disabled button { display: none !important; }
                fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea { background-color: transparent !important; border-color: transparent !important; opacity: 1; -webkit-appearance: none; appearance: none; color: #111; user-select: none; }
            `}</style>
            
            <fieldset disabled={!isEditMode} className="p-0 m-0 border-none space-y-6 w-full min-w-0">
                {/* Schedule Validity */}
                <div className="bg-white px-3 py-2 text-sm rounded-sm border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center relative overflow-hidden">
                    {isExpired() && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest z-10">Expired</div>}
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-2">Schedule Valid From (CBD)</label>
                        <input type="date" value={scheduleValidFrom} onChange={e => setScheduleValidFrom(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-sm focus:border-black outline-none font-medium text-gray-700" />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-2">Schedule Valid Till (CBD)</label>
                        <input type="date" value={scheduleValidTill} onChange={e => setScheduleValidTill(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-sm focus:border-black outline-none font-medium text-gray-700" />
                    </div>
                    <div className="w-full md:w-32 flex flex-col items-center justify-center px-3 py-2 text-sm bg-blue-50/30 rounded-sm border border-blue-50">
                        <span className="text-[10px] font-black text-blue-400 uppercase">Duration</span>
                        <span className="text-2xl font-black text-blue-600">{getValidityDuration()}</span>
                        <span className="text-[10px] font-bold text-blue-400">Days</span>
                    </div>
                </div>

                <div className="bg-white p-10 rounded-sm border border-gray-200 shadow-sm text-center">
                    <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                    <h2 className="text-xl font-bold text-gray-900">CBD Format Form</h2>
                    <p className="text-gray-500 mt-2">This is the dedicated CBD Format. Content will be added here specifically for construction-based development.</p>
                </div>
            </fieldset>
        </div>
    );
}
