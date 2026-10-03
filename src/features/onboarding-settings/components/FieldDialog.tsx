'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { TextField, SelectField, FieldLabel, FieldMessage } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import type { OnboardingFieldDto, OnboardingFieldType } from '../types/onboarding-settings.dto';
import { customFieldKey, FIELD_TYPE_LABELS } from '../constants/onboarding-settings.constants';

const OPTION_TYPES: OnboardingFieldType[] = ['select', 'multiselect'];

export function FieldDialog({
  open,
  onClose,
  onSave,
  fieldTypes,
  existingKeys,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (field: OnboardingFieldDto) => void;
  fieldTypes: OnboardingFieldType[];
  existingKeys: string[];
}) {
  const [label, setLabel] = React.useState('');
  const [type, setType] = React.useState<OnboardingFieldType>('text');
  const [optionsText, setOptionsText] = React.useState('');
  const [required, setRequired] = React.useState(false);
  const [sensitive, setSensitive] = React.useState(false);
  const [helpText, setHelpText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setLabel(''); setType('text'); setOptionsText(''); setRequired(false); setSensitive(false); setHelpText(''); setError(null);
    }
  }, [open]);

  const save = () => {
    const trimmed = label.trim();
    if (!trimmed) { setError('Enter a label for the field'); return; }
    let key = customFieldKey(trimmed);
    if (existingKeys.includes(key)) {
      let n = 2;
      while (existingKeys.includes(`${key}_${n}`)) n += 1;
      key = `${key}_${n}`;
    }
    const options = OPTION_TYPES.includes(type)
      ? optionsText.split(',').map((o) => o.trim()).filter(Boolean)
      : [];
    if (OPTION_TYPES.includes(type) && !options.length) { setError('Add at least one option, separated by commas'); return; }

    onSave({
      key, system: false, locked: false, type, label: trimmed, helpText: helpText.trim(),
      options, visible: true, required, sensitive, order: 0,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add field"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Add field</Button></>}
    >
      <div className="space-y-4">
        <TextField label="Label" value={label} onChange={setLabel} placeholder="e.g. T-shirt size" autoFocus />
        <SelectField<OnboardingFieldType>
          label="Type" value={type} onChange={(v) => setType(v || 'text')}
          options={fieldTypes.map((t) => ({ value: t, label: FIELD_TYPE_LABELS[t] || t }))}
        />
        {OPTION_TYPES.includes(type) && (
          <div>
            <FieldLabel label="Options" required />
            <textarea
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder="Comma-separated, e.g. Small, Medium, Large"
              rows={2}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tt-primary)]"
            />
            <FieldMessage hint="Shown to the employee in this order." />
          </div>
        )}
        <TextField label="Help text" value={helpText} onChange={setHelpText} placeholder="Optional guidance shown under the field" />
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
          <span className="text-sm font-medium text-fg">Mandatory</span>
          <Switch checked={required} onChange={setRequired} label="Mandatory" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
          <div>
            <span className="block text-sm font-medium text-fg">Encrypt this field</span>
            <span className="block text-xs text-fg-muted">For sensitive personal data (contact details, etc.)</span>
          </div>
          <Switch checked={sensitive} onChange={setSensitive} label="Encrypt this field" />
        </div>
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      </div>
    </Dialog>
  );
}
