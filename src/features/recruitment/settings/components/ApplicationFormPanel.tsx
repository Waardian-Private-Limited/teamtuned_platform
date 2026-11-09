'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Section } from '@/components/ui/FormControls';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { btn } from '../../interviews/lib/ui';
import { getDefaultForm, saveDefaultForm } from '../../shared/api/recruitment.api';
import { ApplicationFormEditor, formErrors } from '../../shared/components/ApplicationFormEditor';
import { invalidateRecruitmentOptions } from '../../shared/hooks/useRecruitmentOptions';
import { toPositionForm } from '../../shared/types/recruitment.mapper';
import type { PositionForm } from '../../shared/types/recruitment.model';

/** The company application form: set once, every new position starts from it and can still change its copy. */
export function ApplicationFormPanel() {
  const [form, setForm] = useState<PositionForm | null>(null);
  const [custom, setCustom] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const apply = (res: { form: Parameters<typeof toPositionForm>[0]; custom: boolean }) => {
    setForm(toPositionForm(res.form));
    setCustom(res.custom);
    setDirty(false);
    setErrors({});
  };
  useEffect(() => { getDefaultForm().then(apply).catch((e) => showError(messageOf(e))); }, []);

  const save = async (next: PositionForm | null) => {
    if (next) {
      const e = formErrors(next);
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    setSaving(true);
    try {
      apply(await saveDefaultForm(next));
      invalidateRecruitmentOptions();
      showSuccess(next ? 'Application form saved' : 'Back to the standard form');
    } catch (err) {
      setErrors({ form: messageOf(err) });
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="h-96 animate-pulse rounded-xl border border-line bg-surface" />;

  return (
    <Section
      title="Application form"
      description="What candidates fill in when they apply. New positions start with this form; each position can still change its own."
      aside={
        <div className="flex gap-2">
          {custom && (
            <button type="button" onClick={() => save(null)} disabled={saving} className={btn.secondary}>
              <RotateCcw className="h-3.5 w-3.5" />Reset
            </button>
          )}
          <button type="button" onClick={() => save(form)} disabled={saving || !dirty} className={btn.primary}>
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Save
          </button>
        </div>
      }
    >
      <ApplicationFormEditor
        value={form}
        onChange={(f) => { setForm(f); setDirty(true); }}
        errors={errors}
        onClearErrors={(...keys) => setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !keys.includes(k))))}
      />
      <p className="mt-4 text-[11px] text-fg-muted">Positions that already exist keep their form. Open one and use “Use company form” to switch it.</p>
    </Section>
  );
}
