"use client";

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Building2, Users, Loader2, Lock, Check, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

type HoPolicy = 'claim' | 'view' | 'restrict';

interface Settings {
    ho_pool_policy: HoPolicy;
    notify_department_on_assign: 0 | 1 | boolean;
}

/**
 * The three answers to one question, spelled out in the terms the person
 * choosing actually thinks in.
 *
 * A point assigned to a department is a pool: everyone in that team who is
 * posted to the meeting's site sees it, and the first to accept owns it. What
 * differs between organisations is what Head Office does with a point raised at
 * a plant nobody at HO is posted to — and there is no defensible default, which
 * is why it is a setting rather than a rule.
 */
const HO_OPTIONS: { key: HoPolicy; label: string; blurb: string; consequence: string }[] = [
    {
        key: 'claim',
        label: 'Head Office can take it on',
        blurb: 'HO members of the department are full members of every site’s pool.',
        consequence: 'Best when HO staff genuinely do site work. The risk is someone at HO claiming a job they cannot physically get to, which takes it off the site team’s list.',
    },
    {
        key: 'view',
        label: 'Head Office can watch, not take',
        blurb: 'HO sees every site’s department points; the Accept button only appears for people posted to that site.',
        consequence: 'Oversight without accidentally owning work at a plant. This is the closest match to how the module behaved before this setting existed.',
    },
    {
        key: 'restrict',
        label: 'Site team only',
        blurb: 'A department point is shown only to members posted to one of the meeting’s sites.',
        consequence: 'The tightest reading of a pool. HO loses the cross-site visibility it has today, so pick this only if that visibility is unwanted.',
    },
];

/**
 * Org-wide MoM policy.
 *
 * Read-only for everyone who is not an org admin — the policy explains why
 * their own screens behave the way they do, so hiding it would just make the
 * behaviour look arbitrary.
 */
export default function MomSettings() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [editable, setEditable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res: any = await apiClient.get('/mom/settings', {}, { withAuth: true });
                if (res?.success) {
                    setSettings(res.settings);
                    setEditable(!!res.editable);
                } else {
                    setError(res?.message || 'Could not load MoM settings.');
                }
            } catch (err: any) {
                setError(err?.message || 'Could not load MoM settings.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const save = async (patch: Partial<Settings>, key: string) => {
        if (!settings) return;
        const before = settings;
        setSettings({ ...settings, ...patch });     // optimistic
        try {
            setSaving(key);
            const res: any = await apiClient.put('/mom/settings', patch, { withAuth: true });
            if (!res?.success) throw new Error(res?.message || 'Could not save that.');
            setSettings(res.settings);
            toast.success('Saved');
        } catch (err: any) {
            setSettings(before);                    // put it back
            toast.error(err?.message || 'Could not save that.');
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="p-10 text-center text-slate-400">
                <Loader2 size={20} className="animate-spin inline" />
            </div>
        );
    }

    if (error || !settings) {
        return (
            <div className="max-w-3xl mx-auto p-6">
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {error || 'Could not load MoM settings.'}
                </div>
            </div>
        );
    }

    const notifyOn = settings.notify_department_on_assign === 1 || settings.notify_department_on_assign === true;

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">MoM settings</h1>
                <p className="text-sm text-gray-500 mt-1">
                    How points assigned to a whole department behave across your sites.
                </p>
            </div>

            {!editable && (
                <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>These are set by an organisation admin. You are seeing them so the behaviour on your own screens is not a mystery.</span>
                </div>
            )}

            {/* ------------------------------------------------------- */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Head Office and department pools</h2>
                </div>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                    A point assigned to a department is offered to everyone in that team at the meeting&apos;s sites, and
                    whoever accepts first becomes its owner. This decides what someone posted to a Head Office site
                    may do with a point raised at a site they are not posted to.
                </p>

                <div className="space-y-2">
                    {HO_OPTIONS.map(opt => {
                        const active = settings.ho_pool_policy === opt.key;
                        return (
                            <button
                                key={opt.key}
                                type="button"
                                disabled={!editable || saving === 'ho'}
                                onClick={() => save({ ho_pool_policy: opt.key }, 'ho')}
                                className={`w-full text-left rounded-xl border p-4 transition-all ${
                                    active
                                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-100'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                } ${!editable ? 'cursor-default opacity-90' : 'cursor-pointer'}`}
                            >
                                <div className="flex items-start gap-3">
                                    <span
                                        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                            active ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                                        }`}
                                    >
                                        {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-gray-900">{opt.label}</div>
                                        <div className="text-[13px] text-gray-600 mt-0.5">{opt.blurb}</div>
                                        <div className="text-[12px] text-gray-400 mt-1.5 leading-relaxed">{opt.consequence}</div>
                                    </div>
                                    {saving === 'ho' && active && (
                                        <Loader2 size={14} className="animate-spin text-blue-500 shrink-0" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ------------------------------------------------------- */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Telling the department</h2>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                <Bell className="w-3.5 h-3.5 text-gray-400" />
                                Notify the department when a point is pooled to it
                            </div>
                            <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">
                                Everyone who could accept the point is told, and the message says it is first-come.
                                Turn this off and a pooled point is only found by opening the meeting — which is how
                                pooled work used to sit unclaimed with nobody told about it.
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={!editable || saving === 'notify'}
                            onClick={() => save({ notify_department_on_assign: notifyOn ? 0 : 1 }, 'notify')}
                            aria-pressed={notifyOn}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                                notifyOn ? 'bg-blue-600' : 'bg-gray-300'
                            } ${!editable ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                        >
                            <span
                                className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                                    notifyOn ? 'left-[22px]' : 'left-0.5'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
