"use client";

import React from "react";
import {
  Type,
  AlignLeft,
  Hash,
  AtSign,
  Phone,
  Calendar,
  Clock,
  CalendarClock,
  Image as ImageIcon,
  File as FileIcon,
  PenTool,
  MapPin,
  ScanLine,
  ToggleLeft,
  Layers,
  Eye,
  Lock,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Save,
  Upload,
  EyeIcon,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Settings,
  GripVertical,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import type { FormField, FieldType, FieldOption, TemplateSnapshot } from "./types";
import { apiClient } from "@/lib/apiClient";

const WIDGET_GROUPS: { title: string; items: { type: FieldType; label: string; icon: React.ReactNode; description: string }[] }[] = [
  {
    title: "Basic Inputs",
    items: [
      { type: "text", label: "Text", icon: <Type size={18} />, description: "Single line text input" },
      { type: "textarea", label: "Text Area", icon: <AlignLeft size={18} />, description: "Multi-line text input" },
      { type: "number", label: "Number", icon: <Hash size={18} />, description: "Numeric input field" },
      { type: "email", label: "Email", icon: <AtSign size={18} />, description: "Email address input" },
      { type: "phone", label: "Phone", icon: <Phone size={18} />, description: "Phone number input" },
    ],
  },
  {
    title: "Date & Time",
    items: [
      { type: "date", label: "Date", icon: <Calendar size={18} />, description: "Date picker" },
      { type: "time", label: "Time", icon: <Clock size={18} />, description: "Time picker" },
      { type: "datetime", label: "Date Time", icon: <CalendarClock size={18} />, description: "Date and time picker" },
    ],
  },
  {
    title: "Selection Fields",
    items: [
      { type: "choice", label: "Single Choice", icon: <Layers size={18} />, description: "Radio buttons" },
      { type: "checkbox", label: "Multiple Choice", icon: <Layers size={18} />, description: "Checkbox group" },
      { type: "select", label: "Dropdown", icon: <Layers size={18} />, description: "Select menu" },
      { type: "toggle", label: "Toggle", icon: <ToggleLeft size={18} />, description: "Yes/No switch" },
    ],
  },
  {
    title: "Media & Files",
    items: [
      { type: "image", label: "Image", icon: <ImageIcon size={18} />, description: "Image upload" },
      { type: "file", label: "File", icon: <FileIcon size={18} />, description: "File upload" },
      { type: "signature", label: "Signature", icon: <PenTool size={18} />, description: "Digital signature" },
    ],
  },
  {
    title: "Advanced",
    items: [
      { type: "gps", label: "Location", icon: <MapPin size={18} />, description: "GPS coordinates" },
      { type: "barcode", label: "Barcode", icon: <ScanLine size={18} />, description: "Barcode/QR scanner" },
      { type: "section", label: "Section", icon: <Layers size={18} />, description: "Group fields" },
      { type: "readonly", label: "Read Only", icon: <Eye size={18} />, description: "Display text" },
    ],
  },
];

const TYPE_ICON: Record<FieldType, React.ReactNode> = {
  text: <Type size={16} />,
  textarea: <AlignLeft size={16} />,
  number: <Hash size={16} />,
  email: <AtSign size={16} />,
  phone: <Phone size={16} />,
  choice: <Layers size={16} />,
  checkbox: <Layers size={16} />,
  select: <Layers size={16} />,
  date: <Calendar size={16} />,
  time: <Clock size={16} />,
  datetime: <CalendarClock size={16} />,
  image: <ImageIcon size={16} />,
  file: <FileIcon size={16} />,
  signature: <PenTool size={16} />,
  gps: <MapPin size={16} />,
  barcode: <ScanLine size={16} />,
  toggle: <ToggleLeft size={16} />,
  section: <Layers size={16} />,
  readonly: <Eye size={16} />,
};

function generateUniqueKey(type: FieldType, existing: FormField[]): string {
  const base = type;
  const used = new Set(existing.map((f) => (f.field_key || "").toString().trim()));
  let i = 1;
  let candidate = `${base}_${i}`;
  while (used.has(candidate)) {
    i += 1;
    candidate = `${base}_${i}`;
  }
  return candidate;
}

function defaultFieldForType(type: FieldType, sequence: number): FormField {
  return {
    id: uuidv4(),
    field_key: `${type}_${sequence}`,
    label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
    field_type: type,
    options: type === "choice" || type === "checkbox" || type === "select"
      ? [
        { value: "opt1", label: "Option 1" },
        { value: "opt2", label: "Option 2" },
      ]
      : undefined,
    metadata: { required: false, autoOptionValues: true, ...(type === 'gps' ? { gpsMode: 'any' } : {}) },
    is_active: true,
    sequence,
    parent_section_id: null,
  };
}

const SYSTEM_KEYS = ["system_gps", "system_time", "system_date", "system_submitted_by"] as const;

function createSystemFields(): FormField[] {
  return [
    {
      id: uuidv4(),
      field_key: "system_gps",
      label: "Location",
      field_type: "gps",
      metadata: { readOnly: true, gpsMode: 'current' },
      is_active: true,
      system: true,
      sequence: 1,
      parent_section_id: null,
    },
    {
      id: uuidv4(),
      field_key: "system_time",
      label: "Time",
      field_type: "time",
      metadata: { readOnly: true },
      is_active: true,
      system: true,
      sequence: 2,
      parent_section_id: null,
    },
    {
      id: uuidv4(),
      field_key: "system_date",
      label: "Date",
      field_type: "date",
      metadata: { readOnly: true },
      is_active: true,
      system: true,
      sequence: 3,
      parent_section_id: null,
    },
    {
      id: uuidv4(),
      field_key: "system_submitted_by",
      label: "Submitted By",
      field_type: "text",
      metadata: { readOnly: true, placeholder: "Auto-filled" },
      is_active: true,
      system: true,
      sequence: 4,
      parent_section_id: null,
    },
  ];
}

function ensureSystemFields(arr: FormField[]): FormField[] {
  const byKey = new Map(arr.map((f) => [String(f.field_key), f]));
  const required = createSystemFields();
  const missing = required.filter((sf) => !byKey.has(sf.field_key));
  const isSystemKey = (k: string | number) => SYSTEM_KEYS.includes(String(k) as any);
  let merged: FormField[];
  if (missing.length === 0) {
    merged = arr.map((f) => {
      if (isSystemKey(String(f.field_key))) {
        return { ...f, system: true, metadata: { ...(f.metadata || {}), readOnly: true } };
      }
      return f;
    });
  } else {
    merged = [...arr, ...required];
  }
  const sorted = merged.slice().sort((a, b) => {
    const aSys = isSystemKey(String(a.field_key)) || !!a.system;
    const bSys = isSystemKey(String(b.field_key)) || !!b.system;
    if (aSys === bSys) return (a.sequence || 0) - (b.sequence || 0);
    return aSys ? 1 : -1;
  });
  return sorted.map((x, i) => ({ ...x, sequence: i + 1 }));
}

function slugifyIdentifier(text: string): string {
  const cleaned = String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "option";
}

function ensureUniqueOptionValues(options: FieldOption[]): FieldOption[] {
  const seen = new Set<string>();
  return options.map((o) => {
    let base = slugifyIdentifier(o.value || o.label || "option");
    let val = base;
    let i = 2;
    while (seen.has(val)) {
      val = `${base}_${i++}`;
    }
    seen.add(val);
    return { ...o, value: val };
  });
}

// Memoized Option Input Row Component
const OptionInputRow = React.memo(({
  field,
  option,
  index,
  onUpdate,
  onRemove,
  totalOptions
}: {
  field: FormField;
  option: FieldOption;
  index: number;
  onUpdate: (options: FieldOption[]) => void;
  onRemove: (index: number) => void;
  totalOptions: number;
}) => {
  const handleLabelChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const current = Array.isArray(field.options) ? field.options : [];
    let next = current.map((o, i) => (i === index ? { ...o, label: e.target.value } : o));

    if (field.metadata?.autoOptionValues !== false) {
      const gen = slugifyIdentifier(e.target.value);
      next = next.map((o, i) => (i === index ? { ...o, value: gen } : o));
      next = ensureUniqueOptionValues(next);
    }
    onUpdate(next);
  }, [field, index, onUpdate]);

  const handleValueChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const current = Array.isArray(field.options) ? field.options : [];
    let next = current.map((o, i) => (i === index ? { ...o, value: slugifyIdentifier(e.target.value) } : o));
    next = ensureUniqueOptionValues(next);
    onUpdate(next);
  }, [field, index, onUpdate]);

  const handleRemove = React.useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
      <GripVertical size={16} className="text-slate-400 flex-shrink-0" />
      <div className="flex-1 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Label</label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Option label"
            value={option.label}
            onChange={handleLabelChange}
          />
        </div>
        {field.metadata?.autoOptionValues === false && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Value</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Option value"
              value={option.value}
              onChange={handleValueChange}
            />
          </div>
        )}
      </div>
      <button
        className="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={handleRemove}
        disabled={totalOptions <= 2}
        title={totalOptions <= 2 ? "Minimum 2 options required" : "Remove option"}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
});

