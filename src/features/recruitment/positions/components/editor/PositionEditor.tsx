'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cx } from '@/theme/tokens';
import { useRecruitmentAccess } from '../../../shared/hooks/useRecruitmentAccess';
import { useRecruitmentOptions } from '../../../shared/hooks/useRecruitmentOptions';
import type { PositionDetail } from '../../../shared/types/recruitment.model';
import { EDITOR_SECTIONS, usePositionEditor, type SectionId } from '../../hooks/usePositionEditor';
import {
  AssessmentSection, BasicsSection, CompensationSection, DescriptionSection, FormSection, InterviewPlanSection,
  LocationSection, PublishingSection, SkillsSection,
} from './EditorSections';

interface PositionEditorProps {
  /** null = create. */
  initial: PositionDetail | null;
  onSaved: (p: PositionDetail) => void;
  onCancel: () => void;
  /** Optional heading block rendered above the sections (create page). */
  header?: React.ReactNode;
}

/**
 * Sectioned single-page editor with a sticky section nav (desktop rail,
 * phone chip row) and a sticky save footer. Errors (local or the API's
 * `{ field }`) mark the field red and the section in the nav, and the
 * view scrolls to the first one.
 */
export function PositionEditor({ initial, onSaved, onCancel, header }: PositionEditorProps) {
  const access = useRecruitmentAccess();
  const { options } = useRecruitmentOptions();
  const ed = usePositionEditor(initial, onSaved);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<SectionId>('basics');

  const scrollTo = useCallback((id: SectionId) => {
    const root = scrollerRef.current;
    const el = root?.querySelector<HTMLElement>(`#pos-section-${id}`);
    if (!root || !el) return;
    root.scrollTo({ top: el.offsetTop - root.offsetTop - 8, behavior: 'smooth' });
    setActive(id);
    requestAnimationFrame(() => el.querySelector<HTMLElement>('[aria-invalid="true"], input, textarea, select, button')?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const onScroll = () => {
      const top = root.getBoundingClientRect().top + 80;
      let current: SectionId = 'basics';
      root.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
        if (el.getBoundingClientRect().top <= top) current = el.dataset.section as SectionId;
      });
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) current = 'publishing';
      setActive(current);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, []);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!ed.dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [ed.dirty]);

  const save = async () => {
    const bad = await ed.submit();
    if (bad) scrollTo(bad);
  };

  const navItem = (s: (typeof EDITOR_SECTIONS)[number], compact = false) => {
    const err = ed.sectionErrors.has(s.id);
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => scrollTo(s.id)}
        aria-current={active === s.id ? 'true' : undefined}
        className={cx(
          'flex shrink-0 items-center gap-2 text-left text-xs font-semibold transition-colors sm:text-[13px]',
          compact ? 'h-8 rounded-md border px-2.5' : 'w-full rounded-md px-2.5 py-1.5',
          active === s.id
            ? compact ? 'border-fg bg-fg text-fg-inverted' : 'bg-bg-subtle text-fg'
            : compact ? 'border-line text-fg-muted' : 'text-fg-muted hover:bg-bg-subtle/60 hover:text-fg',
          err && 'text-[var(--tt-danger)]'
        )}
      >
        {err && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--tt-danger)]" aria-label="has errors" />}
        {s.label}
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex gap-1.5 overflow-x-auto tt-scroll-hidden lg:hidden">{EDITOR_SECTIONS.map((s) => navItem(s, true))}</div>
      <div className="flex min-h-0 flex-1 gap-4">
        <nav aria-label="Position sections" className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-0 space-y-0.5 rounded-xl border border-line bg-surface p-2">{EDITOR_SECTIONS.map((s) => navItem(s))}</div>
        </nav>
        <div ref={scrollerRef} className="relative min-h-0 flex-1 overflow-y-auto tt-scroll-hidden">
          <div className="space-y-3 pb-4">
            {header}
            <BasicsSection ed={ed} options={options} />
            <LocationSection ed={ed} options={options} allowSharedSubOrg={access.isOrgAdmin} />
            <CompensationSection ed={ed} />
            <DescriptionSection ed={ed} />
            <SkillsSection ed={ed} />
            <InterviewPlanSection ed={ed} />
            <AssessmentSection ed={ed} options={options} />
            <FormSection ed={ed} />
            <PublishingSection ed={ed} isNew={!initial} />
          </div>
          <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/95 px-4 py-3 shadow-[var(--tt-shadow-md)] backdrop-blur">
            <p className="hidden text-xs text-fg-muted sm:block">
              {Object.keys(ed.errors).length ? <span className="font-semibold text-[var(--tt-danger)]">Fix the highlighted fields</span> : ed.dirty ? 'Unsaved changes' : initial ? 'No changes' : ''}
            </p>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={onCancel} className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3.5 text-sm font-semibold text-fg hover:bg-bg-subtle">Cancel</button>
              <button type="button" onClick={save} disabled={ed.isSaving} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:opacity-50">
                {ed.isSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {initial ? 'Save changes' : 'Create position'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
