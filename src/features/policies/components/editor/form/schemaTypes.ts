// Mirrors the shape backend/src/modules/policies/domain/schemas/fieldKit.js's
// describe() emits — a tree whose leaves are field descriptors and whose
// branches are sections. A section may carry its own presentation under the
// reserved `__meta` key (fieldKit's `group`): the human label and the
// one-line description the form renders as a card header.
//
// One source of truth: a new rule in the backend schema shows up here as a
// new field, with its label, help text and visibility condition, and no
// frontend change at all.

export interface VisibleWhen {
  /** Dotted path, resolved against the section (or the list item) root. */
  path: string;
  in: Array<string | number | boolean>;
}

export interface ScalarFieldNode {
  type: 'number' | 'int' | 'bool' | 'string' | 'time' | 'enum' | 'idList';
  default: unknown;
  min?: number;
  max?: number;
  maxLength?: number;
  values?: string[];
  label?: string;
  help?: string;
  description?: string;
  visibleWhen?: VisibleWhen;
}

export interface ArrayFieldNode {
  type: 'array';
  default: unknown[];
  item: SchemaNode;
  label?: string;
  help?: string;
  visibleWhen?: VisibleWhen;
}

export type FieldNode = ScalarFieldNode | ArrayFieldNode;

export interface GroupMeta {
  label: string;
  description?: string;
  visibleWhen?: VisibleWhen;
}

export interface SectionNode {
  __meta?: GroupMeta;
  [key: string]: SchemaNode | GroupMeta | undefined;
}

export type SchemaNode = FieldNode | SectionNode;

export const META_KEY = '__meta';

const FIELD_TYPES = new Set(['number', 'int', 'bool', 'string', 'time', 'enum', 'idList', 'array']);

export function isFieldNode(node: unknown): node is FieldNode {
  return typeof node === 'object' && node !== null && 'type' in node && typeof (node as { type: unknown }).type === 'string' && FIELD_TYPES.has((node as { type: string }).type);
}

export function isArrayFieldNode(node: unknown): node is ArrayFieldNode {
  return isFieldNode(node) && node.type === 'array';
}

export function groupMeta(node: SchemaNode): GroupMeta | undefined {
  if (isFieldNode(node)) return undefined;
  return (node as SectionNode).__meta;
}

/** A section's real entries — everything except its own presentation meta. */
export function sectionEntries(node: SectionNode): Array<[string, SchemaNode]> {
  return Object.entries(node).filter(([key]) => key !== META_KEY) as Array<[string, SchemaNode]>;
}

export function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** The label a field or section shows: its own, else a humanized key. */
export function labelOf(node: SchemaNode, key: string): string {
  const meta = groupMeta(node);
  if (meta?.label) return meta.label;
  if (isFieldNode(node) && node.label) return node.label;
  return humanize(key);
}

/**
 * Enum values are stored as snake_case codes; this is what an admin reads
 * in the dropdown. "worked_percent" is nobody's idea of a choice.
 */
export function optionLabel(value: string): string {
  return value
    .split('_')
    .map((word, i) => (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function valueAtPath(scope: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc == null ? undefined : (acc as Record<string, unknown>)[key]), scope);
}

/**
 * Whether a field applies given the rest of its section. A rule that cannot
 * take effect — grace minutes when marks are off, a multiplier when the pay
 * rate is a flat amount — is hidden rather than shown greyed out, so the
 * card only ever states rules that are actually in force.
 */
export function isVisible(node: SchemaNode, scopeValue: unknown): boolean {
  let condition: VisibleWhen | undefined;
  if (isFieldNode(node)) {
    condition = node.visibleWhen;
  } else {
    const meta = groupMeta(node);
    condition = meta?.visibleWhen;
  }
  if (!condition) return true;
  const actual = valueAtPath(scopeValue, condition.path);
  return condition.in.some((candidate) => candidate === actual);
}
