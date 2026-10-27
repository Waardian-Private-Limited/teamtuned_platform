'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, RotateCcw, Video } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FACE_POSES, FACE_POSE_COPY, type FacePose } from '../../../constants/labour.constants';
import { primaryBtn, secondaryBtn } from '../../shared/Primitives';

export type Shots = Record<FacePose, File | null>;
export const EMPTY_SHOTS: Shots = { center: null, left: null, right: null };

function useObjectUrls(shots: Shots) {
  const urls = useMemo(() => {
    const out = {} as Record<FacePose, string | null>;
    FACE_POSES.forEach((p) => { out[p] = shots[p] ? URL.createObjectURL(shots[p] as File) : null; });
    return out;
  }, [shots]);
  useEffect(() => () => { Object.values(urls).forEach((u) => u && URL.revokeObjectURL(u)); }, [urls]);
  return urls;
}

function grabFrame(video: HTMLVideoElement, pose: FacePose): Promise<File | null> {
  const max = 1280;
  const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ? new File([b], `${pose}.jpg`, { type: 'image/jpeg' }) : null), 'image/jpeg', 0.92));
}

interface Props {
  shots: Shots;
  onChange: (pose: FacePose, file: File | null) => void;
  /** Server rejection reason per pose (red border + message under the photo). */
  issues: Partial<Record<FacePose, string>>;
}

/** Three-pose face capture: webcam via getUserMedia with on-screen guidance, or file upload. */
export function FaceCapture({ shots, onChange, issues }: Props) {
  const urls = useObjectUrls(shots);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState<FacePose>('center');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);
  useEffect(() => stop, [stop]);

  const start = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser cannot open the camera. Upload photos instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError('The camera is blocked or not available. Allow camera access in the browser, or upload photos instead.');
    }
  };

  const nextEmpty = (from: FacePose, file: File) => FACE_POSES.find((p) => p !== from && !shots[p]) ?? from;
  const snap = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const f = await grabFrame(v, active);
    if (!f) return;
    onChange(active, f);
    setActive(nextEmpty(active, f));
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    onChange(active, f);
    setActive(nextEmpty(active, f));
  };

  const copy = FACE_POSE_COPY[active];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {FACE_POSES.map((p) => {
          const issue = issues[p];
          const isActive = active === p;
          return (
            <div key={p} className="min-w-0">
              <button
                type="button"
                onClick={() => setActive(p)}
                aria-pressed={isActive}
                className={cx(
                  'relative flex aspect-[3/4] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-bg-subtle text-fg-muted transition-colors',
                  issue ? 'border-[var(--tt-danger)]' : isActive ? 'border-[var(--tt-primary)]' : 'border-line hover:border-line-strong'
                )}
              >
                {urls[p] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[p] as string} alt={`${FACE_POSE_COPY[p].title} photo`} className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6" aria-hidden />
                )}
                {shots[p] && !issue && (
                  <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--tt-primary)] text-[var(--tt-on-primary)]"><Check className="h-3 w-3" aria-hidden /></span>
                )}
              </button>
              <div className="mt-1.5 flex items-center justify-between gap-1">
                <span className="truncate text-xs font-semibold text-fg">{FACE_POSE_COPY[p].title}</span>
                {shots[p] && (
                  <button type="button" onClick={() => onChange(p, null)} aria-label={`Remove ${FACE_POSE_COPY[p].title} photo`} className="text-fg-muted hover:text-fg"><RotateCcw className="h-3.5 w-3.5" /></button>
                )}
              </div>
              {issue && <p role="alert" className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{issue}</p>}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
        <p className="text-sm font-bold text-fg">{copy.title} photo</p>
        <p className="mt-0.5 text-xs text-fg-muted sm:text-sm">{copy.guide}</p>
        {cameraOn && (
          <div className="relative mx-auto mt-3 aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[78%] w-[52%] rounded-[50%] border-2 border-dashed border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
        )}
        <ul className="mt-3 grid gap-1 text-[11px] text-fg-muted sm:grid-cols-3">
          <li>Good, even light on the face</li>
          <li>No cap, mask or sunglasses</li>
          <li>Fill the oval, one face only</li>
        </ul>
        {cameraError && <p role="alert" className="mt-2 text-xs font-medium text-[var(--tt-danger)]">{cameraError}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {cameraOn ? (
            <>
              <button type="button" onClick={snap} className={primaryBtn}><Camera className="h-3.5 w-3.5" aria-hidden />Take {copy.title.toLowerCase()} photo</button>
              <button type="button" onClick={stop} className={secondaryBtn}>Stop camera</button>
            </>
          ) : (
            <button type="button" onClick={start} className={primaryBtn}><Video className="h-3.5 w-3.5" aria-hidden />Open camera</button>
          )}
          <button type="button" onClick={() => fileRef.current?.click()} className={secondaryBtn}><ImagePlus className="h-3.5 w-3.5" aria-hidden />Upload {copy.title.toLowerCase()} photo</button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onFile} />
        </div>
      </div>
    </div>
  );
}
