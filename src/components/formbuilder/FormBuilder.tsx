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
  FileText,
  Box,
  Monitor,
  Copy,
  Layout,
  Sparkles,
  Loader2,
  ListPlus,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import type { FormField, FieldType, FieldOption, TemplateSnapshot } from "./types";
import { apiClient } from "@/lib/apiClient";
import AIBot from "@/components/shared/AIBot";

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
      { type: "reference", label: "Reference Material", icon: <FileText size={18} />, description: "Static file for users to view" },
      { type: "signature", label: "Signature", icon: <PenTool size={18} />, description: "Digital signature" },
    ],
  },
  {
    title: "Advanced & Repeaters",
    items: [
      { type: "gps", label: "Location", icon: <MapPin size={18} />, description: "GPS coordinates" },
      { type: "barcode", label: "Barcode", icon: <ScanLine size={18} />, description: "Barcode/QR scanner" },
      { type: "section", label: "Section", icon: <Layers size={18} />, description: "Group fields visually" },
      { type: "container", label: "Subform Container", icon: <Box size={18} />, description: "Nested group with optional repeat entries" },
      { type: "subform", label: "Dynamic Subform", icon: <Box size={18} />, description: "Group multiple widgets with optional repeat entries" },
      { type: "list", label: "Dynamic List", icon: <ListPlus size={18} />, description: "Dynamic list of single-type items (text, date, image...)" },
      { type: "autocad", label: "AutoCAD Viewer", icon: <Monitor size={18} />, description: "View DWG/DXF files" },
      { type: "pdf_viewer", label: "PDF Viewer", icon: <FileText size={18} />, description: "View PDF files" },
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
  reference: <FileText size={16} />,
  signature: <PenTool size={16} />,
  gps: <MapPin size={16} />,
  barcode: <ScanLine size={16} />,
  toggle: <ToggleLeft size={16} />,
  section: <Layers size={16} />,
  readonly: <Eye size={16} />,
  container: <Box size={16} />,
  subform: <Box size={16} />,
  list: <ListPlus size={16} />,
  autocad: <Monitor size={16} />,
  pdf_viewer: <FileText size={16} />,
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
    metadata: {
      required: false,
      autoOptionValues: true,
      ...(type === 'gps' ? { gpsMode: 'any' } : {}),
      ...(type === 'list' ? { itemType: 'text', itemLabel: 'Item', minItems: 0, maxItems: 20 } : {}),
      ...(type === 'container' || type === 'subform' ? { allowMultiple: false, entryLabel: 'Entry', minEntries: 0, maxEntries: 20 } : {}),
    },
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
  customApiUrl,
  customSaveUrl,
}: {
  templateId?: string;
  templateName?: string;
  templateDescription?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onBack?: () => void;
  customApiUrl?: string;
  customSaveUrl?: string;
}) {
  const [fields, setFields] = React.useState<FormField[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [toast, setToast] = React.useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);
  const [showSystemFields, setShowSystemFields] = React.useState(false);
  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [savePublish, setSavePublish] = React.useState(true);
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const aiFileInputRef = React.useRef<HTMLInputElement>(null);
  const [aiAnalyzing, setAiAnalyzing] = React.useState(false);

  const handleAIUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiAnalyzing(true);
    setToast({ type: "info", msg: "AI is analyzing your document..." });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient<any>("/form-builder/analyze", {
        method: "POST",
        body: formData,
        withAuth: true,
      });

      if (res && res.sections) {
        // Flat logic to extract all fields from analyzed sections
        const extractedFields: FormField[] = [];
        let seq = 1;

        res.sections.forEach((sec: any) => {
          if (sec.type === "section" && sec.fields) {
            // Add section itself if needed, or just flatten?
            // Legacy analyzeDocument returns 'Line X' sections. 
            // We'll flatten them but keep actual named mapping if possible.

            const isLineBlock = /^Line \d+$/.test(sec.section_name?.trim() || "");
            let sectionId: string | null = null;

            if (!isLineBlock) {
              sectionId = uuidv4();
              extractedFields.push({
                id: sectionId,
                field_key: sec.field_key || `section_${seq}`,
                label: sec.section_name || `Section ${seq}`,
                field_type: "section",
                sequence: seq++,
                metadata: {},
                is_active: true,
                parent_section_id: null
              });
            }

            sec.fields.forEach((f: any) => {
              extractedFields.push({
                id: uuidv4(),
                field_key: f.field_key,
                label: f.label || "Untitled Field",
                field_type: f.field_type as FieldType,
                sequence: seq++,
                metadata: f.metadata || {},
                is_active: true,
                parent_section_id: sectionId,
                options: f.options
              });
            });
          }
        });

        if (extractedFields.length > 0) {
          setFields(ensureSystemFields(extractedFields));
          setNameInput(res.form_name || file.name.split(".")[0]);
          setToast({ type: "success", msg: "✅ AI analysis complete! Fields populated." });
          setDirty(true);

          // If the backend returned a templateId, we might want to track it for updates
          if (res.templateId) {
            // This is a bit tricky as customSaveUrl is a prop, not state.
            // For now, we'll assume customSaveUrl is only set initially or via parent.
            // If we need to update it based on AI response, it would need to be state.
            // setCustomSaveUrl(`/form-builder/templates/${res.templateId}`);
          }
        } else {
          setToast({ type: "error", msg: "AI couldn't find any fields in this document." });
        }
      }
    } catch (err: any) {
      console.error("AI Analysis failed", err);
      setToast({ type: "error", msg: `Analysis failed: ${err.message || "Unknown error"}` });
    } finally {
      setAiAnalyzing(false);
      if (aiFileInputRef.current) aiFileInputRef.current.value = "";
    }
  };

  const [nameInput, setNameInput] = React.useState<string>(templateName);
  const [descInput, setDescInput] = React.useState<string>(templateDescription);
  const templateIdNumeric = React.useMemo(() => !!templateId && /^[0-9]+$/.test(String(templateId)), [templateId]);
  const [serverTemplateId, setServerTemplateId] = React.useState<number | null>(templateIdNumeric ? Number(templateId) : null);
  const selectedField = fields.find((f) => f.id === selectedId) || null;
  const [isDragging, setIsDragging] = React.useState(false);

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
          const endpoint = customApiUrl || `/templates/${templateId}`;
          const res = await apiClient<any>(endpoint, { method: "GET", withAuth: true });
          const fetchedFields = Array.isArray(res?.fields) ? res.fields : [];
          const normalized = fetchedFields.map((f: any) => {
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
                case 'reference': return { referenceUrl: '' };
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
              parent_section_id: null, // Will be resolved in second pass
              system: SYSTEM_KEYS.includes(String(f.field_key) as any) ? true : undefined,
              _temp_parent_key: f.parent_field_key || null // Temp prop for mapping
            } as (FormField & { _temp_parent_key?: string | null });
          });

          // Second pass: resolve parent relationships via keys
          const finalFields = normalized.map((f: FormField & { _temp_parent_key?: string | null }) => {
            if (f._temp_parent_key) {
              const parent = normalized.find((p: FormField & { _temp_parent_key?: string | null }) => p.field_key === f._temp_parent_key);
              if (parent) {
                return { ...f, parent_section_id: parent.id };
              }
            }
            return f;
          });

          setFields(ensureSystemFields(finalFields));
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

  const addField = (type: FieldType, parentId: string | null = null) => {
    setFields((prev) => {
      const f = defaultFieldForType(type, prev.length + 1);
      f.field_key = generateUniqueKey(type, prev);
      f.parent_section_id = parentId; // Set parent if provided

      const firstSysIdx = prev.findIndex((x) => SYSTEM_KEYS.includes(String(x.field_key) as any) || x.system);
      const base = [...prev];
      // If adding to root, respect system fields order. If nested, just push? 
      // Actually, sequence logic inside container might need refinement, but append is fine for now.
      if (firstSysIdx >= 0 && !parentId) base.splice(firstSysIdx, 0, f); else base.push(f);

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



  const duplicateField = (id: string, newParentId: string | null = null) => {
    setFields((prev) => {
      const fieldToClone = prev.find((f) => f.id === id);
      if (!fieldToClone) return prev;

      const clone: FormField = {
        ...fieldToClone,
        id: uuidv4(),
        field_key: generateUniqueKey(fieldToClone.field_type, prev),
        label: `${fieldToClone.label} (Copy)`,
        parent_section_id: newParentId ?? fieldToClone.parent_section_id,
        sequence: (fieldToClone.sequence || 0) + 1,
      };

      // If needed, we could recursively clone children for containers, but simple clone for now
      // For a container, we just clone the container. Its children point to OLD ID.
      // So deeper cloning requires re-mapping. 
      // Let's implement deep clone for containers if possible, or just clone empty container.
      // Current: Clone empty container (children not duplicated).

      const idx = prev.findIndex((f) => f.id === id);
      const copy = [...prev];
      copy.splice(idx + 1, 0, clone);

      // Shift downstream
      // Re-normalize sequences is better done globally? 
      // We'll leave it to manual sort or next render sort. 
      // Actually `defaultFieldForType` doesn't enforce strict sequence, just order.

      const next = ensureSystemFields(copy);
      setDirty(true);
      return next;
    });
  };

  const moveField = (id: string, direction: -1 | 1) => {
    setFields((prev) => {
      // Logic for flat list move (only works for siblings?)
      // We need to find siblings in the same parent context.
      // Filter siblings:
      const target = prev.find(f => f.id === id);
      if (!target) return prev;

      const siblings = prev.filter(f => f.parent_section_id === target.parent_section_id && (!f.system || f.system === target.system));
      // Sort siblings by existing order in main array?
      // Since `prev` is source of truth, index in `prev` matters.
      const currentIdx = prev.findIndex(f => f.id === id);
      // Find swap candidate
      // This simple array swap logic might be buggy with hierarchy.
      // Better to swap sequence numbers or position in the filtered list then reconstruct.

      // Let's stick to simple swap in array for now, assuming array order dictates render order.
      // But we must skip items that are NOT siblings?
      // "moveField" is called from FieldCard which is rendered in order.
      // If we move up, we swap with prev sibling.
      const siblingsInOrder = siblings.sort((a, b) => prev.findIndex(x => x.id === a.id) - prev.findIndex(x => x.id === b.id));
      const mySiblingIdx = siblingsInOrder.findIndex(f => f.id === id);
      const swapSibling = siblingsInOrder[mySiblingIdx + direction];

      if (!swapSibling) return prev;

      const swapIdx = prev.findIndex(f => f.id === swapSibling.id);

      const copy = [...prev];
      const tmp = copy[currentIdx];
      copy[currentIdx] = copy[swapIdx];
      copy[swapIdx] = tmp;

      const next = ensureSystemFields(copy);
      setDirty(true);
      return next;
    });
  };

  // Auto-scroll handler ref
  const scrollInterval = React.useRef<NodeJS.Timeout | null>(null);
  const handleAutoScroll = (clientY: number) => {
    const edgeSize = 100;
    const viewportHeight = window.innerHeight;
    const scrollContainer = document.querySelector('main'); // The canvas container
    if (!scrollContainer) return;

    if (scrollInterval.current) clearInterval(scrollInterval.current);

    if (clientY < edgeSize) {
      // Scroll up
      scrollInterval.current = setInterval(() => {
        scrollContainer.scrollBy({ top: -10, behavior: 'auto' });
      }, 20);
    } else if (clientY > viewportHeight - edgeSize) {
      // Scroll down
      scrollInterval.current = setInterval(() => {
        scrollContainer.scrollBy({ top: 10, behavior: 'auto' });
      }, 20);
    } else {
      scrollInterval.current = null;
    }
  };

  const stopAutoScroll = () => {
    if (scrollInterval.current) {
      clearInterval(scrollInterval.current);
      scrollInterval.current = null;
    }
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
    const base = "Option";
    let i = current.length + 1;
    let label = `${base} ${i}`;
    let value = slugifyIdentifier(label);

    // ensure unique
    const existing = new Set(current.map(o => o.value));
    while (existing.has(value)) {
      i++;
      label = `${base} ${i}`;
      value = slugifyIdentifier(label);
    }

    const next = [...current, { label, value }];
    updateFieldOptions(next);
  }, [selectedField, updateFieldOptions]);


  const renderFieldList = React.useCallback((parentId: string | null) => {
    // Filter fields for this parent
    let list = fields.filter((f) => f.parent_section_id === parentId);

    // Sort by sequence
    list = list.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    // Group by section
    const groups: { section?: FormField; items: FormField[] }[] = [];
    let currentGroup: { section?: FormField; items: FormField[] } = { items: [] };

    list.forEach((field) => {
      if (field.field_type === 'section') {
        if (currentGroup.items.length > 0 || currentGroup.section) {
          groups.push(currentGroup);
        }
        currentGroup = { section: field, items: [] };
      } else {
        currentGroup.items.push(field);
      }
    });
    if (currentGroup.items.length > 0 || currentGroup.section) {
      groups.push(currentGroup);
    }

    if (groups.length === 0) return <div className="min-h-[50px]" />;

    return (
      <div className="space-y-6 min-h-[50px]">
        {groups.map((group, gIdx) => {
          const isGrouped = !!group.section;

          return (
            <div
              key={group.section?.id || `group-${gIdx}`}
              className={isGrouped ? "p-4 rounded-xl border border-slate-300 bg-slate-50/50" : ""}
            >
              {group.section && (
                <div className="mb-4">
                  <FieldCard
                    key={group.section.id}
                    field={group.section}
                    isSelected={selectedId === group.section.id}
                    onSelect={() => setSelectedId(group.section!.id)}
                    onRemove={() => removeField(group.section!.id)}
                    onMoveUp={() => moveField(group.section!.id, -1)}
                    onMoveDown={() => moveField(group.section!.id, 1)}
                    onUpdate={updateSelected}
                    hasDuplicateKey={duplicateKeys.has(group.section.field_key)}
                    onDuplicate={(id) => duplicateField(id, parentId)}
                    renderChildren={renderFieldList}
                    onDropInto={(type, pid) => addField(type, pid)}
                  />
                </div>
              )}
              <div className="space-y-4">
                {group.items.map((field) => (
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
                    onDuplicate={(id) => duplicateField(id, parentId)}
                    renderChildren={renderFieldList}
                    onDropInto={(type, pid) => addField(type, pid)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [fields, selectedId, duplicateKeys, removeField, moveField, updateSelected, duplicateField]);



  const removeOption = React.useCallback((index: number) => {
    if (!selectedField) return;
    const current = Array.isArray(selectedField.options) ? selectedField.options : [];
    if (current.length <= 2) return;
    const next = current.filter((_, i) => i !== index);
    updateFieldOptions(ensureUniqueOptionValues(next));
  }, [selectedField, updateFieldOptions]);

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedId || !e.target.files?.length) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("files", file);

    let context = 'templates';
    if (selectedField?.field_type === 'pdf_viewer') {
      context = 'pdf-conversion';
    }

    try {
      setToast({ type: "success", msg: "Uploading file..." });
      const res = await apiClient<{ files: { url: string }[] }>(`/files/org-upload/${context}`, {
        method: "POST",
        body: formData,
        withAuth: true,
      });

      if (res?.files?.[0]?.url) {
        if (selectedField?.field_type === 'autocad' || selectedField?.field_type === 'pdf_viewer') {
          updateSelected({ metadata: { ...(selectedField?.metadata || {}), fileUrl: res.files[0].url } });
        } else {
          updateSelected({ metadata: { ...(selectedField?.metadata || {}), referenceUrl: res.files[0].url } });
        }
        setToast({ type: "success", msg: "File attached successfully." });
      }
    } catch (err) {
      setToast({ type: "error", msg: "Upload failed. Try again." });
    }
  };

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

  const executeSave = async () => {
    if (!nameInput.trim()) {
      setSaveError("Template name is required");
      return;
    }

    setSaveLoading(true);
    setSaveError(null);

    try {
      // Logic to resolve parent_section_id UUIDs to parent_field_key strings
      const idToKeyMap = new Map<string, string>();
      fields.forEach(f => {
        if (f.id && f.field_key) {
          idToKeyMap.set(f.id, String(f.field_key));
        }
      });

      const payloadFields = fields.map(f => {
        let parentFieldKey = null;
        if (f.parent_section_id) {
          parentFieldKey = idToKeyMap.get(f.parent_section_id) || null;
        }
        return {
          ...f,
          parent_field_key: parentFieldKey
        };
      });

      // If this is a high-fidelity analyzed form, save back to fb_templates
      if (customSaveUrl) {
        const res = await apiClient<any>(customSaveUrl, {
          method: "PUT",
          body: { name: nameInput, fields: payloadFields },
          withAuth: true
        });
        if (res && (res.id || res.message === 'Template updated successfully')) {
          setToast({ type: "success", msg: "✅ Template saved! Returning to library..." });
          setDirty(false);
          setShowSaveModal(false);
          // Redirect back to library after brief toast
          setTimeout(() => {
            if (onBack) onBack();
          }, 1200);
        } else {
          throw new Error(res?.message || "Save failed");
        }
      } else {
        // Standard template flow
        const endpoint = serverTemplateId
          ? `/templates/${serverTemplateId}/versions`
          : `/templates`;

        const body = {
          name: nameInput,
          description: descInput,
          fields: payloadFields,
          publish: savePublish,
          type: "data_collection"
        };

        const res = await apiClient<any>(endpoint, {
          method: "POST",
          body: body,
          withAuth: true
        });

        if (res && (res.success || res.id || res.version_id)) {
          setToast({ type: "success", msg: "Template saved successfully" });
          setDirty(false);
          setShowSaveModal(false);
          if (res.template_id && !serverTemplateId) {
            setServerTemplateId(res.template_id);
          }
        } else {
          throw new Error(res?.message || "Save failed");
        }
      }
    } catch (e: any) {
      console.error(e);
      setSaveError(e.message || "Failed to save template");
    } finally {
      setSaveLoading(false);
    }
  };

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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors border shadow-sm ${aiAnalyzing
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              }`}
            onClick={() => aiFileInputRef.current?.click()}
            disabled={aiAnalyzing}
          >
            {aiAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {aiAnalyzing ? "Analyzing..." : "AI Generate"}
          </button>

          <input
            type="file"
            ref={aiFileInputRef}
            className="hidden"
            accept=".xlsx,.xls,.pdf,image/*"
            onChange={handleAIUpload}
          />

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

        {/* AI Assistant */}
        <AIBot />

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
              <div className="space-y-4">
                {showSystemFields ? (
                  fields.filter(f => f.system).map(f => (
                    <FieldCard
                      key={f.id}
                      field={f}
                      isSelected={selectedId === f.id}
                      onSelect={() => setSelectedId(f.id)}
                      onRemove={() => removeField(f.id)}
                      onMoveUp={() => { }}
                      onMoveDown={() => { }}
                      onUpdate={updateSelected}
                      hasDuplicateKey={duplicateKeys.has(f.field_key)}
                    />
                  ))
                ) : null}
                {/* Only render root fields (parent_section_id === null) via the helper */}
                {renderFieldList(null)}
              </div>
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
                  <textarea
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    rows={3}
                    value={selectedField.metadata?.placeholder || ""}
                    onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), placeholder: e.target.value } })}
                    placeholder="Enter placeholder text"
                  />
                </div>

                {/* Dual-Phase Execution Logic */}
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Layout size={14} className="text-blue-600" />
                    Execution Phase
                  </h3>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    Tag this field for Plan vs Actual tracking.
                  </p>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                    value={selectedField.metadata?.executionPhase || "none"}
                    onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), executionPhase: e.target.value as "none" | "plan" | "actual" } })}
                  >
                    <option value="none">Standard Field (Always Editable)</option>
                    <option value="plan">Plan / Target (Filled at Start of Month)</option>
                    <option value="actual">Actual / Daily (Filled by Employees)</option>
                  </select>
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

              {selectedField.field_type === "list" && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Dynamic List Settings</h3>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Child Item Data Type</label>
                    <select
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={selectedField.metadata?.itemType || "text"}
                      onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), itemType: e.target.value as FieldType } })}
                    >
                      <option value="text">Text (Single Line)</option>
                      <option value="textarea">Text Area (Multi Line)</option>
                      <option value="number">Number</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="date">Date</option>
                      <option value="time">Time</option>
                      <option value="datetime">Date & Time</option>
                      <option value="select">Dropdown Select</option>
                      <option value="choice">Single Choice Radio</option>
                      <option value="toggle">Toggle (Yes/No)</option>
                      <option value="image">Image Picker</option>
                      <option value="file">File Picker</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">The data type collected for each item added by the user.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Item Label / Placeholder</label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Task Completed, Client Email, Event Time..."
                      value={selectedField.metadata?.itemLabel || "Item"}
                      onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), itemLabel: e.target.value } })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Min Items</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={Number(selectedField.metadata?.minItems || 0)}
                        onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), minItems: Math.max(0, Number(e.target.value) || 0) } })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Max Items</label>
                      <input
                        type="number"
                        min={1}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={Number(selectedField.metadata?.maxItems || 20)}
                        onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), maxItems: Math.max(1, Number(e.target.value) || 20) } })}
                      />
                    </div>
                  </div>

                  {(selectedField.metadata?.itemType === "select" || selectedField.metadata?.itemType === "choice") && (
                    <div className="pt-2 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Item Dropdown Options</span>
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          onClick={() => {
                            const current = selectedField.metadata?.itemOptions || [
                              { value: "opt1", label: "Option 1" },
                              { value: "opt2", label: "Option 2" }
                            ];
                            const updated = [...current, { value: `opt${current.length + 1}`, label: `Option ${current.length + 1}` }];
                            updateSelected({ metadata: { ...(selectedField.metadata || {}), itemOptions: updated } });
                          }}
                        >
                          + Add Option
                        </button>
                      </div>
                      {(selectedField.metadata?.itemOptions || [
                        { value: "opt1", label: "Option 1" },
                        { value: "opt2", label: "Option 2" }
                      ]).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs"
                            value={opt.label}
                            onChange={(e) => {
                              const current = [...(selectedField.metadata?.itemOptions || [
                                { value: "opt1", label: "Option 1" },
                                { value: "opt2", label: "Option 2" }
                              ])];
                              current[idx] = { value: e.target.value.toLowerCase().replace(/\s+/g, '_'), label: e.target.value };
                              updateSelected({ metadata: { ...(selectedField.metadata || {}), itemOptions: current } });
                            }}
                          />
                          <button
                            type="button"
                            className="text-slate-400 hover:text-red-500"
                            onClick={() => {
                              const current = (selectedField.metadata?.itemOptions || []).filter((_, i) => i !== idx);
                              updateSelected({ metadata: { ...(selectedField.metadata || {}), itemOptions: current } });
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(selectedField.field_type === "subform" || selectedField.field_type === "container") && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Subform Settings</h3>

                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <input
                      type="checkbox"
                      id="allowMultipleSubform"
                      checked={selectedField.metadata?.allowMultiple === true}
                      onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), allowMultiple: e.target.checked } })}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <label htmlFor="allowMultipleSubform" className="cursor-pointer">
                      <div className="text-sm font-medium text-slate-900">Allow Multiple Entries (Repeater Subform)</div>
                      <div className="text-xs text-slate-600 mt-0.5">Enables dynamic "+ Add Entry" button in app so users can add multiple subform records.</div>
                    </label>
                  </div>

                  {selectedField.metadata?.allowMultiple && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Entry Label</label>
                        <input
                          type="text"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="e.g. Task Record, Event Entry..."
                          value={selectedField.metadata?.entryLabel || "Entry"}
                          onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), entryLabel: e.target.value } })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Min Entries</label>
                          <input
                            type="number"
                            min={0}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            value={Number(selectedField.metadata?.minEntries || 0)}
                            onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), minEntries: Math.max(0, Number(e.target.value) || 0) } })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Max Entries</label>
                          <input
                            type="number"
                            min={1}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            value={Number(selectedField.metadata?.maxEntries || 20)}
                            onChange={(e) => updateSelected({ metadata: { ...(selectedField.metadata || {}), maxEntries: Math.max(1, Number(e.target.value) || 20) } })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedField?.field_type === "reference" && (
            <div className="space-y-4 p-6 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Reference Settings</h3>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="mb-3">
                  <div className="text-sm font-medium text-slate-700 mb-1">Attached File</div>
                  {selectedField.metadata?.referenceUrl ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded border border-green-200">
                      <CheckCircle size={16} />
                      <span className="truncate flex-1">{selectedField.metadata.referenceUrl.split('/').pop()}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 italic">No file attached</div>
                  )}
                </div>
                <div
                  className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
                    }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleReferenceUpload({ target: { files: e.dataTransfer.files } } as any);
                    }
                  }}
                >
                  <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                  <label className="block cursor-pointer">
                    <span className="sr-only">Choose file</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleReferenceUpload}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg"
                    />
                    <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">Click to upload</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
                  <p className="text-xs text-slate-400 mt-2">PDF, Images, Docs</p>
                </div>
              </div>
            </div>
          )}

          {selectedField?.field_type === "autocad" && (
            <div className="space-y-4 p-6 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">AutoCAD Settings</h3>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="mb-3">
                  <div className="text-sm font-medium text-slate-700 mb-1">Attached DWG/DXF</div>
                  {selectedField.metadata?.fileUrl ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded border border-green-200">
                      <CheckCircle size={16} />
                      <span className="truncate flex-1">{selectedField.metadata.fileUrl.split('/').pop()}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 italic">No file attached</div>
                  )}
                </div>
                <div
                  className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
                    }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleReferenceUpload({ target: { files: e.dataTransfer.files } } as any);
                    }
                  }}
                >
                  <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                  <label className="block cursor-pointer">
                    <span className="sr-only">Choose file</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleReferenceUpload}
                      accept=".dwg,.dxf"
                    />
                    <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">Click to upload</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
                  <p className="text-xs text-slate-400 mt-2">DWG, DXF</p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div >

      {selectedField?.field_type === "pdf_viewer" && (
        <div className="space-y-4 p-6 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">PDF Viewer Settings</h3>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="mb-3">
              <div className="text-sm font-medium text-slate-700 mb-1">Attached Document</div>
              {selectedField.metadata?.fileUrl ? (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded border border-green-200">
                  <CheckCircle size={16} />
                  <span className="truncate flex-1">{selectedField.metadata.fileUrl.split('/').pop()}</span>
                </div>
              ) : (
                <div className="text-sm text-slate-500 italic">No file attached</div>
              )}
            </div>
            <div
              className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
                }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleReferenceUpload({ target: { files: e.dataTransfer.files } } as any);
                }
              }}
            >
              <Upload size={24} className="mx-auto text-slate-400 mb-2" />
              <label className="block cursor-pointer">
                <span className="sr-only">Choose file</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleReferenceUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.dwg,.dxf"
                />
                <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">Click to upload</span>
              </label>
              <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
              <p className="text-xs text-slate-400 mt-2">PDF, Images, Docs, CAD</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals and Toasts */}
      {
        showConfirm && (
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
        )
      }

      {
        showSaveModal && (
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
                  onClick={executeSave}
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        toast && (
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
        )
      }
    </div >
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
  onDuplicate,
  renderChildren,
  onDropInto,
}: {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdate: (patch: Partial<FormField>) => void;
  hasDuplicateKey: boolean;
  onDuplicate?: (id: string) => void;
  renderChildren?: (parentId: string | null) => React.ReactNode;
  onDropInto?: (type: FieldType, parentId: string) => void;
}) => {
  const [isEditingLabel, setIsEditingLabel] = React.useState(false);
  const labelInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

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
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
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
              onClick={(e) => { e.stopPropagation(); onDuplicate?.(field.id); }}
              title="Duplicate"
            >
              <Copy size={16} />
            </button>
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
        {(field.field_type === 'container' || field.field_type === 'subform') ? (
          <div
            className={`min-h-[100px] border-2 rounded-xl relative p-6 transition-all ${isDragOver ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100' : 'border-slate-300 bg-slate-50'}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              const type = e.dataTransfer.getData("widget/type") as FieldType;
              if (type && onDropInto) {
                onDropInto(type, field.id);
              }
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Box size={14} className="text-blue-500" />
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                  Subform Drop Zone
                </span>
              </div>
              {field.metadata?.allowMultiple && (
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Layers size={10} /> Multi-Entry Repeater Enabled
                </span>
              )}
            </div>
            <div className="mt-2">
              {renderChildren ? renderChildren(field.id) : <div className="text-sm text-slate-400 text-center py-4">Drag and drop fields here to add to subform</div>}
            </div>
            {field.metadata?.allowMultiple && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Users can submit multiple records in app</span>
                <button
                  type="button"
                  disabled
                  className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-default hover:bg-blue-700 transition-all"
                >
                  <Plus size={14} /> Add {field.metadata?.entryLabel || 'Entry'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <FieldPreview field={field} />
        )}
      </div>
    </div>
  );
});

FieldCard.displayName = 'FieldCard';

// Field Preview Component
const FieldPreview = ({ field }: { field: FormField }) => {
  switch (field.field_type) {
    case "list":
      return (
        <div className="space-y-3 p-3 bg-white border border-slate-300 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
            <span className="font-semibold uppercase tracking-wider text-slate-700">Dynamic List ({field.metadata?.itemType || 'text'})</span>
            <span className="text-slate-400">Min: {field.metadata?.minItems || 0} | Max: {field.metadata?.maxItems || 20}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-slate-50 text-slate-600"
                placeholder={`${field.metadata?.itemLabel || 'Item'} #1`}
                disabled
              />
              <button disabled className="text-slate-300 p-1"><Trash2 size={16} /></button>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-slate-50 text-slate-600"
                placeholder={`${field.metadata?.itemLabel || 'Item'} #2`}
                disabled
              />
              <button disabled className="text-slate-300 p-1"><Trash2 size={16} /></button>
            </div>
          </div>
          <button disabled className="w-full py-1.5 px-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1">
            <Plus size={14} /> Add {field.metadata?.itemLabel || 'Item'}
          </button>
        </div>
      );
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
    case "reference":
      return (
        <div className="text-center p-4 border border-slate-200 rounded-lg bg-slate-50">
          <FileText size={24} className="mx-auto text-blue-600 mb-2" />
          <div className="font-medium text-slate-700">Reference Material</div>
          <div className="text-sm text-slate-500">
            {field.metadata?.referenceUrl ? "File attached (Ready)" : "No file attached yet"}
          </div>
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
    case "autocad":
      return (
        <div className="text-center p-4 bg-slate-900 rounded-lg border border-slate-700">
          <Monitor size={24} className="mx-auto text-blue-400 mb-2" />
          <div className="font-medium text-slate-200">AutoCAD Viewer</div>
          <div className="text-sm text-slate-400 group-hover:text-slate-300">
            {field.metadata?.fileUrl ? "File linked" : "No file linked"}
          </div>
        </div>
      );
    default:
      return (
        <div className="text-sm text-slate-500">Preview not available</div>
      );
  }
};
