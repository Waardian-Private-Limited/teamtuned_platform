"use client";

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Bell, BellOff, Moon, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Pref {
    category: string;
    label: string;
    level: 'all' | 'mine' | 'off';
    quiet_from: number | null;
    quiet_to: number | null;
    ignores_quiet_hours: boolean;
}

const LEVELS: { key: Pref['level']; label: string; hint: string }[] = [
    { key: 'all', label: 'On', hint: 'Tell me every time' },
    { key: 'mine', label: 'Mine only', hint: 'Only when it is my own work' },
    { key: 'off', label: 'Off', hint: 'Never notify me' },
];

const hour = (h: number) => `${String(h).padStart(2, '0')}:00`;

/**
 * What you hear about, and when.
 *
 * Defaults are deliberately on — people should discover the module by being
 * told things, then turn down what they do not want, rather than discovering
 * it by being spammed. Urgent categories ignore quiet hours and say so.
 */
export default function NotificationPreferences() {
    const [prefs, setPrefs] = useState<Pref[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res: any = await apiClient.get('/mom/notifications/preferences');
                if (res?.success) setPrefs(res.preferences || []);
                else setError(res?.message || 'Could not load your settings.');
            } catch (err: any) {
                setError(err?.message || 'Could not load your settings.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const update = async (category: string, patch: Partial<Pref>) => {
        const before = prefs;
        const next = prefs.map(p => (p.category === category ? { ...p, ...patch } : p));
        setPrefs(next);                                     // optimistic
        const row = next.find(p => p.category === category)!;
        try {
            setSaving(category);
            const res: any = await apiClient.put('/mom/notifications/preferences', {
                category, level: row.level, quiet_from: row.quiet_from, quiet_to: row.quiet_to,
            }, { withAuth: true });
            if (!res?.success) throw new Error(res?.message || 'Could not save that.');
        } catch (err: any) {
            setPrefs(before);                               // put it back
            toast.error(err?.message || 'Could not save that.');
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return <div className="p-10 text-center text-slate-400"><Loader2 size={20} className="animate-spin inline" /></div>;
    }

    const quiet = prefs[0];

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Everything is on to begin with. Turn down whatever you do not want to hear about.
                </p>
            </div>

            {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-slate-50">
                {prefs.map(p => (
                    <div key={p.category} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                {p.level === 'off'
                                    ? <BellOff size={14} className="text-slate-300" />
                                    : <Bell size={14} className="text-blue-500" />}
                                {p.label}
                            </p>
                            {p.ignores_quiet_hours && p.level !== 'off' && (
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Reaches you even during quiet hours
                                </p>
                            )}
                        </div>

                        <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
                            {LEVELS.map(l => (
                                <button
                                    key={l.key}
                                    title={l.hint}
                                    onClick={() => update(p.category, { level: l.key })}
                                    disabled={saving === p.category}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                        p.level === l.key
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-white text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {l.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {quiet && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                    <p className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-1">
                        <Moon size={14} className="text-indigo-500" /> Quiet hours
                    </p>
                    <p className="text-xs text-slate-500 mb-3">
                        Routine reminders wait until this window is over. Anything urgent — work assigned
                        to you, a handoff, work sent back — still comes through.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={quiet.quiet_from ?? 21}
                            onChange={e => prefs.forEach(p => update(p.category, { quiet_from: Number(e.target.value) }))}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            aria-label="Quiet hours start"
                        >
                            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hour(h)}</option>)}
                        </select>
                        <span className="text-sm text-slate-400">to</span>
                        <select
                            value={quiet.quiet_to ?? 7}
                            onChange={e => prefs.forEach(p => update(p.category, { quiet_to: Number(e.target.value) }))}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            aria-label="Quiet hours end"
                        >
                            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hour(h)}</option>)}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
