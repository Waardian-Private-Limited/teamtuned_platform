'use client';

import React from 'react';
import { Fact } from '@/features/expense-bills/components/Primitives';
import type { Opt } from '../../../hooks/useLabourLists';
import type { Category } from '../../../types/labour.types';
import { fmtDate } from '../../../utils/format';
import type { Shots } from './FaceCapture';
import type { PendingDoc, WizardForm } from './wizard.types';

export function ReviewStep({ form, sites, contractors, categories, shots, docs, editing, moving = false }: { form: WizardForm; sites: Opt[]; contractors: Opt[]; categories: Category[]; shots: Shots; docs: PendingDoc[]; editing: boolean; moving?: boolean }) {
  const cat = categories.find((c) => c.id === form.categoryId);
  const sub = cat?.subcategories.find((s) => s.id === form.subcategoryId);
  const photos = Object.values(shots).filter(Boolean).length;
  const addr = (a: WizardForm['present']) => [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ') || '—';
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Fact label="Name" value={[form.firstName, form.lastName].filter(Boolean).join(' ') || '—'} />
        <Fact label="Contractor" value={contractors.find((c) => c.value === form.contractorId)?.label || '—'} />
        <Fact label="Site" value={sites.find((s) => s.value === form.siteId)?.label || '—'} />
        <Fact label="Category" value={[cat?.name, sub?.name].filter(Boolean).join(' / ') || '—'} />
        <Fact label="Mobile" value={form.phone || '—'} />
        <Fact label="Work start" value={fmtDate(form.workStartDate)} />
        <Fact label="Aadhaar" value={form.aadhaar ? `XXXX XXXX ${form.aadhaar.replace(/\s/g, '').slice(-4)}` : editing ? 'Unchanged' : 'Not given'} />
        <Fact label="Present address" wide value={addr(form.present)} />
        <Fact label="Permanent address" wide value={form.sameAddress ? 'Same as present' : addr(form.permanent)} />
        <Fact label="Face photos" value={photos === 3 ? 'All 3 ready' : photos ? `${photos} of 3 (incomplete)` : editing ? 'No new photos' : 'Not taken'} />
        <Fact label="Documents" value={docs.filter((d) => d.file).length || 'None'} />
        {moving && <Fact label="Past attendance" wide value={form.moveFrom ? `Moved from ${fmtDate(form.moveFrom)}${form.moveReason.trim() ? ` · ${form.moveReason.trim()}` : ''}` : 'Not moved (the change applies from now on)'} />}
      </dl>
      {photos > 0 && photos < 3 && <p className="text-xs font-medium text-[var(--tt-danger)]">Face registration needs all three photos. Go back and add the missing ones, or remove the photos.</p>}
      {!photos && !editing && <p className="text-xs text-fg-muted">Without a registered face this labourer cannot punch yet. You can add the face later.</p>}
    </div>
  );
}
