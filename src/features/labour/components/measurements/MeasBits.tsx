'use client';

import React from 'react';
import type { Measurement, MeasurementStatus } from '../../types/labour.types';
import { money } from '../../utils/format';
import { qty } from '../../utils/pay';
import { Pill } from '../shared/Primitives';

const TONE: Record<MeasurementStatus, 'neutral' | 'warn' | 'good' | 'bad'> = { draft: 'neutral', submitted: 'warn', approved: 'good', rejected: 'bad' };
export const MeasStatusPill = ({ s }: { s: MeasurementStatus }) => <Pill tone={TONE[s] || 'neutral'}>{s}</Pill>;

export const whoLabel = (m: Pick<Measurement, 'labourerId' | 'labourerName' | 'labourerCode'>) =>
  m.labourerId ? [m.labourerName || `Labourer #${m.labourerId}`, m.labourerCode].filter(Boolean).join(' · ') : 'Gang (whole team)';

/** "120 sq m × ₹10" or "Lump sum" — what the amount is made of. */
export function QtyRate({ m }: { m: Pick<Measurement, 'isLumpSum' | 'quantity' | 'unit' | 'rate' | 'rateOverridden'> }) {
  if (m.isLumpSum) return <span className="text-fg-muted">{Math.abs(m.quantity) === 1 ? 'Lump sum' : `${qty(m.quantity)} job × ${money(m.rate)}`}</span>;
  return (
    <span className="whitespace-nowrap tabular-nums">
      {qty(m.quantity)} {m.unit} × {money(m.rate)}
      {m.rateOverridden && <span className="ml-1 rounded border border-line px-1 text-[10px] font-semibold uppercase text-fg-muted" title="Rate changed by hand">rate set</span>}
    </span>
  );
}

/** Cancels the browser's file pick when it is not a pdf / jpg / png up to 5 MB. */
export function sheetProblem(file: File | null): string {
  if (!file) return '';
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return 'Choose a PDF, JPG or PNG file';
  if (file.size > 5 * 1024 * 1024) return 'The file is larger than 5 MB';
  return '';
}
