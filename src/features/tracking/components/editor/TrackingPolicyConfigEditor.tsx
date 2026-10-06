'use client';

import React from 'react';
import { AlertTriangle, Code2, Save, SlidersHorizontal } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { SectionNode } from '@/features/policies/components/editor/form/schemaTypes';
import { SchemaForm } from '@/features/policies/components/editor/form/SchemaForm';
import { TRACKING_SECTIONS, type TrackingSectionKey } from '../../constants/trackingSections.constants';

interface TrackingPolicyConfigEditorProps {
  config: Record<string, unknown>;
  schema: Record<string, SectionNode>;
  isSaving: boolean;
  onSave: (config: Record<string, unknown>, changeNote?: string) => Promise<boolean>;
}

const SECTION_TAB_OPTIONS = TRACKING_SECTIONS.map((s) => ({
  value: s.value,
  label: s.label,
}));

export function TrackingPolicyConfigEditor({
  config,
  schema,
  isSaving,
  onSave,
}: TrackingPolicyConfigEditorProps) {
  const [mode, setMode] = React.useState<'form' | 'json'>('form');
  const [activeTab, setActiveTab] = React.useState<TrackingSectionKey>('tracking');
  const [value, setValue] = React.useState<Record<string, unknown>>(() => config || {});
  const [text, setText] = React.useState(() => JSON.stringify(config, null, 2));
  const [changeNote, setChangeNote] = React.useState('');
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [serverErrors, setServerErrors] = React.useState<string[]>([]);

  React.useEffect(() => {
    setValue(config || {});
    setText(JSON.stringify(config, null, 2));
  }, [config]);

  const handleSave = async () => {
    setParseError(null);
    setServerErrors([]);
    let nextConfig = value;
    if (mode === 'json') {
      try {
        nextConfig = JSON.parse(text);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Invalid JSON');
        return;
      }
    }
    const ok = await onSave(nextConfig, changeNote.trim());
    if (ok) {
      setChangeNote('');
    }
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

          <div className="space-y-4">
            {activeMeta?.schemaKeys.map((schemaKey) => {
              const node = schema[schemaKey];
              if (!node) return null;
              return (
                <SchemaForm
                  key={schemaKey}
                  section={schemaKey}
                  node={node}
                  value={(value[schemaKey] as Record<string, unknown>) || {}}
                  onChange={(next) => setSection(schemaKey, next)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
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

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Change note</label>
        <input
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          placeholder="What changed in this policy revision…"
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
          {isSaving ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span>Save changes</span>
        </button>
      </div>
    </div>
  );
}
