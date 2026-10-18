'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Section } from '@/components/ui/FormControls';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { btn, fieldOf } from '@/features/recruitment/interviews/lib/ui';
import * as api from '../../api/documents.api';
import type { AssetDto } from '../../types/documents.dto';

const fieldCls = 'h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-[var(--tt-primary)]';

/** Authenticated image (signatures / stamps are not public). */
function AssetImage({ asset }: { asset: AssetDto }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    let alive = true;
    api.assetImage(asset.id).then((b) => { if (!alive) return; u = URL.createObjectURL(b); setUrl(u); }).catch(() => {});
    return () => { alive = false; if (u) URL.revokeObjectURL(u); };
  }, [asset.id, asset.updatedAt]);
  return (
    <div className="flex h-20 w-full items-center justify-center rounded-lg border border-line bg-[repeating-conic-gradient(var(--tt-bg-subtle)_0%_25%,transparent_0%_50%)] bg-[length:12px_12px]">
      {url ? <img src={url} alt={asset.name} className="max-h-16 max-w-[90%] object-contain" /> : <span className="h-10 w-24 animate-pulse rounded bg-bg-subtle" />}
    </div>
  );
}

function AddForm({ kind, onAdded }: { kind: 'signature' | 'stamp'; onAdded: () => void }) {
  const { subOrgs } = useManageableSubOrgs();
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [company, setCompany] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function add() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = kind === 'signature' ? 'Enter the signatory’s name' : 'Name the stamp';
    if (!file) e.image = 'Choose a PNG or JPG image';
    else if (file.size > 3 * 1024 * 1024) e.image = 'The image must be 3 MB or smaller';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await api.createAsset({ kind, name: name.trim(), designation: designation.trim() || undefined, sub_organization_id: company }, file as File);
      showSuccess(kind === 'signature' ? 'Signature added' : 'Stamp added');
      setName(''); setDesignation(''); setFile(null); setCompany(null);
      if (fileRef.current) fileRef.current.value = '';
      onAdded();
    } catch (err) {
      const f = fieldOf(err);
      if (f) setErrors({ [f]: messageOf(err) }); else showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-dashed border-line-strong p-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto_auto] xl:items-start">
      <div>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={kind === 'signature' ? 'Name, e.g. Rahul Mehta' : 'Name, e.g. Company seal'} aria-label="Name" className={cx(fieldCls, errors.name && 'border-[var(--tt-danger)]')} />
        {errors.name && <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{errors.name}</p>}
      </div>
      {kind === 'signature' ? (
        <input value={designation} onChange={(e) => setDesignation(e.target.value)} maxLength={120} placeholder="Designation, e.g. Managing Director" aria-label="Designation" className={fieldCls} />
      ) : <span className="hidden xl:block" />}
      <select value={company ?? ''} onChange={(e) => setCompany(e.target.value ? Number(e.target.value) : null)} aria-label="Company" className={fieldCls}>
        <option value="">All companies</option>
        {subOrgs.map((s) => <option key={s.id} value={s.id}>{s.name} only</option>)}
      </select>
      <div>
        <label className={cx(btn.secondary, 'cursor-pointer', errors.image && 'border-[var(--tt-danger)]')}>
          <ImagePlus className="h-4 w-4" /> <span className="max-w-[9rem] truncate">{file ? file.name : 'Image'}</span>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] || null); setErrors((x) => ({ ...x, image: '' })); }} />
        </label>
        {errors.image && <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{errors.image}</p>}
      </div>
      <button type="button" onClick={add} disabled={saving} className={btn.primary}>{saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />} Add</button>
    </div>
  );
}

/** Signatures (who signs letters) and company stamps, per organization or company. Images stay private. */
export function AssetsPanel({ assets, onChanged }: { assets: AssetDto[]; onChanged: () => void }) {
  const { subOrgs } = useManageableSubOrgs();
  const company = (id: number | null) => (id ? subOrgs.find((s) => s.id === id)?.name || 'One company' : 'All companies');

  async function remove(a: AssetDto) {
    if (!window.confirm(`Remove “${a.name}”? Templates that name this signatory will ask for one when generating.`)) return;
    try { await api.deleteAsset(a.id); showSuccess('Removed'); onChanged(); } catch (err) { showError(messageOf(err)); }
  }

  const list = (kind: 'signature' | 'stamp') => {
    const rows = assets.filter((a) => a.kind === kind);
    return rows.length === 0 ? (
      <p className="text-xs text-fg-muted">None yet.</p>
    ) : (
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((a) => (
          <li key={a.id} className="rounded-xl border border-line p-3">
            <AssetImage asset={a} />
            <div className="mt-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{a.name}</p>
                <p className="truncate text-[11px] text-fg-muted">{[a.designation, company(a.subOrganizationId)].filter(Boolean).join(' · ')}</p>
              </div>
              <button type="button" onClick={() => remove(a)} aria-label={`Remove ${a.name}`} className={btn.icon}><Trash2 className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-3">
      <Section title="Signatures" description="Who signs letters. Upload a PNG with a transparent background for the best look (up to 3 MB).">
        {list('signature')}
        <AddForm kind="signature" onAdded={onChanged} />
      </Section>
      <Section title="Company stamps" description="The seal printed beside a signature when a template asks for it. A company-specific stamp wins over the organization’s.">
        {list('stamp')}
        <AddForm kind="stamp" onAdded={onChanged} />
      </Section>
    </div>
  );
}
