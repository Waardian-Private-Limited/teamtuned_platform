'use client';

import { useMemo } from 'react';
import type { Errors, FormSchema, Values } from '../../types/dc.types';
import { withCalculated } from '../../utils/schema';
import { FieldList, type RenderEnv } from './FieldRenderer';
import { SystemFields, type SystemValues } from './SystemFields';

/**
 * Renders one form version. Used by the builder preview, the employee fill page and the read-only
 * submission view, and meant to be reused by Task Management's "required data".
 */
export function FormRenderer({ schema, values, onChange, errors = {}, env = {}, system }: { schema: FormSchema; values: Values; onChange: (v: Values) => void; errors?: Errors; env?: RenderEnv; system?: SystemValues }) {
  // Calculated fields follow the answers as they are typed; a saved submission shows what the server stored.
  const shown = useMemo(() => (env.readOnly ? values : withCalculated(schema.fields, values)), [env.readOnly, schema.fields, values]);
  return (
    <>
      {system && <SystemFields values={system} />}
      <FieldList fields={schema.fields} values={shown} onChange={(v) => onChange(withCalculated(schema.fields, v))} errors={errors} env={env} />
    </>
  );
}
export type { RenderEnv, SystemValues };
