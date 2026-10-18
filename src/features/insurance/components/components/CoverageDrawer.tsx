'use client';

import React from 'react';
import { FileText, IdCard, Pencil, Upload } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Section, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Dialog } from '@/components/ui/Dialog';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/insurance.api';
import { RELATION_LABEL } from '../../constants/insurance.constants';
import { useEnrollment } from '../../hooks/useInsuranceData';
import { useOpenFile } from '../../hooks/useOpenFile';
import type { Enrollment, Member } from '../../types/insurance.types';
import { formErrors } from '../../utils/errors';
import { ageOf, day, money } from '../../utils/format';
import { FamilyEditor } from './FamilyEditor';
import { PremiumSummary } from './PremiumSummary';
import { StatusBadge } from './StatusBadge';

interface CoverageDrawerProps {
  id: number | null;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function CoverageDrawer({ id, canManage, onClose, onChanged }: CoverageDrawerProps) {
  const { data, isLoading, error, setData } = useEnrollment(id);
  return (
    <Drawer open={id !== null} onClose={onClose} title="Coverage" maxWidthClassName="sm:max-w-2xl">
      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />}
      {error && !data && <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p>}
      {data && <Detail key={data.id} cover={data} canManage={canManage} onUpdated={(c) => { setData(c); onChanged(); }} />}
    </Drawer>
  );
}

function PersonRow({ m }: { m: Member }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
      <span className="min-w-0">
        <span className="block truncate font-semibold text-fg">{m.name}</span>
        <span className="text-fg-muted">{RELATION_LABEL[m.relation]}{m.dob ? ` · ${ageOf(m.dob)}` : ''}</span>
      </span>
      {m.role === 'nominee' && <span className="shrink-0 font-semibold tabular-nums text-fg">{m.nominee_share}%</span>}
    </li>
  );
}

