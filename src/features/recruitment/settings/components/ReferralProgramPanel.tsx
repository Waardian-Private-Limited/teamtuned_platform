'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { OptionCard, Section, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { btn, fieldOf } from '../../interviews/lib/ui';
import * as api from '../api/settings.api';

type Errors = Partial<Record<'amount' | 'description' | 'payable_after_days' | 'terms', string>>;

const BLANK: api.ReferralProgramInput = { enabled: false, reward_type: 'cash', amount: 0, description: '', payable_after_days: 90, payout_mode: 'payroll', terms: '' };

/**
 * Recruitment settings → Referrals: whether referring pays, what (cash or a gift), how long the new hire
 * must stay first, how cash is paid (with payroll or by Accounts), and the terms people read before referring.
 * The terms PDF can be attached or replaced any time.
 */
export function ReferralProgramPanel() {
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<api.ReferralProgramInput>(BLANK);
  const [termsFile, setTermsFile] = useState<{ name: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function apply(d: api.ReferralProgramDto) {
    const { terms_file, ...rest } = d;
    setP({ ...rest, amount: Number(rest.amount) || 0 });
    setTermsFile(terms_file);
    setDirty(false);
  }

  useEffect(() => {
    api.getReferralProgram().then(apply).catch((e) => showError(messageOf(e))).finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof api.ReferralProgramInput>(key: K, value: api.ReferralProgramInput[K]) => {
    setP((x) => ({ ...x, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setDirty(true);
  };

  async function save() {
    const e: Errors = {};
    if (p.enabled && p.reward_type === 'cash' && !(p.amount > 0)) e.amount = 'Enter the reward amount';
    if (p.enabled && p.reward_type === 'non_cash' && !p.description.trim()) e.description = 'Say what the reward is';
    if (!(p.payable_after_days >= 0)) e.payable_after_days = 'Enter the number of days';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      apply(await api.saveReferralProgram({ ...p, description: p.description.trim(), terms: p.terms.trim() }));
      showSuccess('Referral program saved');
    } catch (err) {
      const f = fieldOf(err) as keyof Errors | null;
      if (f) setErrors({ [f]: messageOf(err) });
      else showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.type !== 'application/pdf') return showError('Attach a PDF');
    if (file.size > 5 * 1024 * 1024) return showError('The PDF must be 5 MB or smaller');
    setUploading(true);
    try {
      const d = await api.attachReferralTerms(file);
      setTermsFile(d.terms_file);
      showSuccess('Terms attached');
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removeFile() {
    try {
      const d = await api.removeReferralTerms();
      setTermsFile(d.terms_file);
    } catch (err) {
      showError(messageOf(err));
    }
  }

  if (loading) return <div className="h-72 animate-pulse rounded-xl border border-line bg-surface" />;

  const cash = p.reward_type === 'cash';
  return (
    <Section
      title="Referral program"
      description="What an employee earns when someone they refer is hired."
      aside={
        <button type="button" onClick={save} disabled={saving || !dirty} className={btn.primary}>
          {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          Save
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
          <div>
            <p className="text-xs font-semibold text-fg sm:text-sm">Reward referrals</p>
            <p className="text-[11px] text-fg-muted sm:text-xs">Off: employees can still refer, nobody is rewarded.</p>
          </div>
          <Switch checked={p.enabled} onChange={(v) => set('enabled', v)} label="Reward referrals" />
        </div>

        {!p.enabled && (
          <div className="flex flex-col items-center py-4 text-center">
            <img src="/vectors/credit.svg" alt="" width={960} height={660} className="mb-3 h-auto w-36 select-none object-contain sm:w-44" />
            <p className="text-sm font-semibold text-fg">Reward people who bring in great hires</p>
            <p className="mt-0.5 max-w-sm text-xs text-fg-muted">Turn on to set a cash or gift reward, when it is paid, and the terms employees see before they refer.</p>
          </div>
        )}

        {p.enabled && (
          <>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <OptionCard selected={cash} onClick={() => set('reward_type', 'cash')} title="Cash" description="An amount paid to the referrer" />
              <OptionCard selected={!cash} onClick={() => set('reward_type', 'non_cash')} title="Gift or other" description="A voucher, gadget or anything HR hands over" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {cash ? (
                <TextField label="Reward amount" type="number" inputMode="numeric" min={0} prefix="₹" value={String(p.amount || '')}
                  onChange={(v) => set('amount', Number(v) || 0)} error={errors.amount} hint="A position can set its own amount." />
              ) : (
                <TextField label="Reward" value={p.description} maxLength={300} onChange={(v) => set('description', v)} error={errors.description} placeholder="e.g. ₹5,000 shopping voucher" />
              )}
              <TextField label="Payable after joining" type="number" inputMode="numeric" min={0} suffix="days" value={String(p.payable_after_days)}
                onChange={(v) => set('payable_after_days', Math.max(0, Math.floor(Number(v) || 0)))} error={errors.payable_after_days}
                hint="The new hire must still be working here on that day." />
            </div>

            {cash && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-fg-muted">How the reward is paid</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <OptionCard selected={p.payout_mode === 'payroll'} onClick={() => set('payout_mode', 'payroll')} title="With payroll" description="Added to the referrer's salary as a referral bonus (taxable)" />
                  <OptionCard selected={p.payout_mode === 'manual'} onClick={() => set('payout_mode', 'manual')} title="Paid by Accounts" description="Shows on the Payouts page when it is due" />
                </div>
              </div>
            )}
          </>
        )}

        <Textarea label="Terms" rows={5} value={p.terms} maxLength={8000} onChange={(e) => set('terms', e.target.value)} error={errors.terms}
          hint="Employees read these before they refer someone." />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-line px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-fg-muted" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-fg sm:text-sm">{termsFile ? termsFile.name : 'Terms document (PDF)'}</p>
              <p className="text-[11px] text-fg-muted">{termsFile ? 'Employees can open it from the refer page.' : 'Optional. You can attach it later.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={btn.secondary}>
              {uploading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Upload className="h-3.5 w-3.5" />}
              {termsFile ? 'Replace' : 'Attach'}
            </button>
            {termsFile && (
              <button type="button" onClick={removeFile} aria-label="Remove terms document" className={btn.icon}><Trash2 className="h-3.5 w-3.5" /></button>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
