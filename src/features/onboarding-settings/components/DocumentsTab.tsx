'use client';

import React from 'react';
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Section } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import type { OnboardingAcceptType, OnboardingDocumentDto, OnboardingNumberPattern } from '../types/onboarding-settings.dto';
import { moveItem, withOrders } from '../utils/reorder';
import { DocumentDialog } from './DocumentDialog';

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

export function DocumentsTab({
  documents,
  onChange,
  numberPatterns,
  acceptTypes,
}: {
  documents: OnboardingDocumentDto[];
  onChange: (documents: OnboardingDocumentDto[]) => void;
  numberPatterns: OnboardingNumberPattern[];
  acceptTypes: OnboardingAcceptType[];
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const update = (index: number, patch: Partial<OnboardingDocumentDto>) => {
    const next = documents.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const move = (index: number, direction: -1 | 1) => onChange(withOrders(moveItem(documents, index, direction)));
  const remove = (index: number) => onChange(withOrders(documents.filter((_, i) => i !== index)));
  const add = (doc: OnboardingDocumentDto) => {
    onChange(withOrders([...documents, doc]));
    setDialogOpen(false);
  };

  return (
    <Section title="Documents" description="What the employee is asked to upload, and whether a number is required.">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-line text-xs font-semibold text-fg-muted">
            <th className="pb-2 font-semibold">Document</th>
            <th className="w-24 pb-2 text-center font-semibold">Visible</th>
            <th className="w-24 pb-2 text-center font-semibold">Mandatory</th>
            <th className="w-20 pb-2 text-right font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, index) => (
            <tr key={doc.key} className="border-b border-line last:border-0">
              <td className="py-2.5 pr-3">
                <p className="text-sm font-medium text-fg">{doc.label}</p>
                <p className="text-xs text-fg-muted">
                  {doc.numberRequired ? 'Number required' : 'No number'} · {doc.sides === 2 ? 'Front & back' : 'Single side'} · {doc.accept.join('/').toUpperCase()}
                </p>
              </td>
              <td className="w-24 py-2.5 text-center">
                <Switch checked={doc.visible} onChange={(v) => update(index, { visible: v, required: v ? doc.required : false })} label={`${doc.label} visible`} />
              </td>
              <td className="w-24 py-2.5 text-center">
                <Switch checked={doc.required} onChange={(v) => update(index, { required: v })} label={`${doc.label} mandatory`} disabled={!doc.visible} />
              </td>
              <td className="w-20 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  <IconButton label="Move up" onClick={() => move(index, -1)} disabled={index === 0}><ChevronUp className="h-3.5 w-3.5" /></IconButton>
                  <IconButton label="Move down" onClick={() => move(index, 1)} disabled={index === documents.length - 1}><ChevronDown className="h-3.5 w-3.5" /></IconButton>
                  {!doc.system && <IconButton label="Remove document" onClick={() => remove(index)}><Trash2 className="h-3.5 w-3.5" /></IconButton>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--tt-primary)] hover:underline"
      >
        <Plus className="h-3.5 w-3.5" /> Add document type
      </button>

      <DocumentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={add}
        numberPatterns={numberPatterns}
        acceptTypes={acceptTypes}
        existingKeys={documents.map((d) => d.key)}
      />
    </Section>
  );
}
