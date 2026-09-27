// Client-side mirror of the backend's walkDefaults (fieldKit.js): builds a
// full config object from the schema's describe() tree.
//
// The backend fills defaults for anything a caller omits, so this is not
// what makes a config valid — it is what lets the create wizard SHOW the
// admin the value a rule will start at instead of an empty control, and
// what the review step diffs against to list "what you changed".

import { isArrayFieldNode, isFieldNode, sectionEntries, type SchemaNode, type SectionNode } from './schemaTypes';

export function defaultsFor(node: SchemaNode): unknown {
  if (isArrayFieldNode(node)) return Array.isArray(node.default) ? [...node.default] : [];
  if (isFieldNode(node)) return node.default;
  const out: Record<string, unknown> = {};
  for (const [key, child] of sectionEntries(node as SectionNode)) out[key] = defaultsFor(child);
  return out;
}

export function sectionDefaults(node: SectionNode): Record<string, unknown> {
  return defaultsFor(node) as Record<string, unknown>;
}

export interface ConfigChange {
  path: string[];
  label: string;
  from: unknown;
  to: unknown;
}

/**
 * Every leaf where `value` differs from `base`, as a flat list. Used by the
 * create wizard's review step so an admin confirms the handful of rules
 * they actually touched rather than every field of a policy config.
 */
export function diffConfig(base: unknown, value: unknown, path: string[] = []): ConfigChange[] {
  if (Array.isArray(base) || Array.isArray(value)) {
    const same = JSON.stringify(base ?? []) === JSON.stringify(value ?? []);
    return same ? [] : [{ path, label: path.join(' › '), from: base, to: value }];
  }
  if (isPlainObject(base) && isPlainObject(value)) {
    const keys = new Set([...Object.keys(base), ...Object.keys(value)]);
    return [...keys].flatMap((key) => diffConfig(base[key], value[key], [...path, key]));
  }
  if (base === value) return [];
  return [{ path, label: path.join(' › '), from: base, to: value }];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
