'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { TextField, SelectField } from '@/components/ui/FormControls';
import { Chip } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import type { OnboardingAcceptType, OnboardingDocumentDto, OnboardingNumberPattern } from '../types/onboarding-settings.dto';
import { customDocKey, NUMBER_PATTERN_LABELS } from '../constants/onboarding-settings.constants';

export function DocumentDialog({
  open,
  onClose,
  onSave,
  numberPatterns,
  acceptTypes,
  existingKeys,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (doc: OnboardingDocumentDto) => void;
  numberPatterns: OnboardingNumberPattern[];
  acceptTypes: OnboardingAcceptType[];
  existingKeys: string[];
}) {
  const [label, setLabel] = React.useState('');
  const [helpText, setHelpText] = React.useState('');
  const [required, setRequired] = React.useState(false);
  const [numberRequired, setNumberRequired] = React.useState(false);
  const [numberPattern, setNumberPattern] = React.useState<OnboardingNumberPattern>('none');
  const [sides, setSides] = React.useState(1);
  const [accept, setAccept] = React.useState<OnboardingAcceptType[]>(acceptTypes);
  const [maxMb, setMaxMb] = React.useState('5');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setLabel(''); setHelpText(''); setRequired(false); setNumberRequired(false);
      setNumberPattern('none'); setSides(1); setAccept(acceptTypes); setMaxMb('5'); setError(null);
    }
  }, [open, acceptTypes]);

  const save = () => {
    const trimmed = label.trim();
    if (!trimmed) { setError('Enter a label for the document'); return; }
    if (!accept.length) { setError('Select at least one accepted file type'); return; }
    let key = customDocKey(trimmed);
    if (existingKeys.includes(key)) {
      let n = 2;
      while (existingKeys.includes(`${key}_${n}`)) n += 1;
      key = `${key}_${n}`;
    }
    onSave({
      key, system: false, label: trimmed, helpText: helpText.trim(), visible: true, required,
      numberRequired, numberPattern, sides, accept, maxMb: Number(maxMb) || 5, order: 0,
    });
  };

  const toggleAccept = (t: OnboardingAcceptType) => {
    setAccept((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add document type"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Add document</Button></>}
    >
      <div className="space-y-4">
        <TextField label="Label" value={label} onChange={setLabel} placeholder="e.g. Driving licence" autoFocus />
        <TextField label="Help text" value={helpText} onChange={setHelpText} placeholder="Optional guidance shown under the upload" />
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
          <span className="text-sm font-medium text-fg">Mandatory</span>
          <Switch checked={required} onChange={setRequired} label="Mandatory" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
          <span className="text-sm font-medium text-fg">Ask for a document number</span>
          <Switch checked={numberRequired} onChange={setNumberRequired} label="Ask for a document number" />
        </div>
        {numberRequired && (
          <SelectField<OnboardingNumberPattern>
            label="Number format" value={numberPattern} onChange={(v) => setNumberPattern(v || 'none')}
            options={numberPatterns.map((p) => ({ value: p, label: NUMBER_PATTERN_LABELS[p] || p }))}
          />
        )}
        <SelectField<number>
          label="Sides to upload" value={sides} numeric onChange={(v) => setSides(v || 1)}
          options={[{ value: 1, label: 'Single side' }, { value: 2, label: 'Front & back' }]}
        />
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Accepted file types</span>
          <div className="flex gap-2">
            {acceptTypes.map((t) => (
              <Chip key={t} active={accept.includes(t)} onClick={() => toggleAccept(t)}>{t.toUpperCase()}</Chip>
            ))}
          </div>
        </div>
        <TextField label="Max file size (MB)" type="number" min={1} max={20} value={maxMb} onChange={setMaxMb} />
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      </div>
    </Dialog>
  );
}
