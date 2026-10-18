'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useRecruitmentBase } from '../../shared/hooks/useRecruitmentBase';
import { PositionEditor } from './editor/PositionEditor';

export function PositionCreatePage() {
  const base = useRecruitmentBase();
  const router = useRouter();
  return (
    <PositionEditor
      initial={null}
      onCancel={() => router.push(`${base}/positions`)}
      onSaved={(p) => router.replace(`${base}/positions/${p.id}`)}
      header={
        <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
          <Link href={`${base}/positions`} className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg">
            <ArrowLeft className="h-3.5 w-3.5" />Positions
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-fg sm:text-xl">New position</h1>
          <p className="text-xs text-fg-muted">Save as a draft to keep working, or open it to start taking applications.</p>
        </div>
      }
    />
  );
}
