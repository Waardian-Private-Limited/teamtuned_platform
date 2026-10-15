'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/reimbursement.api';
import { ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES, MAX_SCAN_PAGES } from '../constants/reimbursement.constants';
import type { ReceiptScanDto } from '../types/reimbursement.dto';

export type ScanOutcome = { ok: true; dto: ReceiptScanDto } | { ok: false; message: string };

const isPdf = (f: File) => f.type === 'application/pdf';

/** Why one file cannot be scanned, or null. */
export function scanFileProblem(file: File): string | null {
  if (!ATTACHMENT_TYPES.includes(file.type)) return `${file.name}: attach a PDF, JPG or PNG`;
  if (file.size > MAX_ATTACHMENT_BYTES) return `${file.name}: larger than 5 MB`;
  return null;
}

/** Why these pages cannot be scanned together as one bill, or null. */
export function scanPagesProblem(files: File[]): string | null {
  if (!files.length) return 'Add the bill first';
  if (files.some(isPdf) && files.length > 1) return 'Scan a PDF on its own, or photos of one bill';
  if (files.length > MAX_SCAN_PAGES) return `Scan at most ${MAX_SCAN_PAGES} pages of one bill`;
  return null;
}

/**
 * Reads one bill (all its pages in one call). Only one scan runs at a time: `scan` returns null when
 * one is already running. A result that arrives after `cancel` is dropped.
 */
export function useReceiptScan(scope: 'me' | 'hr', employeeId: number | null) {
  const [scanning, setScanning] = useState(false);
  const running = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    running.current?.abort();
    running.current = null;
    setScanning(false);
  }, []);

  useEffect(() => () => running.current?.abort(), []);

  const scan = useCallback(
    async (files: File[]): Promise<ScanOutcome | null> => {
      if (running.current) return null;
      const controller = new AbortController();
      running.current = controller;
      setScanning(true);
      try {
        const dto = await api.scanReceipt(files, scope, employeeId, controller.signal);
        return controller.signal.aborted ? null : { ok: true, dto };
      } catch (err) {
        return controller.signal.aborted ? null : { ok: false, message: messageOf(err) };
      } finally {
        if (running.current === controller) {
          running.current = null;
          setScanning(false);
        }
      }
    },
    [scope, employeeId]
  );

  return { scanning, scan, cancel };
}
