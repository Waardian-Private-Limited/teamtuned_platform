'use client';

import React from 'react';
import { Printer } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { messageOf } from '@/lib/api/errors';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { inr } from '@/features/compensation/utils/format';
import type { LetterDto } from '../../api/salaryRevisions.api';
import { printLetter } from '../../utils/printLetter';

export function RevisionLetterDrawer({ revisionId, load, onClose }: { revisionId: number | null; load: (id: number) => Promise<LetterDto>; onClose: () => void }) {
  const [letter, setLetter] = React.useState<LetterDto | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!revisionId) return;
    let active = true;
    setLetter(null);
    setError('');
    load(revisionId).then((l) => active && setLetter(l)).catch((e) => active && setError(messageOf(e)));
    return () => { active = false; };
  }, [revisionId, load]);

  return (
    <Drawer open={revisionId !== null} onClose={onClose} title={letter?.title || 'Letter'}>
      {error && <p className="text-sm text-[var(--tt-danger)]">{error}</p>}
      {!letter && !error && <div className="h-64 animate-pulse rounded-lg bg-bg-subtle" />}
      {letter && (
        <div className="space-y-4">
          <Btn variant="primary" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => printLetter(letter)}>Print or save as PDF</Btn>
          <article className="space-y-3 rounded-lg border border-line p-4 text-sm leading-relaxed text-fg">
            <header className="border-b border-line pb-2">
              <p className="font-bold">{letter.company.name}</p>
              {letter.company.address && <p className="text-[11px] text-fg-muted">{letter.company.address}</p>}
            </header>
            <p className="text-xs text-fg-muted">{letter.date}</p>
            <p><b>{letter.recipient.name}</b>{letter.recipient.employee_code ? ` · ${letter.recipient.employee_code}` : ''}</p>
            <h3 className="text-center font-bold">{letter.title}</h3>
            {letter.paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
            {letter.structure.length > 0 && (
              <table className="w-full text-xs">
                <thead><tr className="text-left text-fg-muted"><th className="py-1">Component</th><th className="py-1 text-right">Monthly</th><th className="py-1 text-right">Annual</th></tr></thead>
                <tbody>
                  {letter.structure.map((s) => <tr key={s.name} className="border-t border-line/60"><td className="py-1">{s.name}</td><td className="py-1 text-right">{inr(s.monthly)}</td><td className="py-1 text-right">{inr(s.annual)}</td></tr>)}
                  <tr className="border-t border-line font-semibold"><td className="py-1">Annual CTC</td><td /><td className="py-1 text-right">{inr(letter.totals.annual_ctc)}</td></tr>
                </tbody>
              </table>
            )}
            <p className="pt-6">For {letter.company.name}<br /><b>{letter.signatory || 'Authorised signatory'}</b></p>
          </article>
        </div>
      )}
    </Drawer>
  );
}
