'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Section, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { btn, fieldOf } from '../../interviews/lib/ui';
import * as api from '../api/settings.api';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])$/;

export function validateSlug(slug: string): string | null {
  if (!slug) return null;
  if (slug.length < 3) return 'At least 3 characters';
  if (slug.length > 80) return 'At most 80 characters';
  if (!SLUG_RE.test(slug) || slug.includes('--')) return 'Lowercase letters, numbers and single hyphens; no hyphen at the start or end';
  return null;
}

type Errors = { slug?: string; intro?: string };

export function CareersSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [hosted, setHosted] = useState(false);
  const [intro, setIntro] = useState('');
  const [rejectionEmail, setRejectionEmail] = useState(true);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function apply(s: api.RecruitmentSettingsDto) {
    setSlug(s.careersSlug || '');
    setHosted(Boolean(s.hostedEnabled));
    setIntro(s.companyIntro || '');
    setRejectionEmail(Boolean(s.rejectionEmailEnabled));
    setHostedUrl(s.hostedUrl || null);
    setDirty(false);
  }

  useEffect(() => {
    api.getSettings().then(apply).catch((err) => showError(messageOf(err))).finally(() => setLoading(false));
  }, []);

  const touch = () => setDirty(true);

  async function save() {
    const e: Errors = {};
    const slugErr = validateSlug(slug);
    if (slugErr) e.slug = slugErr;
    if (hosted && !slug) e.slug = 'Set a careers address before turning on the hosted page';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const res = await api.saveSettings({ careers_slug: slug || null, hosted_enabled: hosted, company_intro: intro.trim(), rejection_email_enabled: rejectionEmail });
      if (res && typeof res === 'object' && 'careersSlug' in res) apply(res);
      else setDirty(false);
      showSuccess('Careers settings saved');
    } catch (err) {
      const f = fieldOf(err);
      if (f === 'careers_slug') setErrors({ slug: messageOf(err) });
      else if (f === 'company_intro') setErrors({ intro: messageOf(err) });
      else showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  const preview = slug && !validateSlug(slug) ? `/careers/${slug}` : null;

  if (loading) return <div className="h-72 animate-pulse rounded-xl border border-line bg-surface" />;

  return (
    <Section
      title="Careers page"
      description="Where candidates find your open positions and apply."
      aside={
        <button type="button" onClick={save} disabled={saving || !dirty} className={btn.primary}>
          {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          Save
        </button>
      }
    >
      <div className="space-y-4">
        <TextField
          label="Careers address"
          prefix="/careers/"
          value={slug}
          onChange={(v) => { setSlug(v.toLowerCase().replace(/\s+/g, '-')); setErrors((x) => ({ ...x, slug: undefined })); touch(); }}
          error={errors.slug}
          placeholder="your-company"
          maxLength={80}
          hint="Used by the hosted page. Changing it breaks links you have already shared."
        />
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-fg sm:text-sm">Hosted careers page</p>
            <p className="text-[11px] text-fg-muted sm:text-xs">TeamTuned hosts a jobs page with an apply form. Turn off if you only use the API on your own site.</p>
            {preview && (
              <a href={hostedUrl || preview} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-fg underline-offset-4 hover:underline">
                {hostedUrl || preview} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <Switch checked={hosted} onChange={(v) => { setHosted(v); touch(); setErrors((x) => ({ ...x, slug: undefined })); }} label="Hosted careers page" />
        </div>
        <Textarea
          label="Company introduction"
          rows={4}
          value={intro}
          onChange={(e) => { setIntro(e.target.value); touch(); setErrors((x) => ({ ...x, intro: undefined })); }}
          error={errors.intro}
          maxLength={2000}
          hint="Shown at the top of the careers page and returned by the API."
        />
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
          <div>
            <p className="text-xs font-semibold text-fg sm:text-sm">Rejection emails</p>
            <p className="text-[11px] text-fg-muted sm:text-xs">Allow recruiters to email candidates when they are rejected. Each rejection still asks.</p>
          </div>
          <Switch checked={rejectionEmail} onChange={(v) => { setRejectionEmail(v); touch(); }} label="Rejection emails" />
        </div>
      </div>
    </Section>
  );
}
