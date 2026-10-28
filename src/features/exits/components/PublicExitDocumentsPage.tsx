'use client';

import React from 'react';
import { PublicShell, StatusScreen } from '@/features/careers/components/PublicShell';
import * as api from '../api/exits.api';
import { useLoad } from '../hooks/useLoad';
import { ExitDocumentsList } from './ExitDocumentsList';
import { Skeleton } from './parts';

/** The ex-employee's document link: no sign-in, the token in the address is the key. */
export function PublicExitDocumentsPage({ token }: { token: string }) {
  const q = useLoad(() => api.publicDocuments(token), [token]);
  const company = q.data ? { name: q.data.org_name, logoUrl: null } : null;

  return (
    <PublicShell company={company} width="narrow">
      {q.loading ? (
        <div className="space-y-4 py-6" aria-busy="true"><Skeleton className="h-9 w-2/3" /><Skeleton className="h-40" /></div>
      ) : q.error || !q.data ? (
        <StatusScreen title="This link is not valid" description="It may have expired or been replaced. Contact your former employer's HR team for a new link." />
      ) : (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Your documents</h1>
          <p className="mt-2 text-sm text-fg-muted">{q.data.employee_name}, here are your employment documents from {q.data.org_name}. Each download link works for a few minutes; come back to this page for a fresh one.</p>
          <div className="mt-6 rounded-xl border border-line bg-surface p-4 sm:p-5">
            <ExitDocumentsList docs={q.data.documents} getUrl={(id) => api.publicDocumentUrl(token, id)} empty="No documents are available yet." />
          </div>
        </>
      )}
    </PublicShell>
  );
}
