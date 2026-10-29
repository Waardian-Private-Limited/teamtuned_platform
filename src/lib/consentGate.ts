// A request the server refuses with AUTH_CONSENT_REQUIRED (the privacy notice is not accepted yet, or a new one was
// published) opens the notice instead of failing: AuthProvider listens for this event and shows ConsentGateModal,
// and showError stays quiet while the notice is open so the screen behind it shows no error toasts.
export const CONSENT_REQUIRED_EVENT = 'tt:consent-required';

let pending = false;

export function markConsentRequired() {
  if (typeof window === 'undefined') return;
  pending = true;
  window.dispatchEvent(new Event(CONSENT_REQUIRED_EVENT));
}

export function setConsentPending(value: boolean) {
  pending = value;
}

export const isConsentPending = () => pending;
