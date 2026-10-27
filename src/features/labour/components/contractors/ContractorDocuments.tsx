'use client';

import React, { useRef, useState } from 'react';
import { ExternalLink, Trash2, Upload } from 'lucide-react';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { CONTRACTOR_DOC_TYPES } from '../../constants/labour.constants';
import type { ContractorDocument } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { fmtDate, titleCase } from '../../utils/format';
import { FormError, primaryBtn, secondaryBtn } from '../shared/Primitives';

export function ContractorDocuments({ contractorId, documents, canManage, onChanged }: { contractorId: number; documents: ContractorDocument[]; canManage: boolean; onChanged: () => void }) {
  const [docType, setDocType] = useState<string | null>('letterhead');
  const [title, setTitle] = useState('');
  const [expiryOn, setExpiryOn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = async () => {
    const errs: Record<string, string> = {};
    if (!docType) errs.docType = 'Choose the document type';
    if (!file) errs.file = 'Choose a file (PDF, JPG or PNG up to 5 MB)';
    else if (file.size > 5 * 1024 * 1024) errs.file = 'The file is larger than 5 MB';
    setErrors(errs);
    if (Object.keys(errs).length || !file || !docType) return;
    setBusy(true);
    setFormError('');
    try {
      await api.uploadContractorDoc(contractorId, { docType, title: title.trim() || undefined, expiryOn: expiryOn || undefined }, file);
      showSuccess('Document uploaded');
      setFile(null); setTitle(''); setExpiryOn('');
      if (input.current) input.current.value = '';
      onChanged();
    } catch (err) {
      const p = placeError(err, (k) => ['docType', 'title', 'expiryOn', 'file'].includes(k));
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  const view = async (id: number) => { try { window.open((await api.contractorDocLink(contractorId, id)).url, '_blank', 'noopener'); } catch (e) { showError(messageOf(e)); } };
  const remove = (id: number) => setConfirm({
    title: 'Remove this document?', body: 'The file is deleted and cannot be recovered.', cta: 'Remove', danger: true,
    run: async () => { try { await api.deleteContractorDoc(contractorId, id); showSuccess('Document removed'); onChanged(); } catch (e) { showError(messageOf(e)); } },
  });

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line rounded-xl border border-line">
        {documents.length === 0 && <li className="p-4 text-sm text-fg-muted">No documents yet. Upload the letterhead and licence to keep them with the contractor.</li>}
        {documents.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-fg">{d.title || titleCase(d.docType)}</p><p className="text-[11px] text-fg-muted">{titleCase(d.docType)}{d.expiryOn ? ` · Expires ${fmtDate(d.expiryOn)}` : ''}</p></div>
            <div className="flex gap-1.5">
              <button type="button" className={secondaryBtn} onClick={() => view(d.id)}><ExternalLink className="h-3.5 w-3.5" aria-hidden />View</button>
              {canManage && <button type="button" aria-label="Remove document" className={secondaryBtn} onClick={() => remove(d.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>}
            </div>
          </li>
        ))}
      </ul>
      {canManage && (
        <div className="space-y-3 rounded-xl border border-line p-3 sm:p-4">
          <h4 className="text-sm font-bold text-fg">Upload a document</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Type" value={docType} options={CONTRACTOR_DOC_TYPES} error={errors.docType} onChange={setDocType} />
            <TextField label="Title (optional)" value={title} error={errors.title} onChange={setTitle} />
            <TextField label="Expiry date" type="date" value={expiryOn} error={errors.expiryOn} onChange={setExpiryOn} />
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">File</span>
              <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] || null)} aria-invalid={Boolean(errors.file) || undefined}
                className={`block w-full rounded-lg border bg-surface p-1.5 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-bg-subtle file:px-3 file:py-1.5 file:text-xs file:font-semibold ${errors.file ? 'border-[var(--tt-danger)]' : 'border-line'}`} />
              {errors.file && <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{errors.file}</p>}
            </div>
          </div>
          <FormError message={formError} />
          <button type="button" disabled={busy} onClick={upload} className={primaryBtn}><Upload className="h-3.5 w-3.5" aria-hidden />{busy ? 'Uploading…' : 'Upload'}</button>
        </div>
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
