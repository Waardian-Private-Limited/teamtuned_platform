'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, CheckCircle2, MapPin, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { cx } from '@/theme/tokens';
import { ApiError, messageOf } from '@/lib/api/errors';
import * as api from '../api/selfDashboard.api';
import type { WebFix } from '../api/selfDashboard.api';
import type { WebPunchPolicyDto } from '../types/selfDashboard.dto';
import { currentFix, DeviceProblem, newClientPunchId, openCamera, takeShots } from '../utils/webPunch';

type Step = 'access' | 'checking' | 'reason' | 'camera' | 'saving' | 'done' | 'failed';
type Access = 'waiting' | 'asking' | 'ok' | 'blocked';

const REASON_REQUIRED = 'ATTENDANCE_EXCEPTION_REASON_REQUIRED';
// The photo is no good any more: take it again.
const RETAKE = new Set(['ATTENDANCE_FACE_CAPTURE_EXPIRED', 'ATTENDANCE_FACE_NO_MATCH', 'ATTENDANCE_FACE_LIVENESS_FAILED', 'ATTENDANCE_CAPTURE_INVALID']);
// Network trouble: the same location can be sent again.
const TRANSIENT = new Set([0, 502, 503, 504]);

interface Props {
  direction: 'in' | 'out';
  policy: WebPunchPolicyDto;
  onClose: () => void;
  onDone: () => void;
}

function AccessRow({ icon: Icon, label, state }: { icon: LucideIcon; label: string; state: Access }) {
  const text = { waiting: 'Waiting', asking: 'Allow it in the browser prompt…', ok: 'Allowed', blocked: 'Blocked' }[state];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-subtle text-fg"><Icon className="h-4 w-4" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{label}</p>
        <p className={cx('text-xs', state === 'blocked' ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>{text}</p>
      </div>
      {state === 'asking' && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-fg-muted" aria-hidden />}
      {state === 'ok' && <Check className="h-4 w-4 text-[var(--tt-success)]" aria-label="Allowed" />}
      {state === 'blocked' && <X className="h-4 w-4 text-[var(--tt-danger)]" aria-label="Blocked" />}
    </div>
  );
}

/**
 * One check-in or check-out from the browser, as in the app. First the browser's location and camera
 * permissions (each prompt in turn), then the place check (a wrong place is refused before any photo), then the
 * live selfie when the policy wants a face, then the save. The server checks everything again.
 */
export function WebPunchDialog({ direction, policy, onClose, onDone }: Props) {
  const needsLocation = policy.require_geo || policy.location_mode !== 'open';
  const [step, setStep] = useState<Step>('access');
  const [locationAccess, setLocationAccess] = useState<Access>('waiting');
  const [cameraAccess, setCameraAccess] = useState<Access>('waiting');
  const [error, setError] = useState('');
  const [place, setPlace] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const punchId = useRef(newClientPunchId());
  const fix = useRef<WebFix | null>(null);
  const captureId = useRef<string | null>(null);
  const reasonRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Bumped on close (and on React's dev double-mount), so an older attempt's late answers are ignored.
  const gen = useRef(0);

  const label = direction === 'in' ? 'Check in' : 'Check out';

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
    setError(messageOf(err));
    setStep('failed');
  }, []);

  const save = useCallback(async () => {
    const token = gen.current;
    setStep('saving');
    try {
      await api.punch({ direction, clientPunchId: punchId.current, fix: fix.current, captureId: captureId.current, exceptionReason: reasonRef.current });
      if (token !== gen.current) return;
      stopCamera();
      setStep('done');
      onDone();
    } catch (err) {
      if (token === gen.current) fail(err);
    }
  }, [direction, fail, onDone, stopCamera]);

  // Permissions, the place check, then the photo or the save.
  const advance = useCallback(async () => {
    const token = gen.current;
    const stale = () => token !== gen.current;
    setError('');
    // 1. Location, then camera: each request shows the browser's own prompt.
    if (needsLocation && !fix.current) {
      setStep('access');
      setLocationAccess('asking');
      try {
        const got = await currentFix(policy.max_accuracy_m);
        if (stale()) return;
        fix.current = got;
        setLocationAccess('ok');
      } catch (err) {
        if (stale()) return;
        setLocationAccess('blocked');
        setError(err instanceof DeviceProblem ? err.message : messageOf(err));
        setStep('failed');
        return;
      }
    }
    if (policy.require_face && !captureId.current && !streamRef.current?.active) {
      setStep('access');
      setCameraAccess('asking');
      try {
        const stream = await openCamera();
        if (stale()) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        setCameraAccess('ok');
      } catch (err) {
        if (stale()) return;
        setCameraAccess('blocked');
        setError(err instanceof DeviceProblem ? err.message : messageOf(err));
        setStep('failed');
        return;
      }
    }
    try {
      // 2. The place, refused before any photo when it is wrong.
      if (fix.current && policy.location_mode !== 'open') {
        setStep('checking');
        const checked = await api.checkPlace(fix.current, reasonRef.current);
        if (stale()) return;
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
      // 3. The live selfie, then the save.
      if (policy.require_face && !captureId.current) { setStep('camera'); return; }
      await save();
    } catch (err) {
      if (!stale()) fail(err);
    }
  }, [fail, needsLocation, policy.location_mode, policy.max_accuracy_m, policy.require_face, save]);

  // Mounted per attempt: start at once, release the camera on close. Runs once; the snapshot refreshing after the
  // punch must not start it again.
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    void advanceRef.current();
    return () => { gen.current += 1; stopCamera(); };
  }, [stopCamera]);

  // Show the open camera on the photo step.
  useEffect(() => {
    if (step !== 'camera' || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [step]);

  const snap = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const token = gen.current;
    setBusy(true);
    setError('');
    try {
      const shots = await takeShots(v);
      if (!shots) throw new Error('The photo could not be taken. Try again.');
      const res = await api.uploadCapture(shots.image, shots.frames);
      captureId.current = res.capture_id;
      await save();
    } catch (err) {
      if (token === gen.current) fail(err);
    } finally {
      if (token === gen.current) setBusy(false);
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
        <Button onClick={() => void snap()} loading={busy} loadingLabel="Checking photo…">
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

  const showAccess = step === 'access' || (step === 'failed' && (locationAccess === 'blocked' || cameraAccess === 'blocked'));

  return (
    <Dialog open onClose={onClose} title={label} footer={<div className="flex w-full justify-end gap-2 [&>button]:w-auto">{footer}</div>}>
      <div className="space-y-4">
        {showAccess && (
          <div className="space-y-2">
            <p className="text-sm text-fg-muted">To {direction === 'in' ? 'check in' : 'check out'}, allow these in your browser.</p>
            {needsLocation && <AccessRow icon={MapPin} label="Location" state={locationAccess} />}
            {policy.require_face && <AccessRow icon={Camera} label="Camera" state={cameraAccess} />}
          </div>
        )}
        {place && step !== 'done' && (
          <p className="flex items-center gap-2 text-sm text-fg-muted"><MapPin className="h-4 w-4 shrink-0" aria-hidden />At {place}</p>
        )}
        {error && step !== 'done' && <Alert message={error} />}

        {(step === 'checking' || step === 'saving') && (
          <div className="flex items-center gap-3 py-6 text-sm text-fg-muted">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
            {step === 'checking' ? 'Checking your location…' : `Saving your ${direction === 'in' ? 'check-in' : 'check-out'}…`}
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
