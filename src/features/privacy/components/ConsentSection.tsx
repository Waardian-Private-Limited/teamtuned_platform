'use client';

import { useState } from 'react';
import { Building2, Check, ClipboardList, Clock, Eye, FileText, Hourglass, Languages, Lock, MapPin, MessageSquare, Scale, ShieldCheck, Target, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CONSENT_LANGUAGES, CONSENT_STRINGS } from '../constants/consentUi';
import type { useConsent } from '../hooks/useConsent';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  who: Building2,
  personal: UserRound,
  documents_payroll: FileText,
  attendance_face: Clock,
  work: ClipboardList,
  tracking: MapPin,
  why: Target,
  who_sees: Eye,
  security: Lock,
  retention: Hourglass,
  rights: Scale,
  complaints: MessageSquare,
};

function stripMarkdown(text: string) {
  return text.replace(/^#+\s*/gm, '');
}

function Tick({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: React.ReactNode }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${checked ? 'border-[var(--tt-primary)] bg-bg-subtle' : 'border-line bg-surface hover:bg-bg-subtle'}`}>
      <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${checked ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line-strong bg-surface'}`}>
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="text-fg">{label}</span>
    </label>
  );
}

/**
 * The global privacy notice and consent, in the user's language: a header with a
 * language picker, the notice as short cards, one tick per purpose (required ones
 * marked), and a "read and understood" confirmation. The caller owns `useConsent()`
 * and what happens after acceptance.
 */
export function ConsentSection({ vm }: { vm: ReturnType<typeof useConsent> }) {
  const [menu, setMenu] = useState(false);
  const ui = CONSENT_STRINGS[vm.lang];

  if (vm.loading) return <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />;
  if (vm.loadError) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-[var(--tt-danger)]">{vm.loadError}</p>
        <Button variant="secondary" onClick={vm.retryLoad}>{ui.retry}</Button>
      </div>
    );
  }

  const notice = vm.consent!.notice;
  const content = notice.translations?.[vm.lang] ?? notice.translations?.en ?? null;
  const officer = notice.grievance_officer;
  const labelOf = (key: string, fallback: string) => content?.purposes?.[key] ?? fallback;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--tt-primary)] text-[var(--tt-on-primary)]"><ShieldCheck className="h-5 w-5" /></span>
          <h2 className="text-base font-bold leading-tight text-fg">{content?.title ?? notice.title}</h2>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setMenu((m) => !m)} aria-label={ui.language} aria-expanded={menu} className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-semibold text-fg hover:bg-bg-subtle">
            <Languages className="h-4 w-4" />
            {CONSENT_LANGUAGES.find((l) => l.code === vm.lang)?.label}
          </button>
          {menu && (
            <ul className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
              {CONSENT_LANGUAGES.map((l) => (
                <li key={l.code}>
                  <button type="button" onClick={() => { vm.setLang(l.code); setMenu(false); }} className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg-subtle ${l.code === vm.lang ? 'font-bold' : ''}`}>
                    {l.label}
                    {l.code === vm.lang && <Check className="h-4 w-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {notice.change_summary && (notice.change_summary[vm.lang] || notice.change_summary.en) && (
        <div className="rounded-xl border border-[var(--tt-primary)] bg-bg-subtle p-3 text-sm">
          <div className="mb-0.5 font-bold text-fg">{ui.changed}{notice.previous_version ? ` (v${notice.previous_version} → v${notice.version})` : ''}</div>
          <p className="leading-relaxed text-fg-muted">{notice.change_summary[vm.lang] || notice.change_summary.en}</p>
        </div>
      )}

      {content ? (
        <>
          <p className="text-sm leading-relaxed text-fg-muted">{content.intro}</p>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {content.sections.map((s) => {
              const Icon = ICONS[s.key] ?? FileText;
              return (
                <section key={s.key} className="rounded-xl border border-line bg-surface p-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-fg"><Icon className="h-4 w-4 shrink-0 text-fg-muted" />{s.heading}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{s.body}</p>
                </section>
              );
            })}
            {officer && (officer.name || officer.email) && (
              <section className="rounded-xl border border-line bg-bg-subtle p-3 text-[13px] text-fg-muted">
                <span className="font-bold text-fg">{ui.grievance}: </span>{[officer.name, officer.email, officer.phone].filter(Boolean).join(' · ')}
              </section>
            )}
          </div>
        </>
      ) : (
        <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-surface p-3 text-sm leading-relaxed text-fg-muted">{stripMarkdown(notice.body_md)}</div>
      )}

      <div className="space-y-2">
        {!vm.accepted && (
          <button type="button" onClick={vm.checkAllRequired} className="text-xs font-semibold text-fg underline underline-offset-2">{ui.selectAll}</button>
        )}
        {notice.purposes.map((p) => (
          <Tick
            key={p.key}
            checked={vm.checked[p.key] ?? false}
            disabled={vm.accepted}
            onChange={(v) => vm.toggle(p.key, v)}
            label={<>{labelOf(p.key, p.label)} <span className={`ml-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase ${p.required ? 'border-[var(--tt-danger)]/40 text-[var(--tt-danger)]' : 'border-line text-fg-muted'}`}>{p.required ? ui.required : ui.optional}</span>{notice.new_purposes?.includes(p.key) && <span className="ml-1 rounded-full bg-[var(--tt-primary)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--tt-on-primary)]">{ui.isNew}</span>}</>}
          />
        ))}
        <Tick checked={vm.read} disabled={vm.accepted} onChange={vm.setRead} label={<span className="font-semibold">{ui.read}</span>} />
      </div>

      {!vm.accepted && !vm.canAccept && <p className="text-xs text-fg-muted">{ui.hint}</p>}
      {vm.submitError && <p className="text-xs font-medium text-[var(--tt-danger)]">{vm.submitError}</p>}
    </div>
  );
}
