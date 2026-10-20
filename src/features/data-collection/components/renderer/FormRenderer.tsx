'use client';

import type { Errors, FormSchema, Values } from '../../types/dc.types';
import { FieldList, type RenderEnv } from './FieldRenderer';
import { SystemFields, type SystemValues } from './SystemFields';

/**
 * Renders one form version. Used by the builder preview, the employee fill page and the read-only
 * submission view, and meant to be reused by Task Management's "required data".
 */
export function FormRenderer({ schema, values, onChange, errors = {}, env = {}, system }: { schema: FormSchema; values: Values; onChange: (v: Values) => void; errors?: Errors; env?: RenderEnv; system?: SystemValues }) {
  return (
    <>
      {system && <SystemFields values={system} />}
      <FieldList fields={schema.fields} values={values} onChange={onChange} errors={errors} env={env} />
    </>
  );
}
export type { RenderEnv, SystemValues };
