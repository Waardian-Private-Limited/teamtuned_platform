'use client';

import React from 'react';
import { AlertTriangle, Code2, Save, SlidersHorizontal } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { SectionNode } from '@/features/policies/components/editor/form/schemaTypes';
import { SchemaForm } from '@/features/policies/components/editor/form/SchemaForm';
import { TRACKING_SECTIONS, type TrackingSectionKey } from '../../constants/trackingSections.constants';

export interface SaveResult {
  ok: boolean;
  /** The backend's validation lines ("section.field: message"); empty for other failures. */
  errors: string[];
}

/** What the page reads from the editor (publish uses the editor's current state, not the saved policy). */
export interface ConfigEditorHandle {
  /** The current config and change note, or null when the JSON view does not parse (the error is shown). */
  current: () => { config: Record<string, unknown>; changeNote: string } | null;
  showErrors: (errors: string[]) => void;
}

interface TrackingPolicyConfigEditorProps {
  /** The saved config the edits are compared against. */
  config: Record<string, unknown>;
  schema: Record<string, SectionNode>;
  isSaving: boolean;
  /** Archived policies are shown, not edited. */
  readOnly?: boolean;
  /** Bumped by the page when the form must take `config` again (loaded, saved or published). */
  resetToken: number;
  onSave: (config: Record<string, unknown>, changeNote?: string) => Promise<SaveResult>;
  onDirtyChange?: (dirty: boolean) => void;
  handleRef?: React.Ref<ConfigEditorHandle>;
}

// Key order does not make a config different.
export function sameConfig(a: unknown, b: unknown) {
  return stable(a) === stable(b);
}

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v) ?? 'null';
}

function splitViolation(line: string): { path: string; message: string } | null {
  const match = /^([A-Za-z0-9_.[\]]+): (.+)$/.exec(line);
  return match ? { path: match[1], message: match[2] } : null;
}

const SECTION_TAB_OPTIONS = TRACKING_SECTIONS.map((s) => ({
  value: s.value,
  label: s.label,
}));

export function TrackingPolicyConfigEditor({
  config,
  schema,
  isSaving,
  readOnly = false,
  resetToken,
  onSave,
  onDirtyChange,
  handleRef,
}: TrackingPolicyConfigEditorProps) {
  const [mode, setMode] = React.useState<'form' | 'json'>('form');
  const [activeTab, setActiveTab] = React.useState<TrackingSectionKey>('tracking');
  const [value, setValue] = React.useState<Record<string, unknown>>(() => config || {});
  const [text, setText] = React.useState(() => JSON.stringify(config, null, 2));
  const [changeNote, setChangeNote] = React.useState('');
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [serverErrors, setServerErrors] = React.useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Only an explicit reset from the page replaces the form; a refreshed policy object does not.
  React.useEffect(() => {
    setValue(config || {});
    setText(JSON.stringify(config, null, 2));
    setChangeNote('');
    setParseError(null);
    setServerErrors([]);
    setFieldErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  const dirty = React.useMemo(() => {
    const base = stable(config || {});
    if (mode === 'form') return stable(value) !== base;
    try {
      return stable(JSON.parse(text)) !== base;
    } catch {
      return true;
    }
  }, [config, value, text, mode]);

  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const currentConfig = (): Record<string, unknown> | null => {
    if (mode !== 'json') return value;
    try {
      return JSON.parse(text);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON');
      return null;
    }
  };

  // Violations the form can point at get a red border there; the rest are listed under the form.
  const showErrors = (errors: string[]) => {
    const byPath: Record<string, string> = {};
    const unplaced: string[] = [];
    for (const line of errors) {
      const v = splitViolation(line);
      if (v && mode === 'form') byPath[v.path] = v.message;
      else unplaced.push(line);
    }
    // A highlighted field may sit on another tab, so name the tabs that have one.
    const sectionsWithErrors = new Set(Object.keys(byPath).map((path) => path.split(/[.[]/)[0]));
    for (const section of TRACKING_SECTIONS) {
      if (section.schemaKeys.some((k) => sectionsWithErrors.has(k))) unplaced.push(`Fix the highlighted fields under ${section.label}.`);
    }
    setFieldErrors(byPath);
    setServerErrors(unplaced);
  };

  React.useImperativeHandle(handleRef, () => ({
    current: () => {
      setParseError(null);
      const next = currentConfig();
      return next ? { config: next, changeNote: changeNote.trim() } : null;
    },
    showErrors,
  }));

  const handleSave = async () => {
    setParseError(null);
    setServerErrors([]);
    setFieldErrors({});
    const nextConfig = currentConfig();
    if (!nextConfig) return;
    const { ok, errors } = await onSave(nextConfig, changeNote.trim());
    if (!ok && errors.length) showErrors(errors);
  };

  const switchToJson = () => {
    setText(JSON.stringify(value, null, 2));
    setMode('json');
  };

  const switchToForm = () => {
    if (mode !== 'json') {
      setMode('form');
      return;
    }
    try {
      setValue(JSON.parse(text));
      setParseError(null);
      setMode('form');
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON — fix it or discard to switch back');
    }
  };

  const activeMeta = TRACKING_SECTIONS.find((s) => s.value === activeTab);

  const setSection = (key: string, next: Record<string, unknown>) => {
    setValue((prev) => ({ ...prev, [key]: next }));
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
        <span className="text-[11px] text-fg-subtle">
          Edits take effect when published — devices pick up changes on next sync
        </span>
      </div>

      {mode === 'form' ? (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto tt-scroll-hidden pb-1">
            <SegmentedControl options={SECTION_TAB_OPTIONS} value={activeTab} onChange={setActiveTab} />
          </div>

          <fieldset disabled={readOnly} className={cx('space-y-4', readOnly && 'opacity-70')}>
            {activeMeta?.schemaKeys.map((schemaKey) => {
              const node = schema[schemaKey];
              if (!node) return null;
              return (
                <SchemaForm
                  key={schemaKey}
                  section={schemaKey}
                  node={node}
                  value={(value[schemaKey] as Record<string, unknown>) || {}}
                  onChange={(next) => !readOnly && setSection(schemaKey, next)}
                  fieldErrors={fieldErrors}
                />
              );
            })}
          </fieldset>
        </div>
      ) : (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            readOnly={readOnly}
            spellCheck={false}
            rows={20}
            className={cx(
              'w-full resize-y rounded-lg border bg-surface p-3 font-mono text-xs leading-relaxed text-fg outline-none transition-colors focus:ring-1',
              parseError
                ? 'border-[var(--tt-danger)] focus:border-[var(--tt-danger)] focus:ring-[var(--tt-danger)]'
                : 'border-line focus:border-[var(--tt-primary)] focus:ring-[var(--tt-primary)]'
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

      {!readOnly && (
        <>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Change note</label>
            <input
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              maxLength={500}
              placeholder="What changed in this policy revision…"
              className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {dirty && <span className="text-[11px] font-medium text-fg-muted">Unsaved changes</span>}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            >
              {isSaving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Save changes</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
