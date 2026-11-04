'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { EmptyState } from '@/components/ui/EmptyState';
import * as api from '../api/perf.api';
import type { PersonRow } from '../types/perf.types';
import { HELP } from '../constants/help';
import { PageHead, Panel, SearchBox, Table, td } from './ui';

/** Everyone the viewer can open a profile for: HR sees their company, a manager the people below them. */
export function PeoplePage({ basePath }: { basePath: string }) {
  const [search, setSearch] = React.useState('');
  const [rows, setRows] = React.useState<PersonRow[] | null>(null);
  const [scope, setScope] = React.useState<'all' | 'team' | 'none'>('all');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const t = setTimeout(() => {
      api.listPeople(search.trim()).then((r) => { setRows(r.items); setScope(r.scope); setError(''); }).catch((e) => setError(messageOf(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead title="People" count={rows?.length} subtitle={scope === 'team' ? 'Everyone in your reporting line' : 'Open anyone for their whole picture'} help={HELP.people}
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Name or code…" />} />
      <Panel>
        {error && <p role="alert" className="p-3 text-sm text-[var(--tt-danger)]">{error}</p>}
        {!rows && !error && <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-subtle" />)}</div>}
        {rows && rows.length === 0 && (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState illustration={{ src: '/vectors/teams.svg', width: 220, height: 160, alt: '' }}
              title={scope === 'none' ? 'Nobody reports to you' : 'Nobody matches'}
              description={scope === 'none' ? 'You can open your own page from My goals. HR and managers see their people here.' : 'Try another name or code.'} />
          </div>
        )}
        {rows && rows.length > 0 && (
          <Table head={[{ label: 'Person' }, { label: 'Department' }, { label: 'Manager' }, { label: '', className: 'w-10' }]} minWidth={560}>
            {rows.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-bg-subtle/60">
                <td className={td}>
                  <Link href={`${basePath}/people/${p.id}`} className="block">
                    <span className="font-semibold text-fg">{p.name}</span>
                    <span className="block text-[11px] text-fg-muted">{[p.employee_code, p.designation].filter(Boolean).join(' · ')}</span>
                  </Link>
                </td>
                <td className={td}>{p.department || '—'}</td>
                <td className={td}>{p.manager || '—'}</td>
                <td className={td}><Link href={`${basePath}/people/${p.id}`} aria-label={`Open ${p.name}`}><ChevronRight className="h-4 w-4 text-fg-muted" /></Link></td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
