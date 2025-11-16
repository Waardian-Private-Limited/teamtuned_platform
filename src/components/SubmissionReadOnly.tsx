"use client";

import React from "react";
import { ZoomIn } from "lucide-react";

type Props = {
  data: any;
  approvals: any[];
  expandedGps: Set<string>;
  setExpandedGps: (s: Set<string>) => void;
};

export default function SubmissionReadOnly({ data, approvals, expandedGps, setExpandedGps }: Props) {
  const [previewSrc, setPreviewSrc] = React.useState<string | null>(null);
  const isDataUrl = (s: string) => s?.startsWith('data:image/');
  const decodeBase64 = (s: string) => {
    try {
      const pure = s.includes(',') ? (s.split(',').pop() as string) : s;
      return `data:image/jpeg;base64,${pure}`;
    } catch {
      return '';
    }
  };
  const formatTime12h = (s: string) => {
    try {
      const parts = s.split(':');
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      const dt = new Date(1970, 0, 1, h, m);
      return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).format(dt);
    } catch {
      return s;
    }
  };

  const values: any[] = Array.isArray(data?.values) ? data.values : [];
  const systemFields = values.filter(v => String(v?.field_key || '').startsWith('system_'));
  const regularFields = values.filter(v => {
    const key = String(v?.field_key || '');
    const value = v?.value;
    const isEmpty = value == null || (typeof value === 'string' && value.trim().length === 0) || (Array.isArray(value) && value.length === 0);
    return !key.startsWith('system_') && (!isEmpty || key.startsWith('section_'));
  });
  const combined = [...regularFields, ...systemFields];

  const renderImage = (val: any, isSignature: boolean) => {
    const imgs = Array.isArray(val) ? val.map((e: any) => String(e)) : [String(val ?? '')];
    return (
      <div className={`grid ${isSignature ? 'grid-cols-1' : 'grid-cols-3'} gap-2`}>
        {imgs.map((s, idx) => {
          const src = s.startsWith('http') ? s : (isDataUrl(s) ? s : decodeBase64(s));
          return (
            <div key={idx} className="relative border border-gray-200 rounded-md overflow-hidden">
              <img
                src={src}
                className={`${isSignature ? 'object-contain h-52' : 'object-cover h-52'} w-full`}
                alt="image"
              />
              <button
                type="button"
                onClick={() => setPreviewSrc(src)}
                className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-md bg-white/90 border border-gray-200 hover:bg-white shadow"
                aria-label="Zoom"
              >
                <ZoomIn className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGps = (key: string, val: any) => {
    const s = String(val ?? '');
    const parts = s.split(',');
    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    const expanded = expandedGps.has(key);
    const toggle = () => {
      const next = new Set(expandedGps);
      if (expanded) next.delete(key); else next.add(key);
      setExpandedGps(next);
    };
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <code className="text-xs text-gray-600">{s}</code>
          <button onClick={toggle} className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200">{expanded ? 'Hide Map' : 'Show Map'}</button>
        </div>
        {expanded && Number.isFinite(lat) && Number.isFinite(lon) && (
          <iframe
            title={`map-${key}`}
            className="w-full h-52 rounded-md border border-gray-200"
            src={`https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`}
          />
        )}
        {Number.isFinite(lat) && Number.isFinite(lon) && (
          <a href={`https://www.google.com/maps?q=${lat},${lon}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600">Open in Maps</a>
        )}
      </div>
    );
  };

  const renderDateTime = (val: any, isDate: boolean) => {
    const s = String(val ?? '');
    try {
      if (isDate && s.length >= 10 && s.includes('-')) {
        const dt = new Date(s.length > 10 ? s : `${s}T00:00:00Z`);
        const out = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dt);
        return <span>{out}</span>;
      }
    } catch {}
    return <span>{s}</span>;
  };

  const renderArray = (val: any) => {
    const items = Array.isArray(val) ? val.map((e: any) => String(e)).filter((t: string) => t.length) : [String(val ?? '')];
    return <span>{items.filter(Boolean).join(', ')}</span>;
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        {combined.map((v, idx) => {
          const key = String(v?.field_key || '');
          const label = String(v?.field_label || key);
          const value = v?.value;
          const isImage = Array.isArray(value) ? (value[0] && (String(value[0]).startsWith('http') || String(value[0]).startsWith('data:image/'))) : (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image/')));
          const isSignature = key.includes('signature');
          const isGps = key.includes('gps') || (typeof value === 'string' && value.includes(','));
          const isDate = key.includes('date') && typeof value === 'string';
          const isTime = key.includes('time') && typeof value === 'string';
          const isArray = Array.isArray(value);
          const isSection = key.startsWith('section_');
          return (
            <div key={idx} className="border border-gray-200 rounded-lg p-3">
              {isSection ? (
                <>
                  <div className="text-xs font-semibold text-blue-600 tracking-wide">{label.toUpperCase()}</div>
                  <div className="mt-2 border-t border-gray-200" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">{label}</div>
                    {String(v?.field_key || '').startsWith('system_') && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-200">SYSTEM</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-900">
                    {isImage || isSignature ? renderImage(value, isSignature)
                      : isGps ? renderGps(key, value)
                      : isDate ? renderDateTime(value, true)
                      : isTime ? <span>{formatTime12h(String(value))}</span>
                      : isArray ? renderArray(value)
                      : <span>{String(value ?? '')}</span>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {Array.isArray(approvals) && approvals.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center"><span className="text-blue-600 text-xs">H</span></div>
            <div className="text-sm font-semibold">Approval History</div>
          </div>
          <div className="space-y-2">
            {approvals.map((h, i) => {
              const name = `${String(h?.first_name || '')} ${String(h?.last_name || '')}`.trim();
              const status = String(h?.status || '').toUpperCase();
              const comments = String(h?.comments || '');
              const level = String(h?.level || '');
              const ts = String(h?.action_at || h?.created_at || '');
              const color = status === 'APPROVED' ? 'text-green-700 bg-green-50 border-green-200' : status === 'REJECTED' ? 'text-red-700 bg-red-50 border-red-200' : 'text-yellow-700 bg-yellow-50 border-yellow-200';
              const dt = ts ? new Date(ts) : null;
              const tsFmt = dt ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(dt) : ts;
              return (
                <div key={i} className="border border-gray-200 rounded-md p-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${color}`}>{status}</span>
                    <span className="text-xs text-gray-500">Level {level}</span>
                    <span className="ml-auto text-xs text-gray-500">{tsFmt}</span>
                  </div>
                  {name && <div className="mt-1 text-sm font-medium">{name}</div>}
                  {comments && <div className="mt-1 text-xs text-gray-600">{comments}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {previewSrc && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold">Preview</span>
              <button onClick={() => setPreviewSrc(null)} className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200">Close</button>
            </div>
            <div className="p-4 flex items-center justify-center">
              <img src={previewSrc} style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }} alt="preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
