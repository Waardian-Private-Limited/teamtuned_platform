'use client';

import React from 'react';
import { AlertTriangle, Code2, Save, SlidersHorizontal } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { usePolicySchema } from '../../hooks/usePolicySchema';
import { useLeaveTypeList } from '../../hooks/useLeaveTypeList';
import { useSalaryComponentList } from '../../hooks/useSalaryComponentList';
import { SchemaForm } from './form/SchemaForm';
import { POLICY_SECTIONS, type PolicySectionKey } from '../../constants/policies.constants';

interface PolicyConfigEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  isSaving: boolean;
  onSave: (config: unknown, changeNote: string) => Promise<{ ok: boolean; errors: string[] }>;
}

// A backend violation reads "leave.rules[0].block.blockDays: message". Split
// it so the message can sit under the field it names.
function splitViolation(line: string): { path: string; message: string } | null {
  const match = /^([A-Za-z0-9_.[\]]+): (.+)$/.exec(line);
  return match ? { path: match[1], message: match[2] } : null;
}


/**
 * The policy version's draft config — grace period, shift, leave
 * entitlement per leave type, payroll cycle, and everything else the four
 * config sections cover. Fields are generated from the backend schema
 * registry's describe() (domain/schemas/index.js) so a new rule shows up
 * here the moment it's added there. An advanced JSON view stays available
 * for edits the generated form doesn't have a control for yet.
 */
const SECTION_TAB_OPTIONS = POLICY_SECTIONS.map((s) => ({ value: s.value, label: s.label }));

export function PolicyConfigEditor({ config, isSaving, onSave }: PolicyConfigEditorProps) {
  const { schema, isLoading: schemaLoading, error: schemaError } = usePolicySchema();
  const { leaveTypes } = useLeaveTypeList();
  const { salaryComponents } = useSalaryComponentList();

  const [mode, setMode] = React.useState<'form' | 'json'>('form');
  const [activeTab, setActiveTab] = React.useState<PolicySectionKey>('workRules');
  const [value, setValue] = React.useState<Record<string, unknown>>(() => config || {});
  const [text, setText] = React.useState(() => JSON.stringify(config, null, 2));
  const [changeNote, setChangeNote] = React.useState('');
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [serverErrors, setServerErrors] = React.useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setValue(config || {});
    setText(JSON.stringify(config, null, 2));
  }, [config]);

  const leaveTypeOptions = React.useMemo(() => leaveTypes.map((lt) => ({ id: lt.id, name: lt.name, code: lt.code, genderEligibility: lt.genderEligibility })), [leaveTypes]);

  const handleSave = async () => {
    setParseError(null);
    setServerErrors([]);
    setFieldErrors({});
    let nextConfig: unknown = value;
    if (mode === 'json') {
      try {
        nextConfig = JSON.parse(text);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Invalid JSON');
        return;
      }
    }
    const { ok, errors } = await onSave(nextConfig, changeNote.trim());
    if (ok) {
      setChangeNote('');
      return;
    }
    // Violations the form can point at get a red border there; the rest are
    // listed under the form.
    const byPath: Record<string, string> = {};
    const unplaced: string[] = [];
    for (const line of errors) {
      const v = splitViolation(line);
      if (v && mode === 'form') byPath[v.path] = v.message;
      else unplaced.push(line);
    }
    // A highlighted field may sit on another tab, so name the tabs that have one.
    const sectionsWithErrors = new Set(Object.keys(byPath).map((path) => path.split(/[.[]/)[0]));
    for (const section of POLICY_SECTIONS) {
      if (sectionsWithErrors.has(section.value)) unplaced.push(`Fix the highlighted fields under ${section.label}.`);
    }
    setFieldErrors(byPath);
    setServerErrors(unplaced.length ? unplaced : ['Save failed — see the notification for details.']);
  };

  const switchToJson = () => {
    setText(JSON.stringify(value, null, 2));
    setMode('json');
  };
  const switchToForm = () => {
    if (mode !== 'json') { setMode('form'); return; }
    try {
      setValue(JSON.parse(text));
      setParseError(null);
      setMode('form');
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON — fix it or discard to switch back');
    }
  };

  const sectionTopRef = React.useRef<HTMLDivElement | null>(null);
  const isFirstRender = React.useRef(true);

  const scrollToTop = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    if (sectionTopRef.current) {
      let parent = sectionTopRef.current.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          parent.scrollTo({ top: 0, behavior: 'smooth' });
        }
        parent = parent.parentElement;
      }
      sectionTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scrollToTop();
  }, [activeTab, scrollToTop]);

  const handleTabChange = (nextTab: PolicySectionKey) => {
    setActiveTab(nextTab);
    requestAnimationFrame(() => {
      scrollToTop();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-line bg-bg-subtle p-1">
          <button
            type="button"
            onClick={switchToForm}
            className={cx(
              'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition-colors',
              mode === 'form' ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'
            )}
          >
            <SlidersHorizontal className="h-3 w-3" /> Form
          </button>
          <button
            type="button"
            onClick={switchToJson}
            className={cx(
              'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition-colors',
              mode === 'json' ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'
            )}
          >
            <Code2 className="h-3 w-3" /> Advanced (JSON)
          </button>
        </div>
        <span className="text-[11px] text-fg-subtle">Edits here only affect the draft — nothing is live until published</span>
      </div>

      {mode === 'form' ? (
        schemaLoading ? (
          <div className="rounded-lg border border-line bg-surface p-6 text-center text-xs text-fg-muted">Loading policy fields…</div>
        ) : schemaError || !schema ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--tt-danger)]">
            <AlertTriangle className="h-3.5 w-3.5" /> {schemaError || 'Could not load policy fields'}
          </p>
        ) : (
          <div ref={sectionTopRef} className="flex flex-col gap-3">
            <SegmentedControl options={SECTION_TAB_OPTIONS} value={activeTab} onChange={handleTabChange} />
            <SchemaForm
              section={activeTab}
              node={schema[activeTab]}
              value={(value[activeTab] as Record<string, unknown>) || {}}
              onChange={(next) => setValue((prev) => ({ ...prev, [activeTab]: next }))}
              leaveTypeOptions={leaveTypeOptions}
              salaryComponentOptions={salaryComponents}
              fieldErrors={fieldErrors}
            />
          </div>
        )
      ) : (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            rows={20}
            className={cx(
              'w-full resize-y rounded-lg border bg-surface p-3 font-mono text-xs leading-relaxed text-fg outline-none transition-colors focus:ring-1',
              parseError ? 'border-[var(--tt-danger)] focus:border-[var(--tt-danger)] focus:ring-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)] focus:ring-[var(--tt-primary)]'
            )}
          />
        </div>
      )}

      {parseError && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--tt-danger)]">
          <AlertTriangle className="h-3.5 w-3.5" /> {parseError}
        </p>
      )}
      {serverErrors.map((err, i) => (
        <p key={i} className="flex items-center gap-1.5 text-xs font-medium text-[var(--tt-danger)]">
          <AlertTriangle className="h-3.5 w-3.5" /> {err}
        </p>
      ))}

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Change note</label>
        <input
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          placeholder="What changed and why…"
          className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
        >
          {isSaving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Save className="h-3.5 w-3.5" />}
          <span>Save draft</span>
        </button>
      </div>
    </div>
  );
}
