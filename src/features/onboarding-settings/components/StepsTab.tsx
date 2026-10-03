'use client';

import React from 'react';
import { ChevronUp, ChevronDown, Plus, Trash2, Lock } from 'lucide-react';
import { Section } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import type { OnboardingFieldDto, OnboardingFieldType, OnboardingStepDto } from '../types/onboarding-settings.dto';
import { FIELD_TYPE_LABELS } from '../constants/onboarding-settings.constants';
import { moveItem, withOrders } from '../utils/reorder';
import { FieldDialog } from './FieldDialog';

function IconButton({ onClick, disabled, children, label }: { onClick: () => void; disabled?: boolean; children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-fg-muted transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function FieldRow({
  field, index, total, onChange, onMove, onRemove,
}: {
  field: OnboardingFieldDto;
  index: number;
  total: number;
  onChange: (patch: Partial<OnboardingFieldDto>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <tr className="border-b border-line last:border-0">
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col">
            <IconButton label="Move up" onClick={() => onMove(-1)} disabled={index === 0}><ChevronUp className="h-3.5 w-3.5" /></IconButton>
          </div>
          <div>
            <p className="text-sm font-medium text-fg">{field.label}</p>
            <p className="text-xs text-fg-muted">{FIELD_TYPE_LABELS[field.type] || field.type}{field.sensitive ? ' · encrypted' : ''}</p>
          </div>
        </div>
      </td>
      <td className="w-24 py-2.5 text-center">
        <Switch checked={field.visible} onChange={(v) => onChange({ visible: v, required: v ? field.required : false })} label={`${field.label} visible`} />
      </td>
      <td className="w-24 py-2.5 text-center">
        <Switch
          checked={field.required}
          onChange={(v) => onChange({ required: v })}
          label={`${field.label} mandatory`}
          disabled={field.locked || !field.visible}
        />
      </td>
      <td className="w-20 py-2.5 text-right">
        {field.locked ? (
          <Lock className="ml-auto h-4 w-4 text-fg-subtle" aria-label="Locked field" />
        ) : (
          <div className="flex items-center justify-end gap-1">
            <IconButton label="Move down" onClick={() => onMove(1)} disabled={index === total - 1}><ChevronDown className="h-3.5 w-3.5" /></IconButton>
            {!field.system && (
              <IconButton label="Remove field" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></IconButton>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export function StepsTab({
  steps,
  onChange,
  fieldTypes,
}: {
  steps: OnboardingStepDto[];
  onChange: (steps: OnboardingStepDto[]) => void;
  fieldTypes: OnboardingFieldType[];
}) {
  const [dialogStepKey, setDialogStepKey] = React.useState<string | null>(null);

  const updateStep = (stepIndex: number, patch: Partial<OnboardingStepDto>) => {
    const next = steps.slice();
    next[stepIndex] = { ...next[stepIndex], ...patch };
    onChange(next);
  };

  const updateField = (stepIndex: number, fieldIndex: number, patch: Partial<OnboardingFieldDto>) => {
    const step = steps[stepIndex];
    const fields = step.fields.slice();
    fields[fieldIndex] = { ...fields[fieldIndex], ...patch };
    updateStep(stepIndex, { fields });
  };

  const moveField = (stepIndex: number, fieldIndex: number, direction: -1 | 1) => {
    const step = steps[stepIndex];
    updateStep(stepIndex, { fields: withOrders(moveItem(step.fields, fieldIndex, direction)) });
  };

  const removeField = (stepIndex: number, fieldIndex: number) => {
    const step = steps[stepIndex];
    updateStep(stepIndex, { fields: withOrders(step.fields.filter((_, i) => i !== fieldIndex)) });
  };

  const addField = (stepIndex: number, field: OnboardingFieldDto) => {
    const step = steps[stepIndex];
    updateStep(stepIndex, { fields: withOrders([...step.fields, field]) });
    setDialogStepKey(null);
  };

  const moveStep = (index: number, direction: -1 | 1) => onChange(withOrders(moveItem(steps, index, direction)));

  const dialogStepIndex = steps.findIndex((s) => s.key === dialogStepKey);

  return (
    <div className="space-y-3">
      {steps.map((step, stepIndex) => (
        <Section
          key={step.key}
          title={step.label}
          description={`${step.fields.filter((f) => f.visible).length} of ${step.fields.length} fields visible`}
          aside={
            <div className="flex items-center gap-2">
              <IconButton label="Move step up" onClick={() => moveStep(stepIndex, -1)} disabled={stepIndex === 0}><ChevronUp className="h-3.5 w-3.5" /></IconButton>
              <IconButton label="Move step down" onClick={() => moveStep(stepIndex, 1)} disabled={stepIndex === steps.length - 1}><ChevronDown className="h-3.5 w-3.5" /></IconButton>
            </div>
          }
        >
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-xs font-semibold text-fg-muted">
                <th className="pb-2 font-semibold">Field</th>
                <th className="w-24 pb-2 text-center font-semibold">Visible</th>
                <th className="w-24 pb-2 text-center font-semibold">Mandatory</th>
                <th className="w-20 pb-2 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {step.fields.map((field, fieldIndex) => (
                <FieldRow
                  key={field.key}
                  field={field}
                  index={fieldIndex}
                  total={step.fields.length}
                  onChange={(patch) => updateField(stepIndex, fieldIndex, patch)}
                  onMove={(direction) => moveField(stepIndex, fieldIndex, direction)}
                  onRemove={() => removeField(stepIndex, fieldIndex)}
                />
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => setDialogStepKey(step.key)}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--tt-primary)] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add field
          </button>
        </Section>
      ))}

      <FieldDialog
        open={dialogStepIndex >= 0}
        onClose={() => setDialogStepKey(null)}
        onSave={(field) => addField(dialogStepIndex, field)}
        fieldTypes={fieldTypes}
        existingKeys={dialogStepIndex >= 0 ? steps[dialogStepIndex].fields.map((f) => f.key) : []}
      />
    </div>
  );
}
