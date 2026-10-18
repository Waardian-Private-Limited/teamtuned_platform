'use client';

import { useState } from 'react';
import { ExternalLink, FileText, Mail, Phone, MapPin } from 'lucide-react';
import { showError } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/recruitment.api';
import { SOURCE_LABELS } from '../../constants/recruitment.constants';
import type { ApplicationDetail } from '../../types/recruitment.model';
import { formatMoney, formatYears, openAsync, safeHref } from '../../utils/format';
import { StageBadge } from '../StageBadge';
import { KV, SectionTitle, SmallButton } from './parts';

export function OverviewTab({ detail }: { detail: ApplicationDetail }) {
  const c = detail.candidate;
  const [opening, setOpening] = useState(false);

  const openResume = async () => {
    setOpening(true);
    try {
      await openAsync(async () => (await api.getResumeUrl(c.id)).url);
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setOpening(false);
    }
  };

  const links = [
    { label: 'LinkedIn', href: safeHref(c.linkedinUrl) },
    { label: 'Portfolio', href: safeHref(c.portfolioUrl) },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));

  return (
    <div className="space-y-5">
      <section>
        <SectionTitle
          aside={c.hasResume ? (
            <SmallButton icon={FileText} onClick={openResume} disabled={opening}>{opening ? 'Opening…' : 'View resume'}</SmallButton>
          ) : <span className="text-[11px] text-fg-subtle">No resume</span>}
        >
          Contact
        </SectionTitle>
        <div className="space-y-1.5 text-sm">
          <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-fg hover:underline"><Mail className="h-3.5 w-3.5 text-fg-muted" />{c.email}</a>
          {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-fg hover:underline"><Phone className="h-3.5 w-3.5 text-fg-muted" />{c.phone}</a>}
          {c.city && <p className="flex items-center gap-2 text-fg"><MapPin className="h-3.5 w-3.5 text-fg-muted" />{c.city}</p>}
        </div>
      </section>

      <section>
        <SectionTitle>Profile</SectionTitle>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <KV label="Current title">{c.currentTitle}</KV>
          <KV label="Current company">{c.currentCompany}</KV>
          <KV label="Experience">{c.totalExperience !== null ? formatYears(c.totalExperience) : ''}</KV>
          <KV label="Notice period">{c.noticePeriodDays !== null ? `${c.noticePeriodDays} days` : ''}</KV>
          <KV label="Current CTC">{c.currentCtc !== null ? <span className="tabular-nums">{formatMoney(c.currentCtc)}</span> : ''}</KV>
          <KV label="Expected CTC">{c.expectedCtc !== null ? <span className="tabular-nums">{formatMoney(c.expectedCtc)}</span> : ''}</KV>
          <KV label="Source">{SOURCE_LABELS[detail.source]}{detail.referredBy ? ` · ${detail.referredBy.name}` : ''}</KV>
          {detail.status === 'rejected' && <KV label="Rejection reason">{detail.rejectionReason}</KV>}
        </dl>
        {links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {links.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-xs font-semibold text-fg hover:bg-bg-subtle">
                {l.label}<ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </section>

      {detail.answers.length > 0 && (
        <section>
          <SectionTitle>Application answers</SectionTitle>
          <dl className="divide-y divide-line rounded-lg border border-line">
            {detail.answers.map((a, i) => (
              <div key={i} className="px-3 py-2.5">
                <dt className="text-xs font-medium text-fg-muted">{a.label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-fg">{a.value || <span className="text-fg-subtle">—</span>}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {detail.otherApplications.length > 0 && (
        <section>
          <SectionTitle>Other applications</SectionTitle>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {detail.otherApplications.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="truncate text-sm text-fg">{o.positionTitle}</span>
                <StageBadge stage={o.stage} status={o.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
