'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, MapPin } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { ApiError, messageOf } from '@/lib/api/errors';
import * as api from '../api/selfDashboard.api';
import type { WebFix } from '../api/selfDashboard.api';
import type { WebPunchPolicyDto } from '../types/selfDashboard.dto';
import { currentFix, LocationProblem, newClientPunchId, takeShots } from '../utils/webPunch';

type Step = 'locating' | 'reason' | 'camera' | 'saving' | 'done' | 'failed';

const REASON_REQUIRED = 'ATTENDANCE_EXCEPTION_REASON_REQUIRED';
// The photo is no good any more: take it again.
const RETAKE = new Set(['ATTENDANCE_FACE_CAPTURE_EXPIRED', 'ATTENDANCE_FACE_NO_MATCH', 'ATTENDANCE_FACE_LIVENESS_FAILED', 'ATTENDANCE_CAPTURE_INVALID']);
// Network trouble: the same location can be sent again.
const TRANSIENT = new Set([0, 502, 503, 504]);

interface Props {
  open: boolean;
  direction: 'in' | 'out';
  policy: WebPunchPolicyDto;
  onClose: () => void;
  onDone: () => void;
}

/**
 * One check-in or check-out from the browser, as in the app: location first (refused before any photo when it is
 * the wrong place), then a selfie when the policy wants a face, then the save. The server checks everything again.
 */
export function WebPunchDialog({ open, direction, policy, onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>('locating');
  const [error, setError] = useState('');
  const [place, setPlace] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const punchId = useRef(newClientPunchId());
  const fix = useRef<WebFix | null>(null);
  const captureId = useRef<string | null>(null);
  const reasonRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const alive = useRef(true);

  const label = direction === 'in' ? 'Check in' : 'Check out';
  const needsLocation = policy.require_geo || policy.location_mode !== 'open';

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const fail = useCallback((err: unknown) => {
    const code = err instanceof ApiError ? err.code : undefined;
    if (code === REASON_REQUIRED) { setError(messageOf(err)); setStep('reason'); return; }
    if (code && RETAKE.has(code)) { captureId.current = null; setError(messageOf(err)); setStep('camera'); return; }
    // A saved attempt keeps its place only on network trouble; anything else reads the location again.
    if (!(err instanceof ApiError && TRANSIENT.has(err.status))) fix.current = null;
    setError(err instanceof LocationProblem ? err.message : messageOf(err));
    setStep('failed');
  }, []);

  const save = useCallback(async () => {
    setStep('saving');
    try {
      await api.punch({ direction, clientPunchId: punchId.current, fix: fix.current, captureId: captureId.current, exceptionReason: reasonRef.current });
      if (!alive.current) return;
      stopCamera();
      setStep('done');
      onDone();
    } catch (err) {
      if (alive.current) fail(err);
    }
  }, [direction, fail, onDone, stopCamera]);

  // Location, the place check, then the photo or the save.
  const advance = useCallback(async () => {
    setError('');
    try {
      if (needsLocation && !fix.current) {
        setStep('locating');
        fix.current = await currentFix(policy.max_accuracy_m);
      }
      if (fix.current && policy.location_mode !== 'open') {
        setStep('locating');
        const checked = await api.checkPlace(fix.current, reasonRef.current);
        if (!alive.current) return;
        if (!checked.allowed && checked.error) {
          if (checked.error.needs_reason) { setError(checked.error.message); setStep('reason'); return; }
          const near = checked.nearest?.name ? ` Nearest: ${checked.nearest.name}, ${checked.nearest.distance_m} m away.` : '';
          fix.current = null;
          setError(`${checked.error.message}${near}`);
          setStep('failed');
          return;
        }
        setPlace(checked.site_name || checked.other_location_name || null);
      }
      if (!alive.current) return;
      if (policy.require_face && !captureId.current) { setStep('camera'); return; }
      await save();
    } catch (err) {
      if (alive.current) fail(err);
    }
  }, [fail, needsLocation, policy.location_mode, policy.max_accuracy_m, policy.require_face, save]);

  // A fresh attempt each time the dialog opens.
  useEffect(() => {
    if (!open) return undefined;
    alive.current = true;
    punchId.current = newClientPunchId();
    fix.current = null;
    captureId.current = null;
    reasonRef.current = null;
    setReason('');
    setPlace(null);
    void advance();
    return () => { alive.current = false; stopCamera(); };
  }, [open]);

  // The camera runs only on the photo step.
  useEffect(() => {
    if (!open || step !== 'camera') { stopCamera(); return undefined; }
    let cancelled = false;
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser cannot open the camera. Use another browser or the app.');
      return undefined;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setCameraError('The camera is blocked or not available. Allow camera access in the browser, then try again.'));
    return () => { cancelled = true; stopCamera(); };
  }, [open, step, stopCamera]);

  const snap = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setBusy(true);
    setError('');
    try {
      const shots = await takeShots(v);
      if (!shots) throw new Error('The photo could not be taken. Try again.');
      const res = await api.uploadCapture(shots.image, shots.frames);
      captureId.current = res.capture_id;
      await save();
    } catch (err) {
      if (alive.current) fail(err);
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const sendReason = () => {
    reasonRef.current = reason.trim();
    void advance();
  };

  const footer = (() => {
    if (step === 'done') return <Button onClick={onClose}>Done</Button>;
    if (step === 'reason') return (
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={sendReason} disabled={!reason.trim()}>{label}</Button>
      </>
    );
    if (step === 'camera') return (
      <>
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={() => void snap()} loading={busy} loadingLabel="Checking photo…" disabled={!!cameraError}>
          <Camera className="h-4 w-4" aria-hidden />Take photo
        </Button>
      </>
    );
    if (step === 'failed') return (
      <>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button onClick={() => void advance()}>Try again</Button>
      </>
    );
    return <Button variant="secondary" onClick={onClose}>Cancel</Button>;
  })();

  return (
    <Dialog open={open} onClose={onClose} title={label} footer={<div className="flex justify-end gap-2">{footer}</div>}>
      <div className="space-y-4">
        {place && step !== 'done' && (
          <p className="flex items-center gap-2 text-sm text-fg-muted"><MapPin className="h-4 w-4 shrink-0" aria-hidden />At {place}</p>
        )}
        {error && step !== 'done' && <Alert message={error} />}

        {(step === 'locating' || step === 'saving') && (
          <div className="flex items-center gap-3 py-6 text-sm text-fg-muted">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
            {step === 'locating' ? 'Checking your location…' : `Saving your ${direction === 'in' ? 'check-in' : 'check-out'}…`}
          </div>
        )}

        {step === 'reason' && (
          <Textarea label="Why are you outside your work location?" required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} rows={3} />
        )}

        {step === 'camera' && (
          <div>
            <p className="text-sm text-fg-muted">Look into the camera. Good light on your face, no mask or sunglasses.</p>
            <div className="relative mx-auto mt-3 aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
              <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[78%] w-[52%] rounded-[50%] border-2 border-dashed border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
              </div>
            </div>
            {cameraError && <p role="alert" className="mt-2 text-xs font-medium text-[var(--tt-danger)]">{cameraError}</p>}
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-[var(--tt-success)]" aria-hidden />
            <p className="text-base font-bold text-fg">{direction === 'in' ? 'Checked in' : 'Checked out'}</p>
            {place && <p className="text-sm text-fg-muted">At {place}</p>}
          </div>
        )}
      </div>
    </Dialog>
  );
}
