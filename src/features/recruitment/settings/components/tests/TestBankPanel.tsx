'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../../../interviews/api/interviews.api';
import type { TestListItemDto } from '../../../interviews/types/interviews.dto';
import { btn, itemsOf, tdClass, thClass } from '../../../interviews/lib/ui';
import { TestEditorDrawer } from './TestEditorDrawer';

const FILTER = [{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }] as const;

export function TestBankPanel() {
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const [tests, setTests] = useState<TestListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<{ id: number | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listTests({ status });
      setTests(itemsOf(res).filter((t) => !t.status || t.status === status));
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="flex flex-col gap-2 border-b border-line p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div>
          <h2 className="text-sm font-bold text-fg sm:text-base">Test bank</h2>
          <p className="text-[11px] text-fg-muted sm:text-xs">Assessments you can attach to positions and send to candidates.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-44"><SegmentedControl options={FILTER} value={status} onChange={setStatus} /></div>
          <button type="button" onClick={() => setEditor({ id: null })} className={btn.primary}>
            <Plus className="h-3.5 w-3.5" /> New test
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-bg-subtle" />)}</div>
      ) : tests.length === 0 ? (
        <EmptyState
          illustration={status === 'active' ? { src: '/vectors/language_test.svg', width: 220, height: 160, alt: '' } : undefined}
          compact={status !== 'active'}
          title={status === 'active' ? 'No tests yet' : 'No archived tests'}
          description={status === 'active' ? 'Build a short assessment with choice and text questions. Choice answers are scored automatically.' : undefined}
          action={status === 'active' ? { label: 'New test', onClick: () => setEditor({ id: null }) } : undefined}
        />
      ) : (
        <div className="overflow-x-auto tt-scroll-hidden">
          <table className="w-full min-w-[640px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={thClass}>Test</th>
                <th className={cx(thClass, 'text-right')}>Duration</th>
                <th className={cx(thClass, 'text-right')}>Pass mark</th>
                <th className={cx(thClass, 'text-right')}>Questions</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr
                  key={t.id}
                  tabIndex={0}
                  onClick={() => setEditor({ id: t.id })}
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditor({ id: t.id }); }}
                  className="cursor-pointer transition-colors hover:bg-bg-subtle/50 focus-visible:bg-bg-subtle focus-visible:outline-none"
                >
                  <td className={tdClass}>
                    <p className="font-semibold">{t.name}</p>
                    {t.description && <p className="max-w-md truncate text-xs text-fg-muted">{t.description}</p>}
                  </td>
                  <td className={cx(tdClass, 'text-right tabular-nums')}>{t.durationMinutes} min</td>
                  <td className={cx(tdClass, 'text-right tabular-nums')}>{t.passPercent}%</td>
                  <td className={cx(tdClass, 'text-right tabular-nums')}>
                    {t.questionCount ? `${t.questionCount} of ${t.totalQuestions ?? '—'}` : t.totalQuestions ?? '—'}
                  </td>
                  <td className={tdClass}><StatusPill label={t.status === 'archived' ? 'Archived' : 'Active'} tone={t.status === 'archived' ? 'terminated' : 'active'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TestEditorDrawer open={Boolean(editor)} testId={editor?.id ?? null} onClose={() => setEditor(null)} onSaved={load} />
    </section>
  );
}
