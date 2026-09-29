'use client';

import React from 'react';
import { groupMeta, isArrayFieldNode, isCapNode, isFieldNode, isVisible, labelOf, optionLabel, sectionEntries, type CapValue, type SchemaNode, type SectionNode } from './schemaTypes';

/**
 * Read-only rendering of a policy config against the schema — the same
 * field labels the editable form shows, without any controls. Used where a
 * config is looked at rather than edited: a published version's snapshot in
 * version history, and the create wizard's review step.
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(value)) return optionLabel(value);
  if (Array.isArray(value)) return value.length ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : formatValue(v))).join(', ') : 'None';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function LeafRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/50 py-1.5 last:border-b-0">
      <span className="text-[11px] text-fg-muted sm:text-xs">{label}</span>
      <span className="truncate text-right text-[11px] font-semibold text-fg sm:text-xs">{formatValue(value)}</span>
    </div>
  );
}

function SummaryNode({ node, value, label, depth, scopeValue }: { node: SchemaNode; value: unknown; label?: string; depth: number; scopeValue: unknown }) {
  if (isArrayFieldNode(node)) {
    const items = Array.isArray(value) ? value : [];
    if (!items.length) return <LeafRow label={label || ''} value="None" />;
    const itemIsScalar = isFieldNode(node.item) && node.item.type !== 'array';
    if (itemIsScalar) return <LeafRow label={label || ''} value={items} />;
    return (
      <div className="mt-2">
        {label && <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{label}</div>}
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border border-line bg-bg-subtle p-2.5">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">Rule {i + 1}</div>
              <SummaryNode node={node.item} value={item} depth={depth + 1} scopeValue={item} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isFieldNode(node)) return <LeafRow label={label || ''} value={value} />;

  if (isCapNode(node)) {
    const cap = (value || {}) as Partial<CapValue>;
    const unit = groupMeta(node)?.unit;
    return <LeafRow label={label || ''} value={cap.enabled ? `${cap.value}${unit ? ` ${unit}` : ''}` : 'No limit'} />;
  }

  const meta = groupMeta(node as SectionNode);
  const entries = sectionEntries(node as SectionNode).filter(([, child]) => isVisible(child, scopeValue));
  const isLeaf = (child: SchemaNode) => (isFieldNode(child) && child.type !== 'array') || isCapNode(child);
  const leaves = entries.filter(([, child]) => isLeaf(child));
  const branches = entries.filter(([, child]) => !isLeaf(child));
  const val = (value || {}) as Record<string, unknown>;
  const heading = meta?.label || label;

  const body = (
    <>
      {leaves.length > 0 && (
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {leaves.map(([key, child]) => (
            <SummaryNode key={key} node={child} value={val[key]} label={labelOf(child, key)} depth={depth + 1} scopeValue={scopeValue} />
          ))}
        </div>
      )}
      {branches.map(([key, child]) => (
        <SummaryNode key={key} node={child} value={val[key]} label={labelOf(child, key)} depth={depth + 1} scopeValue={scopeValue} />
      ))}
    </>
  );

  if (!heading) return <div className="flex flex-col gap-2">{body}</div>;

  return (
    <div className="mt-2 rounded-lg border border-line p-2.5">
      <div className="mb-1 text-[11px] font-semibold text-fg sm:text-xs">{heading}</div>
      {body}
    </div>
  );
}

export function ConfigSummary({ schema, config }: { schema: SectionNode; config: unknown }) {
  return <SummaryNode node={schema} value={config} depth={0} scopeValue={config} />;
}
