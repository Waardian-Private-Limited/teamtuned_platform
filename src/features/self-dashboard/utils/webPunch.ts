import type { WebFix } from '../api/selfDashboard.api';

/** How long the browser may refine a precise reading before the best one so far is sent. */
const PRECISE_WAIT_MS = 15000;
/** The second, coarse try (Wi-Fi / network position) when the precise one finds nothing. */
const COARSE_WAIT_MS = 10000;
const COARSE_MAX_AGE_MS = 5 * 60 * 1000;
/** Two more frames after the selfie, this far apart: the liveness check compares them. */
const FRAME_GAP_MS = 300;
const EXTRA_FRAMES = 2;

/** A location or camera problem the employee can fix; `message` says how. */
export class DeviceProblem extends Error {}

const isMac = () => typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || navigator.userAgent);

function locationMessage(code: number | null): string {
  if (code === 1) return 'Location is blocked for this site. Click the lock icon in the address bar, set Location to Allow, then try again.';
  if (code === 3) return 'Finding your location took too long. Check that Wi-Fi is on, then try again.';
  return isMac()
    ? 'Your computer could not find its location. Turn on System Settings → Privacy & Security → Location Services, and allow it for this browser. Then try again.'
    : 'Your computer could not find its location. Turn on location in your system settings (Windows: Settings → Privacy & security → Location) and allow it for this browser. Then try again.';
}

/** A random id per punch attempt, so a retried save is not stored twice. */
export function newClientPunchId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const toFix = (pos: GeolocationPosition): WebFix => ({
  lat: pos.coords.latitude,
  lng: pos.coords.longitude,
  accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
});

/** Precise reading: listens until one is as tight as the server accepts, or 15 s, then gives the best one. */
function precise(maxAccuracyM: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let best: GeolocationPosition | null = null;
    let watch = -1;
    const done = (pos: GeolocationPosition | null, code: number | null) => {
      navigator.geolocation.clearWatch(watch);
      clearTimeout(timer);
      if (pos) resolve(pos); else reject(code);
    };
    const timer = setTimeout(() => done(best, 3), PRECISE_WAIT_MS);
    watch = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        if (pos.coords.accuracy <= maxAccuracyM) done(pos, null);
      },
      (err) => { if (err.code === err.PERMISSION_DENIED || !best) done(best, err.code); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: PRECISE_WAIT_MS }
    );
  });
}

function coarse(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, (err) => reject(err.code), { enableHighAccuracy: false, maximumAge: COARSE_MAX_AGE_MS, timeout: COARSE_WAIT_MS }));
}

/**
 * The browser's location. Asking for it is what shows the browser's permission prompt. Many desktops have no
 * GPS: when the precise reading finds nothing, the coarse network position is tried before giving up. The
 * server still decides whether the place and its accuracy are good enough.
 */
export async function currentFix(maxAccuracyM: number): Promise<WebFix> {
  if (typeof window !== 'undefined' && !window.isSecureContext) throw new DeviceProblem('Location only works on a secure (https) page. Open the dashboard over https.');
  if (typeof navigator === 'undefined' || !navigator.geolocation) throw new DeviceProblem('This browser cannot share your location. Use another browser or the app.');
  try {
    return toFix(await precise(maxAccuracyM));
  } catch (code) {
    if (code === 1) throw new DeviceProblem(locationMessage(1));
    try {
      return toFix(await coarse());
    } catch (again) {
      throw new DeviceProblem(locationMessage(typeof again === 'number' ? again : null));
    }
  }
}

/** The front camera. Opening it is what shows the browser's camera prompt. */
export async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new DeviceProblem('This browser cannot open the camera. Use another browser or the app.');
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new DeviceProblem('The camera is blocked for this site. Click the lock icon in the address bar, set Camera to Allow, then try again.');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new DeviceProblem('No camera was found. Connect a webcam, or use the app.');
    if (name === 'NotReadableError') throw new DeviceProblem('The camera is in use by another app. Close it, then try again.');
    throw new DeviceProblem('The camera could not be opened. Try again, or use the app.');
  }
}

function frameOf(video: HTMLVideoElement): Promise<Blob | null> {
  const max = 1280;
  const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
}

/** The selfie and two more frames a moment apart, as the app sends them. */
export async function takeShots(video: HTMLVideoElement): Promise<{ image: Blob; frames: Blob[] } | null> {
  const image = await frameOf(video);
  if (!image) return null;
  const frames: Blob[] = [];
  for (let i = 0; i < EXTRA_FRAMES; i += 1) {
    await new Promise((r) => setTimeout(r, FRAME_GAP_MS));
    const f = await frameOf(video);
    if (f) frames.push(f);
  }
  return { image, frames };
}