function Detail({ cover, canManage, onUpdated }: { cover: Enrollment; canManage: boolean; onUpdated: (c: Enrollment) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [memberNo, setMemberNo] = React.useState(cover.member_no ?? '');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [ending, setEnding] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const files = useOpenFile();
  const open = cover.status === 'active' || cover.status === 'ending_soon';

  const startEdit = () => {
    setMembers([...cover.dependents, ...cover.nominees]);
    setMemberNo(cover.member_no ?? '');
    setErrors({});
    setFormError('');
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    setFormError('');
    try {
      const updated = await api.updateEnrollment(cover.id, { members, member_no: memberNo });
      showSuccess('Coverage updated');
      setEditing(false);
      onUpdated(updated);
    } catch (err) {
      const { fields, form } = formErrors(err);
      setErrors(fields);
      setFormError(form);
    } finally {
      setSaving(false);
    }
  };

  const end = async () => {
    setSaving(true);
    try {
      const updated = await api.endEnrollment(cover.id, reason);
      showSuccess('Cover ended');
      setEnding(false);
      onUpdated(updated);
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadCard(cover.id, file);
      showSuccess('E-card uploaded');
      onUpdated(await api.getEnrollment(cover.id));
    } catch (err) {
      showError(formErrors(err).fields.file || messageOf(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-fg">{cover.employee.name}</p>
          <p className="text-xs text-fg-muted">{cover.employee.code}{cover.employee.department ? ` · ${cover.employee.department}` : ''}</p>
        </div>
        <StatusBadge status={cover.status} />
      </div>

      <Section title={cover.plan.name} description={`${cover.plan.insurer}${cover.plan.policy_number ? ` · ${cover.plan.policy_number}` : ''}${cover.plan.tpa ? ` · TPA ${cover.plan.tpa}` : ''}`}>
        <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div><dt className="text-fg-muted">From</dt><dd className="font-semibold text-fg">{day(cover.start_date)}</dd></div>
          <div><dt className="text-fg-muted">To</dt><dd className="font-semibold text-fg">{day(cover.end_date)}</dd></div>
          <div><dt className="text-fg-muted">Sum insured</dt><dd className="font-semibold tabular-nums text-fg">{money(cover.sum_insured)}</dd></div>
          <div><dt className="text-fg-muted">Member no</dt><dd className="font-semibold text-fg">{cover.member_no || '—'}</dd></div>
        </dl>
        {cover.ended_reason && <p className="mt-3 text-xs text-fg-muted">Ended: {cover.ended_reason}</p>}
      </Section>

      <PremiumSummary
        annual={cover.annual_premium}
        employer={cover.employer_share}
        employee={cover.employee_share}
        recovery={{ mode: cover.recovery.mode, installments: cover.recovery.months }}
        schedule={cover.dues}
      />

      <Section
        title="Family and nominees"
        aside={canManage && open && !editing ? <Btn onClick={startEdit} icon={<Pencil className="h-3.5 w-3.5" />}>Edit</Btn> : undefined}
      >
        {editing ? (
          <div className="flex flex-col gap-4">
            <TextField label="Member number" value={memberNo} onChange={setMemberNo} />
            <FamilyEditor covers={cover.plan.covers} members={members} onChange={setMembers} errors={errors} />
            {formError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{formError}</p>}
            <p className="text-[11px] text-fg-muted">Premium is worked out again. Only months not yet deducted change.</p>
            <div className="flex justify-end gap-2.5"><Btn onClick={() => setEditing(false)}>Cancel</Btn><Btn variant="primary" busy={saving} onClick={save}>Save</Btn></div>
          </div>
        ) : cover.dependents.length + cover.nominees.length === 0 ? (
          <p className="text-xs text-fg-muted">Employee only. No family or nominees added.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {cover.dependents.length > 0 && <ul className="divide-y divide-line rounded-lg border border-line">{cover.dependents.map((m) => <PersonRow key={m.id} m={m} />)}</ul>}
            {cover.nominees.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Nominees</p>
                <ul className="divide-y divide-line rounded-lg border border-line">{cover.nominees.map((m) => <PersonRow key={m.id} m={m} />)}</ul>
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Documents">
        <div className="flex flex-wrap items-center gap-2">
          {cover.has_card && <Btn onClick={() => files.open('card', () => api.cardLink(cover.id, false))} busy={files.busy === 'card'} icon={<IdCard className="h-3.5 w-3.5" />}>E-card</Btn>}
          {cover.plan.has_document && <Btn onClick={() => files.open('doc', () => api.planDocumentLink(cover.plan.id))} busy={files.busy === 'doc'} icon={<FileText className="h-3.5 w-3.5" />}>Policy document</Btn>}
          {canManage && (
            <>
              <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={(e) => upload(e.target.files?.[0])} />
              <Btn onClick={() => fileRef.current?.click()} busy={uploading} icon={<Upload className="h-3.5 w-3.5" />}>{cover.has_card ? 'Replace e-card' : 'Upload e-card'}</Btn>
            </>
          )}
          {!cover.has_card && !cover.plan.has_document && !canManage && <p className="text-xs text-fg-muted">No documents yet.</p>}
        </div>
      </Section>

      {canManage && cover.status !== 'ended' && (
        <div className="flex justify-end border-t border-line pt-4"><Btn variant="danger" onClick={() => setEnding(true)}>End cover</Btn></div>
      )}

      <Dialog
        open={ending}
        onClose={() => setEnding(false)}
        maxWidthClassName="max-w-sm"
        title="End cover?"
        footer={<><Btn onClick={() => setEnding(false)}>Cancel</Btn><Btn variant="danger" busy={saving} onClick={end}>End cover</Btn></>}
      >
        <div className="flex flex-col gap-3 p-4 sm:p-6">
          <p className="text-sm text-fg-muted">Premium months not yet deducted are cancelled. Amounts already deducted stay.</p>
          <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} />
        </div>
      </Dialog>
    </div>
  );
}
