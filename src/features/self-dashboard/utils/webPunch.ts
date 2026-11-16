import type { WebFix } from '../api/selfDashboard.api';

/** How long the browser may keep refining its location before the best reading so far is sent. */
const FIX_WAIT_MS = 15000;
/** Two more frames after the selfie, this far apart: the liveness check compares them. */
const FRAME_GAP_MS = 300;
const EXTRA_FRAMES = 2;

export class LocationProblem extends Error {}

/** A random id per punch attempt, so a retried save is not stored twice. */
export function newClientPunchId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The browser's location: keeps listening until a reading is as precise as the server accepts
 * (`maxAccuracyM`), or for up to 15 s, then gives the best one it got. The server still decides.
 */
export function currentFix(maxAccuracyM: number): Promise<WebFix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new LocationProblem('This browser cannot share your location. Use another browser or the app.'));
      return;
    }
    let best: GeolocationPosition | null = null;
    const finish = (pos: GeolocationPosition | null, err?: GeolocationPositionError) => {
      navigator.geolocation.clearWatch(watch);
      clearTimeout(timer);
      if (pos) resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null });
      else reject(new LocationProblem(err && err.code === err.PERMISSION_DENIED
        ? 'Location is blocked for this site. Allow location in the browser settings, then try again.'
        : 'Your location could not be found. Check that location is on, then try again.'));
    };
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        if (pos.coords.accuracy <= maxAccuracyM) finish(pos);
      },
      (err) => { if (err.code === err.PERMISSION_DENIED || !best) finish(best, err); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: FIX_WAIT_MS }
    );
    const timer = setTimeout(() => finish(best), FIX_WAIT_MS);
  });
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
