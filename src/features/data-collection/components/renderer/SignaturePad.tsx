'use client';

import { useEffect, useRef, useState } from 'react';
import { Btn } from '../shared/Ui';

/** Draw a signature with mouse, pen or finger; "Use signature" hands back a PNG. */
export function SignaturePad({ onDone, disabled }: { onDone: (png: Blob) => void; disabled?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    const ctx = c.getContext('2d');
    if (ctx) { ctx.scale(ratio, ratio); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#000'; }
  }, []);

  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const down = (e: React.PointerEvent) => { drawing.current = true; ref.current!.setPointerCapture(e.pointerId); const ctx = ref.current!.getContext('2d')!; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const ctx = ref.current!.getContext('2d')!; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setDirty(true); };
  const up = () => { drawing.current = false; };
  const clear = () => { const c = ref.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setDirty(false); };

  return (
    <div className="space-y-2">
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} className="h-32 w-full touch-none rounded-lg border border-dashed border-line-strong bg-white" aria-label="Signature area" />
      <div className="flex gap-2">
        <Btn onClick={clear} disabled={!dirty || disabled}>Clear</Btn>
        <Btn variant="primary" disabled={!dirty || disabled} onClick={() => ref.current!.toBlob((b) => b && onDone(b), 'image/png')}>Use signature</Btn>
      </div>
    </div>
  );
}
