'use client';

import * as api from '../api/detailedAttendance.api';
import { useSignedImage } from './useSignedImage';

/** The selfie of one check-in or check-out, fetched when its card appears (the link lives for two minutes). */
export function usePunchImage(punchId: number, enabled: boolean) {
  return useSignedImage((signal) => api.getPunchImage(punchId, signal), punchId, enabled);
}
