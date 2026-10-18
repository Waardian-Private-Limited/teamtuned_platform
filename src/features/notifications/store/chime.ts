/**
 * A short two-note chime made in the browser, so there is no sound file to ship. Browsers only let a page
 * make sound after the person has touched it once; until then this quietly does nothing.
 */
let context: AudioContext | null = null;
let unlocked = false;

function unlock() {
  if (unlocked || typeof window === 'undefined') return;
  unlocked = true;
  try {
    context = context ?? new AudioContext();
    void context.resume();
  } catch {
    context = null;
  }
}

if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, unlock, { once: true, passive: true });
}

export function playChime() {
  if (!unlocked || !context || context.state === 'closed') return;
  try {
    const now = context.currentTime;
    [660, 880].forEach((hz, i) => {
      const osc = context!.createOscillator();
      const gain = context!.createGain();
      osc.type = 'sine';
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0.0001, now + i * 0.13);
      gain.gain.exponentialRampToValueAtTime(0.14, now + i * 0.13 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.13 + 0.28);
      osc.connect(gain).connect(context!.destination);
      osc.start(now + i * 0.13);
      osc.stop(now + i * 0.13 + 0.3);
    });
  } catch {
    // no sound is better than an error in the middle of someone's work
  }
}