OptionInputRow.displayName = 'OptionInputRow';

export default function FormBuilder({
  templateId,
  templateName = "Untitled Template",
  templateDescription = "",
  onDirtyChange,
  onBack,
}: {
  templateId?: string;
  templateName?: string;
  templateDescription?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onBack?: () => void;
}) {
  const [fields, setFields] = React.useState<FormField[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [toast, setToast] = React.useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showSystemFields, setShowSystemFields] = React.useState(false);
  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [savePublish, setSavePublish] = React.useState(true);
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [nameInput, setNameInput] = React.useState<string>(templateName);
  const [descInput, setDescInput] = React.useState<string>(templateDescription);
  const templateIdNumeric = React.useMemo(() => !!templateId && /^[0-9]+$/.test(String(templateId)), [templateId]);
  const [serverTemplateId, setServerTemplateId] = React.useState<number | null>(templateIdNumeric ? Number(templateId) : null);
  const selectedField = fields.find((f) => f.id === selectedId) || null;

  const duplicateKeys = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of fields) {
      const key = (f.field_key || "").toString().trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return new Set(Array.from(counts.entries()).filter(([, c]) => c > 1).map(([k]) => k));
  }, [fields]);
  const hasDuplicateKeys = duplicateKeys.size > 0;

  const hasOptionTypeWithTooFewOptions = React.useMemo(() => {
    for (const f of fields) {
      if (f.field_type === "choice" || f.field_type === "checkbox" || f.field_type === "select") {
        const opts = Array.isArray(f.options) ? f.options : [];
        if (opts.length < 2) return true;
      }
    }
    return false;
  }, [fields]);

  const hasOptionTypeWithDuplicateValues = React.useMemo(() => {
    for (const f of fields) {
      if (f.field_type === "choice" || f.field_type === "checkbox" || f.field_type === "select") {
        const opts = Array.isArray(f.options) ? f.options : [];
        const values = opts.map((o) => (o.value || "").toString().trim()).filter(Boolean);
        const set = new Set(values);
        if (values.length !== set.size) return true;
      }
    }
    return false;
  }, [fields]);

  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  React.useEffect(() => {
    setFields((prev) => (prev.length === 0 ? ensureSystemFields(prev) : prev));
  }, []);

  React.useEffect(() => {
    if (!templateId) return;
    (async () => {
      if (/^[0-9]+$/.test(String(templateId))) {
        try {
          const res = await apiClient<any>(`/templates/${templateId}`, { method: "GET", withAuth: true });
          const fetchedFields = Array.isArray(res?.fields) ? res.fields : [];
          const normalized: FormField[] = fetchedFields.map((f: any) => {
            const ft = String(f.field_type) as FieldType;
            const parsedMeta = f.metadata ? (typeof f.metadata === 'object' ? f.metadata : (() => { try { return JSON.parse(f.metadata); } catch { return {}; } })()) : {};
            const defaults: any = (() => {
              switch (ft) {
                case 'checkbox': return { minSelection: 0 };
                case 'gps': return { gpsMode: 'any' };
                case 'date':
                case 'time':
                case 'datetime': return { liveOnly: false, captureMode: 'manual' };
                case 'image': return { liveOnly: false, uploadMode: 'any', multiple: false };
                case 'barcode': return { scanTypes: ['barcode', 'qr'] };
                case 'choice':
                case 'select': return { autoOptionValues: parsedMeta?.autoOptionValues !== false };
                default: return {};
              }
            })();
            const finalMeta = { ...defaults, ...parsedMeta, translations: f.translations || undefined, validationRules: f.validation_rules || undefined, visibilityRules: f.visibility_rules || undefined };
            const finalOptions = f.options ? (Array.isArray(f.options) ? f.options : (() => { try { return JSON.parse(f.options); } catch { return []; } })()) : undefined;
            return {
              id: uuidv4(),
              field_key: String(f.field_key),
              label: String(f.label || ""),
              field_type: ft,
              options: finalOptions,
              metadata: finalMeta,
              is_active: f.is_active !== 0,
              sequence: Number(f.sequence || 0),
              parent_section_id: f.parent_section_id || null,
              system: SYSTEM_KEYS.includes(String(f.field_key) as any) ? true : undefined,
            } as FormField;
          });
          setFields(ensureSystemFields(normalized));
          setDirty(false);
          setServerTemplateId(Number(templateId));
          setNameInput(res?.template?.name || templateName);
          setDescInput(res?.template?.description || templateDescription);
        } catch (e: any) {
          // console.warn("Failed to load template from server", e?.message);
        }
      } else {
        try {
          const raw = localStorage.getItem("form_builder_templates") || "[]";
          const list = JSON.parse(raw) as Array<{ id: string; snapshot?: TemplateSnapshot }>;
          const item = list.find((t) => t.id === templateId);
          if (item?.snapshot?.fields) {
            setFields(ensureSystemFields(item.snapshot.fields as FormField[]));
            setDirty(false);
          }
        } catch { }
      }
    })();
  }, [templateId, templateName, templateDescription]);

  const addField = (type: FieldType) => {
    setFields((prev) => {
      const f = defaultFieldForType(type, prev.length + 1);
      f.field_key = generateUniqueKey(type, prev);
      const firstSysIdx = prev.findIndex((x) => SYSTEM_KEYS.includes(String(x.field_key) as any) || x.system);
      const base = [...prev];
      if (firstSysIdx >= 0) base.splice(firstSysIdx, 0, f); else base.push(f);
      const next = ensureSystemFields(base);
      setDirty(true);
      return next;
    });
  };

  const removeField = (id: string) => {
    setFields((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.system) {
        setToast({ type: "error", msg: "System fields cannot be deleted." });
        return prev;
      }
      const next = ensureSystemFields(prev.filter((f) => f.id !== id));
      setDirty(true);
      return next;
    });
    if (selectedId === id) setSelectedId(null);
  };

  const moveField = (id: string, direction: -1 | 1) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      if (prev[idx]?.system) {
        setToast({ type: "error", msg: "System fields cannot be moved." });
        return prev;
      }
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[idx];
      copy[idx] = { ...copy[swapIdx], sequence: tmp.sequence };
      copy[swapIdx] = { ...tmp, sequence: copy[swapIdx].sequence };
      const next = ensureSystemFields(copy);
      setDirty(true);
      return next;
    });
  };

  const updateSelected = React.useCallback((patch: Partial<FormField>) => {
    if (!selectedId) return;
    setFields((prev) => {
      const next = prev.map((f) => (f.id === selectedId ? { ...f, ...patch } : f));
      setDirty(true);
      return next;
    });
  }, [selectedId]);

  const updateFieldOptions = React.useCallback((options: FieldOption[]) => {
    if (!selectedId) return;
    setFields((prev) => {
      const next = prev.map((f) => (f.id === selectedId ? { ...f, options } : f));
      setDirty(true);
      return next;
    });
  }, [selectedId]);

  const addOption = React.useCallback(() => {
    if (!selectedField) return;
    const current = Array.isArray(selectedField.options) ? selectedField.options : [];
    const idx = current.length + 1;
    const baseLabel = `Option ${idx}`;
    const baseValue = slugifyIdentifier(baseLabel);
    const next = ensureUniqueOptionValues([...current, { value: baseValue, label: baseLabel }]);
    updateFieldOptions(next);
  }, [selectedField, updateFieldOptions]);

  const removeOption = React.useCallback((index: number) => {
    if (!selectedField) return;
    const current = Array.isArray(selectedField.options) ? selectedField.options : [];
    if (current.length <= 2) return;
    const next = current.filter((_, i) => i !== index);
    updateFieldOptions(ensureUniqueOptionValues(next));
  }, [selectedField, updateFieldOptions]);

  const saveSnapshot = () => {
    if (hasDuplicateKeys) {
      setToast({ type: "error", msg: "Duplicate field keys found. Please make keys unique before saving." });
      return;
    }
    const snapshot: TemplateSnapshot = { version: 1, name: templateName, fields: ensureSystemFields(fields) };
    try {
      const raw = localStorage.getItem("form_builder_templates") || "[]";
      const list = JSON.parse(raw) as Array<{ id: string; name: string; description?: string; snapshot?: TemplateSnapshot }>;
      let updated = false;
      const next = list.map((t) => {
        if (templateId && t.id === templateId) {
          updated = true;
          return { ...t, name: templateName, description: templateDescription, snapshot };
        }
        return t;
      });
      const finalList = updated
        ? next
        : [
          ...next,
          { id: templateId || Math.random().toString(36).slice(2), name: templateName, description: templateDescription, snapshot },
        ];
      localStorage.setItem("form_builder_templates", JSON.stringify(finalList));
      setDirty(false);
      setToast({ type: "success", msg: "Template saved locally." });
    } catch (err) {
      console.error("Failed saving template", err);
      setToast({ type: "error", msg: "Failed to save template. Please try again." });
    }
  };

  const saveServer = async () => {
    if (hasDuplicateKeys) {
      setToast({ type: "error", msg: "Duplicate field keys found. Please make keys unique before saving." });
      return;
    }
    setSaveError(null);
    setShowSaveModal(true);
  };

  const preview = () => {
    alert("Preview is not enabled. Continue building your template.");
  };

  const canSave = !hasDuplicateKeys && !hasOptionTypeWithTooFewOptions && !hasOptionTypeWithDuplicateValues;

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50">
      {/* Modern Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300"
            onClick={() => {
              if (dirty) {
                setShowConfirm(true);
              } else {
                onBack?.();
              }
            }}
          >
            <ChevronLeft size={18} />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <div className="text-lg font-semibold text-slate-900 truncate max-w-xs" title={templateName}>
              {templateName}
            </div>
            {templateDescription && (
              <div className="text-sm text-slate-500 hidden md:block">— {templateDescription}</div>
            )}
          </div>
          {dirty && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              Unsaved Changes
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
            <EyeIcon size={16} className="text-slate-600" />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showSystemFields}
                onChange={(e) => setShowSystemFields(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              System Fields
            </label>
          </div>

          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
            onClick={preview}
          >
            <EyeIcon size={18} />
            Preview
          </button>

          <button
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${!canSave
              ? "bg-indigo-400 cursor-not-allowed opacity-60 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            onClick={saveSnapshot}
            disabled={!canSave}
          >
            <Save size={18} />
            Save Locally
          </button>

          <button
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${!canSave
              ? "bg-green-400 cursor-not-allowed opacity-60 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            onClick={saveServer}
            disabled={!canSave}
          >
            <Upload size={18} />
            Save to Server
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Widget Library */}
        <aside className="w-80 border-r border-slate-200 bg-white overflow-y-auto">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Widget Library</h2>
            <p className="text-sm text-slate-600">Drag and drop fields to build your form</p>
          </div>

          <div className="p-4 space-y-6">
            {WIDGET_GROUPS.map((group) => (
              <div key={group.title} className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{group.title}</h3>
                <div className="space-y-2">
                  {group.items.map((widget) => (
                    <button
                      key={widget.type}
                      className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                      onClick={() => addField(widget.type)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("widget/type", widget.type);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
                          {widget.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 group-hover:text-blue-700">
                            {widget.label}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {widget.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Form Canvas</h2>
              <div className="text-sm text-slate-500">
                {fields.filter(f => !f.system).length} custom fields
              </div>
            </div>

            {fields.length === 0 && (
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center bg-slate-50">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
                  <Layers size={24} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Start Building Your Form</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                  Drag widgets from the left sidebar or click on them to add fields to your form canvas.
                </p>
                <div className="flex items-center justify-center gap-3 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <GripVertical size={16} />
                    Drag to reorder
                  </div>
                  <div className="w-px h-4 bg-slate-300"></div>
                  <div className="flex items-center gap-1">
                    <Settings size={16} />
                    Click to configure
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {(showSystemFields ? fields : fields.filter((f) => !f.system && !SYSTEM_KEYS.includes(String(f.field_key) as any))).map((field) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  isSelected={selectedId === field.id}
                  onSelect={() => setSelectedId(field.id)}
                  onRemove={() => removeField(field.id)}
                  onMoveUp={() => moveField(field.id, -1)}
                  onMoveDown={() => moveField(field.id, 1)}
                  onUpdate={updateSelected}
                  hasDuplicateKey={duplicateKeys.has(field.field_key)}
                />
              ))}
            </div>

            {!showSystemFields && (
              <div className="mt-6 p-4 bg-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 text-slate-600">
                  <Lock size={16} />
                  <span className="text-sm">System fields are hidden and will be captured automatically</span>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Properties Panel */}
        <aside className="w-96 min-w-96 max-w-96 border-l border-slate-200 bg-white overflow-y-auto">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Field Properties</h2>
            <p className="text-sm text-slate-600">
              {selectedField ? `Configure ${selectedField.label}` : "Select a field to edit its properties"}
            </p>
          </div>

          {!selectedField ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Settings size={24} className="text-slate-400" />
              </div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">No Field Selected</h3>
              <p className="text-sm text-slate-500">Click on any field in the canvas to configure its properties</p>
            </div>
          ) : selectedField.system ? (
            <div className="p-6">
              <div className="p-4 bg-slate-900 rounded-xl text-white">
                <div className="flex items-center gap-3 mb-3">
                  <Lock size={20} />
                  <span className="font-medium">System Field</span>
                </div>
                <p className="text-sm text-slate-300">
                  This field is automatically managed by the system and cannot be edited.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Basic Properties */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Basic Properties</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Field Label</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={selectedField.label}
                    onChange={(e) => updateSelected({ label: e.target.value })}
                    placeholder="Enter field label"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Field Key</label>
                  <input
                    className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:border-transparent transition-all ${duplicateKeys.has(selectedField.field_key)
                      ? "border-red-300 focus:ring-red-500"
                      : "border-slate-300 focus:ring-blue-500"
                      }`}
                    value={selectedField.field_key}
                    onChange={(e) => updateSelected({ field_key: e.target.value })}
                    placeholder="Enter field key"
                  />
                  {duplicateKeys.has(selectedField.field_key) && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                      <XCircle size={16} />
                      Field key must be unique
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={!!selectedField.metadata?.required}
                    onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), required: e.target.checked } })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-700">Required Field</div>
                    <div className="text-xs text-slate-500">User must provide a value for this field</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Placeholder Text</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={selectedField.metadata?.placeholder || ""}
                    onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), placeholder: e.target.value } })}
                    placeholder="Enter placeholder text"
                  />
                </div>
              </div>

              {/* Field Type Specific Settings */}
              {(selectedField.field_type === "choice" || selectedField.field_type === "checkbox" || selectedField.field_type === "select") && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Options</h3>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={selectedField.metadata?.autoOptionValues !== false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const nextMeta = { ...(selectedField.metadata || {}), autoOptionValues: checked };
                            let payload: Partial<FormField> = { metadata: nextMeta };
                            if (checked) {
                              const current = Array.isArray(selectedField.options) ? selectedField.options : [];
                              const recalced = ensureUniqueOptionValues(
                                current.map((o) => ({ ...o, value: slugifyIdentifier(o.label) }))
                              );
                              payload.options = recalced;
                            }
                            updateSelected(payload);
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Auto-generate values
                      </label>
                      <button
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        onClick={addOption}
                      >
                        <Plus size={16} />
                        Add Option
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Array.isArray(selectedField.options) && selectedField.options.map((option, index) => (
                      <OptionInputRow
                        key={`${selectedField.id}-option-${index}`}
                        field={selectedField}
                        option={option}
                        index={index}
                        onUpdate={updateFieldOptions}
                        onRemove={removeOption}
                        totalOptions={selectedField.options?.length || 0}
                      />
                    ))}
                  </div>

                  {hasOptionTypeWithTooFewOptions && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <XCircle size={16} className="text-amber-600" />
                      <span className="text-sm text-amber-700">At least 2 options are required</span>
                    </div>
                  )}

                  {selectedField.field_type === "checkbox" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Minimum selections</label>
                        <input
                          type="number"
                          min={0}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={Number(selectedField.metadata?.minSelection || 0)}
                          onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), minSelection: Math.max(0, Number(e.target.value) || 0) } })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(selectedField.field_type === "date" || selectedField.field_type === "time" || selectedField.field_type === "datetime") && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Capture Settings</h3>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={!!selectedField.metadata?.liveOnly || selectedField.metadata?.captureMode === 'live'}
                      onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), liveOnly: e.target.checked, captureMode: e.target.checked ? 'live' : 'manual' } })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-700">Only Live Capture</div>
                      <div className="text-xs text-slate-500">Users must capture current value; no manual entry</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedField.field_type === "image" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Image Settings</h3>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={!!selectedField.metadata?.liveOnly || selectedField.metadata?.uploadMode === 'camera'}
                      onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), liveOnly: e.target.checked, uploadMode: e.target.checked ? 'camera' : 'any' } })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-700">Only Live Capture</div>
                      <div className="text-xs text-slate-500">Capture via camera only; uploads disabled</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={selectedField.metadata?.multiple === true}
                      onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), multiple: e.target.checked } })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-700">Allow Multiple</div>
                      <div className="text-xs text-slate-500">Permit multiple images to be captured</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedField.field_type === "gps" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Location Settings</h3>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={String(selectedField.metadata?.gpsMode || '').toLowerCase() === 'current'}
                      onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), gpsMode: e.target.checked ? 'current' : 'any' } })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-700">Only Live Capture</div>
                      <div className="text-xs text-slate-500">Capture current GPS location only</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Modals and Toasts */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <XCircle size={20} className="text-amber-600" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">Unsaved Changes</div>
                <div className="text-sm text-slate-600">You have unsaved changes that will be lost</div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => setShowConfirm(false)}
              >
                Keep Editing
              </button>
              <button
                className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                onClick={() => {
                  setShowConfirm(false);
                  setDirty(false);
                  onBack?.();
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="mb-4">
              <div className="text-lg font-semibold text-slate-900">Save Template to Server</div>
              <div className="text-sm text-slate-600">Provide name, description, and choose publish</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Template name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Short description"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={savePublish}
                  onChange={(e) => setSavePublish(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Publish this version
              </label>
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{saveError}</div>
              )}
            </div>
            <div className="mt-5 flex gap-3 justify-end">
              <button
                className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => { if (!saveLoading) setShowSaveModal(false); }}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2.5 rounded-lg text-white ${saveLoading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} transition-colors`}
                onClick={async () => {
                  if (saveLoading) return;
                  try {
                    setSaveLoading(true);
                    setSaveError(null);
                    let tplId = serverTemplateId;
                    if (!tplId) {
                      const created = await apiClient<any>(`/templates`, { method: 'POST', withAuth: true, body: { name: nameInput.trim() || 'Untitled Template', description: descInput || '', type: 'task' } });
                      tplId = Number(created?.id);
                      setServerTemplateId(tplId || null);
                    }

                    // Update template name and description
                    await apiClient(`/templates/${tplId}`, {
                      method: 'PUT',
                      withAuth: true,
                      body: {
                        name: nameInput.trim() || 'Untitled Template',
                        description: descInput.trim() || ''
                      }
                    });

                    const toSave = ensureSystemFields(fields).map((f) => ({
                      field_key: String(f.field_key || ''),
                      label: String(f.label || ''),
                      field_type: f.field_type,
                      options: Array.isArray(f.options) ? f.options : undefined,
                      metadata: f.metadata || {},
                      is_required: !!(f.metadata && (f.metadata as any).required),
                      sequence: Number(f.sequence || 0),
                      parent_section_id: f.parent_section_id || null,
                    }));
                    await apiClient<any>(`/templates/${tplId}/versions`, { method: 'POST', withAuth: true, body: { publish: savePublish, fields: toSave } });
                    setDirty(false);
                    setShowSaveModal(false);
                    setToast({ type: 'success', msg: 'Template saved to server.' });
                  } catch (err: any) {
                    const msg = err?.message || 'Save failed';
                    setSaveError(typeof err?.details === 'string' ? err.details : msg);
                  } finally {
                    setSaveLoading(false);
                  }
                }}
                disabled={saveLoading}
              >
                {saveLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-lg border-l-4 ${toast.type === "success"
          ? "bg-green-50 border-green-500 text-green-800"
          : "bg-red-50 border-red-500 text-red-800"
          }`}>
          <div className="flex items-center gap-3">
            {toast.type === "success" ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <XCircle size={20} className="text-red-500" />
            )}
            <span className="font-medium">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Field Card Component
const FieldCard = React.memo(({
  field,
  isSelected,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdate,
  hasDuplicateKey,
}: {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdate: (patch: Partial<FormField>) => void;
  hasDuplicateKey: boolean;
}) => {
  const [isEditingLabel, setIsEditingLabel] = React.useState(false);
  const labelInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isEditingLabel]);

  const handleLabelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingLabel(false);
  };

  return (
    <div
      className={`group relative p-6 rounded-xl border-2 transition-all duration-200 ${isSelected
        ? "border-blue-500 bg-blue-50 shadow-lg"
        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
        } ${field.system ? "bg-slate-900 text-white border-slate-700" : ""}`}
      onClick={onSelect}
    >
      {/* Field Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={`p-2 rounded-lg ${field.system
            ? "bg-slate-800 text-slate-200"
            : "bg-blue-100 text-blue-600"
            }`}>
            {TYPE_ICON[field.field_type]}
          </div>

          <div className="flex-1 min-w-0">
            {isEditingLabel && !field.system ? (
              <form onSubmit={handleLabelSubmit} className="flex items-center gap-2">
                <input
                  ref={labelInputRef}
                  className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm font-medium bg-white"
                  value={field.label}
                  onChange={(e) => onUpdate({ label: e.target.value })}
                  onBlur={() => setIsEditingLabel(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsEditingLabel(false);
                      e.stopPropagation();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="submit"
                  className="px-2 py-1.5 bg-blue-600 text-white rounded text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  Save
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold truncate cursor-text ${field.system ? "text-white" : "text-slate-900"}`}
                  onDoubleClick={(e) => {
                    if (!field.system) {
                      e.stopPropagation();
                      setIsEditingLabel(true);
                    }
                  }}
                  title="Double-click to edit"
                >
                  {field.label}
                </span>
                {field.system && <Lock size={14} className="text-slate-400" />}
                {!!field.metadata?.required && (
                  <span className="text-red-500 text-sm">*</span>
                )}
              </div>
            )}

            <div className={`text-sm mt-1 ${field.system ? "text-slate-300" : "text-slate-500"}`}>
              <span className="capitalize">{field.field_type}</span>
              {hasDuplicateKey && (
                <span className="ml-2 text-red-500">• Duplicate key</span>
              )}
            </div>
          </div>
        </div>

        {/* Field Actions */}
        {!field.system && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              title="Move up"
            >
              <ArrowUp size={16} />
            </button>
            <button
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              title="Move down"
            >
              <ArrowDown size={16} />
            </button>
            <button
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              title="Delete field"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Field Preview */}
      <div className={`p-4 rounded-lg border ${field.system ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
        }`}>
        <FieldPreview field={field} />
      </div>
    </div>
  );
});

FieldCard.displayName = 'FieldCard';

// Field Preview Component
const FieldPreview = ({ field }: { field: FormField }) => {
  switch (field.field_type) {
    case "text":
      return (
        <input
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          placeholder={field.metadata?.placeholder || "Enter text..."}
          disabled={field.system}
        />
      );
    case "textarea":
      return (
        <textarea
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white resize-none"
          rows={3}
          placeholder={field.metadata?.placeholder || "Enter details..."}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          placeholder="Enter number"
        />
      );
    case "email":
      return (
        <input
          type="email"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          placeholder="email@example.com"
        />
      );
    case "phone":
      return (
        <input
          type="tel"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          placeholder="+1 (555) 000-0000"
        />
      );
    case "choice":
      return (
        <div className="space-y-2">
          {(field.options || []).slice(0, 3).map((option) => (
            <label key={option.value} className="flex items-center gap-3 text-sm">
              <input type="radio" name={`preview-${field.id}`} className="text-blue-600" />
              <span>{option.label}</span>
            </label>
          ))}
          {(field.options || []).length > 3 && (
            <div className="text-xs text-slate-500">+ {(field.options || []).length - 3} more options</div>
          )}
        </div>
      );
    case "checkbox":
      return (
        <div className="space-y-2">
          {(field.options || []).slice(0, 3).map((option) => (
            <label key={option.value} className="flex items-center gap-3 text-sm">
              <input type="checkbox" className="rounded text-blue-600" />
              <span>{option.label}</span>
            </label>
          ))}
          {(field.options || []).length > 3 && (
            <div className="text-xs text-slate-500">+ {(field.options || []).length - 3} more options</div>
          )}
        </div>
      );
    case "select":
      return (
        <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Select an option</option>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "date":
      return (
        <input
          type="date"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          disabled={field.system}
        />
      );
    case "time":
      return (
        <input
          type="time"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          disabled={field.system}
        />
      );
    case "datetime":
      return (
        <input
          type="datetime-local"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        />
      );
    case "toggle":
      return (
        <label className="flex items-center gap-3 text-sm">
          <div className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </div>
          <span>{field.metadata?.toggleOnLabel || "Yes"} / {field.metadata?.toggleOffLabel || "No"}</span>
        </label>
      );
    case "image":
      return (
        <div className="text-center p-4 border-2 border-dashed border-slate-300 rounded-lg bg-white">
          <ImageIcon size={24} className="mx-auto text-slate-400 mb-2" />
          <div className="text-sm text-slate-600">Click to upload image</div>
        </div>
      );
    case "file":
      return (
        <div className="text-center p-4 border-2 border-dashed border-slate-300 rounded-lg bg-white">
          <FileIcon size={24} className="mx-auto text-slate-400 mb-2" />
          <div className="text-sm text-slate-600">Click to upload file</div>
        </div>
      );
    case "gps":
      return (
        <div className="text-center p-4 bg-slate-100 rounded-lg">
          <MapPin size={24} className="mx-auto text-slate-600 mb-2" />
          <div className="text-sm text-slate-700">Get current location</div>
        </div>
      );
    case "barcode":
      return (
        <div className="flex items-center gap-3 p-3 bg-white border border-slate-300 rounded-lg">
          <input
            className="flex-1 text-sm outline-none"
            placeholder="Scan or enter barcode"
          />
          <ScanLine size={18} className="text-slate-400" />
        </div>
      );
    case "section":
      return (
        <div className="text-center p-4 bg-slate-100 rounded-lg border border-slate-300">
          <div className="font-medium text-slate-700">Section Header</div>
          <div className="text-sm text-slate-500 mt-1">Group related fields together</div>
        </div>
      );
    case "readonly":
      return (
        <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
          <div className="text-sm text-slate-700">This is read-only text</div>
        </div>
      );
    default:
      return (
        <div className="text-sm text-slate-500">Preview not available</div>
      );
  }
};
