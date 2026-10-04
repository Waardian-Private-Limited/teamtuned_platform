'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Chip, FieldLabel, FieldMessage, SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { ALL_DAYS_MASK, WEEKDAYS } from '../../../constants/roster.constants';
import { daysToMask, maskToDays, todayLocal } from '../../../utils/rosterTime';

type Kind = 'unavailable' | 'prefer' | 'avoid';

interface Props {
  shiftOptions: { id: number; name: string }[];
  onClose: () => void;
  onSubmit: (body: { kind: Kind; fromDate: string; toDate?: string; daysMask?: number; shiftTemplateId?: number | null; note?: string }) => Promise<string | null>;
}

const KINDS: { value: Kind; label: string }[] = [
  { value: 'unavailable', label: 'I cannot work' },
  { value: 'avoid', label: 'I would rather not work' },
  { value: 'prefer', label: 'I would like to work' },
];

export function AddAvailabilityDialog({ shiftOptions, onClose, onSubmit }: Props) {
  const [kind, setKind] = useState<Kind>('unavailable');
  const [from, setFrom] = useState(todayLocal());
  const [to, setTo] = useState('');
  const [days, setDays] = useState<number[]>(maskToDays(ALL_DAYS_MASK));
  const [shiftId, setShiftId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<'from' | 'to' | 'days' | ''>('');
  const [saving, setSaving] = useState(false);

  const toggle = (i: number) => setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));

  const submit = async () => {
    setError('');
    setFieldError('');
    if (!from) { setFieldError('from'); return setError('Choose a start date'); }
    if (to && to < from) { setFieldError('to'); return setError('The end date cannot be before the start date'); }
    if (days.length === 0) { setFieldError('days'); return setError('Choose at least one weekday'); }
    setSaving(true);
    const err = await onSubmit({
      kind, fromDate: from, toDate: to || from, daysMask: daysToMask(days), shiftTemplateId: shiftId, note: note.trim() || undefined,
    });
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Add availability"
      footer={
        <>
          <Button variant="secondary" className="!h-10 !w-auto !px-4 !text-sm" onClick={onClose}>Close</Button>
          <Button className="!h-10 !w-auto !px-4 !text-sm" loading={saving} onClick={submit}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectField<Kind> label="This is" value={kind} onChange={(v) => v && setKind(v)} options={KINDS} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="From" type="date" value={from} onChange={setFrom} error={fieldError === 'from' ? error : undefined} />
          <TextField label="To (optional)" type="date" value={to} min={from} onChange={setTo} error={fieldError === 'to' ? error : undefined} />
        </div>
        <div>
          <FieldLabel label="On these days" />
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((w, i) => (
              <Chip key={w} active={days.includes(i)} onClick={() => toggle(i)}>{w}</Chip>
            ))}
          </div>
          <FieldMessage error={fieldError === 'days' ? error : undefined} />
        </div>
        {shiftOptions.length > 0 && (
          <SelectField<number>
            label="Only for this shift (optional)"
            value={shiftId}
            numeric
            placeholder="Any shift"
            onChange={setShiftId}
            options={shiftOptions.map((s) => ({ value: s.id, label: s.name }))}
          />
        )}
        <Textarea label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        {error && !fieldError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      </div>
    </Dialog>
  );
}
