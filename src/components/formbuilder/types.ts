export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "choice"
  | "checkbox"
  | "select"
  | "date"
  | "time"
  | "datetime"
  | "image"
  | "file"
  | "signature"
  | "gps"
  | "barcode"
  | "toggle"
  | "section"
  | "readonly";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldMeta {
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
  regex?: string;
  accept?: string; // mime types for file/image
  multiple?: boolean;
  minSelection?: number;
  defaultValue?: string;
  required?: boolean;
  readOnly?: boolean; // render as non-editable in runtime UI
  // Toggle field labels
  toggleOnLabel?: string;
  toggleOffLabel?: string;
  // Options identifiers management (choice/checkbox/select)
  autoOptionValues?: boolean; // when true, auto-generate option.value from label
  // Server-backed extras
  translations?: Record<string, { label: string; options: FieldOption[] }>;
  validationRules?: Array<{ rule_type: string; rule_value: string; error_message?: string | null }>;
  visibilityRules?: Array<{ rule_json: any }>;
  // Live-capture and device restriction metadata
  // When true, restrict input to live capture only (no manual entry/upload)
  liveOnly?: boolean;
  // For image/file fields: enforce capture via device camera when liveOnly; otherwise allow any upload
  uploadMode?: "camera" | "any";
  // For date/time/datetime fields: restrict to current device time when liveOnly; otherwise manual entry
  captureMode?: "live" | "manual";
  // For gps fields: whether to capture current device location or allow any coordinates
  gpsMode?: "current" | "any";
}

export interface FormField {
  id: string; // internal UID
  field_key: string; // unique within template
  label: string;
  field_type: FieldType;
  options?: FieldOption[];
  metadata?: FieldMeta;
  is_active?: boolean;
  system?: boolean; // locked system field (cannot edit/delete)
  sequence: number;
  parent_section_id?: string | null;
}

export interface TemplateSnapshot {
  version: number;
  name: string;
  fields: FormField[];
}
