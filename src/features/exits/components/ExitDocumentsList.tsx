'use client';

import React from 'react';
import { Download, FileText } from 'lucide-react';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { formatDate } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';

interface Doc { id: number; label: string; generated_at: string; size_bytes?: number | null }

const size = (b?: number | null) => (b ? (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`) : '');

/** Documents with a download button each. `getUrl` returns a short-lived link; it opens in a new tab. */
export function ExitDocumentsList({ docs, getUrl, empty = 'No documents yet.' }: { docs: Doc[]; getUrl: (id: number) => Promise<{ url: string }>; empty?: string }) {
  const [busy, setBusy] = React.useState<number | null>(null);
  const open = async (id: number) => {
    setBusy(id);
    try { window.open((await getUrl(id)).url, '_blank', 'noopener,noreferrer'); } catch (e) { showError(messageOf(e)); } finally { setBusy(null); }
  };
  if (docs.length === 0) return <p className="text-sm text-fg-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {docs.map((d) => (
        <li key={d.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg-muted"><FileText className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">{d.label}</p>
            <p className="text-xs text-fg-muted">{[formatDate(d.generated_at.slice(0, 10)), size(d.size_bytes)].filter(Boolean).join(' · ')}</p>
          </div>
          <Btn busy={busy === d.id} icon={<Download className="h-4 w-4" />} onClick={() => open(d.id)} aria-label={`Download ${d.label}`}>Download</Btn>
        </li>
      ))}
    </ul>
  );
}
