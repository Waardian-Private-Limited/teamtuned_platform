'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/labour.api';
import type { Contractor, Labourer } from '../../types/labour.types';
import { fullName } from '../../utils/format';
import { FaceAvatar } from '../shared/FaceAvatar';
import { ImportLabourerDialog } from '../labourers/ImportLabourerDialog';
import { FormError, Pill, primaryBtn, secondaryBtn } from '../shared/Primitives';

const PAGE = 20;

/** The labourers under one contractor, with a button to import someone already registered at another site. */
export function ContractorLabour({ contractor, canImport, onChanged }: { contractor: Contractor; canImport: boolean; onChanged: () => void }) {
  const [rows, setRows] = useState<Labourer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.listLabourers({ contractorId: contractor.id, page, pageSize: PAGE })
      .then((r) => { setRows(r.items || []); setTotal(Number(r.total) || 0); setError(''); })
      .catch((e) => setError(messageOf(e)))
      .finally(() => setLoading(false));
  }, [contractor.id, page]);
  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-fg-muted sm:text-sm">{total} labourer{total === 1 ? '' : 's'} under this contractor</p>
        {canImport && contractor.status === 'active' && <button type="button" className={primaryBtn} onClick={() => setImporting(true)}><Plus className="h-3.5 w-3.5" aria-hidden />Import labourer</button>}
      </div>
      <FormError message={error} />
      {loading && rows.length === 0 && <div className="h-24 animate-pulse rounded-xl bg-bg-subtle" />}
      {!loading && !error && rows.length === 0 && <p className="rounded-xl bg-bg-subtle p-4 text-sm text-fg-muted">No labourers yet. Register one, or import someone who works at another site.</p>}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {rows.map((l) => (
          <li key={l.id} className="flex items-center gap-3 px-3 py-2.5">
            <FaceAvatar name={fullName(l)} url={l.photoUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-fg">{fullName(l)}</p>
              <p className="truncate text-xs text-fg-muted">{[l.code, l.siteName, [l.categoryName, l.subcategoryName].filter(Boolean).join(' / ')].filter(Boolean).join(' · ')}</p>
            </div>
            {l.linkedFromId ? <Pill tone="neutral">Imported</Pill> : null}
            {l.status !== 'active' && <Pill tone="warn">{l.status}</Pill>}
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-fg-muted">
          <button type="button" className={secondaryBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button type="button" className={secondaryBtn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
      {importing && (
        <ImportLabourerDialog
          contractor={{ id: contractor.id, name: contractor.tradeName || contractor.legalName, siteIds: contractor.siteIds || [], trades: contractor.trades || [] }}
          onClose={() => setImporting(false)}
          onImported={() => { setImporting(false); setPage(1); load(); onChanged(); }}
        />
      )}
    </div>
  );
}
