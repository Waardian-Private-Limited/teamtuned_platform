'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf, statusOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';
import * as api from '../../shared/api/recruitment.api';
import { STAGE_LABELS } from '../../shared/constants/recruitment.constants';
import { toPipeline, toPositionDetail } from '../../shared/types/recruitment.mapper';
import type { ApplicationCard, PipelineColumn, PositionDetail, Stage } from '../../shared/types/recruitment.model';

/** Position header/details (GET /positions/:id) + Kanban (GET /positions/:id/pipeline). */
export function usePositionPage(positionId: number) {
  const [position, setPosition] = useState<PositionDetail | null>(null);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBoardLoading, setIsBoardLoading] = useState(true);
  const [error, setError] = useState('');
  const [boardError, setBoardError] = useState('');
  const [notFound, setNotFound] = useState<false | 403 | 404>(false);
  const boardSeq = useRef(0);

  const loadPosition = useCallback(async () => {
    setError('');
    try {
      setPosition(toPositionDetail(await api.getPosition(positionId)));
    } catch (err) {
      const s = statusOf(err);
      if (s === 403 || s === 404) setNotFound(s);
      else setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [positionId]);

  const loadBoard = useCallback(async () => {
    const mine = ++boardSeq.current;
    setBoardError('');
    try {
      const p = toPipeline(await api.getPipeline(positionId));
      if (mine !== boardSeq.current) return;
      setColumns(p.columns);
    } catch (err) {
      if (mine === boardSeq.current) setBoardError(messageOf(err));
    } finally {
      if (mine === boardSeq.current) setIsBoardLoading(false);
    }
  }, [positionId]);

  useEffect(() => {
    setIsLoading(true);
    setIsBoardLoading(true);
    setNotFound(false);
    loadPosition();
    loadBoard();
  }, [loadPosition, loadBoard]);

  const reload = useCallback(() => { loadPosition(); loadBoard(); }, [loadPosition, loadBoard]);

  /** Optimistic move between columns; reverts and toasts on failure. */
  const moveCard = useCallback(async (card: ApplicationCard, to: Stage) => {
    if (card.stage === to) return;
    const snapshot = columns;
    boardSeq.current += 1; // a slower refetch must not overwrite the optimistic state
    setColumns((cols) => {
      const has = cols.some((c) => c.stage === to);
      const base = has ? cols : [...cols, { stage: to, items: [], more: 0 }];
      return base.map((c) => {
        if (c.stage === card.stage) return { ...c, items: c.items.filter((i) => i.id !== card.id) };
        if (c.stage === to) return { ...c, items: [{ ...card, stage: to, stageChangedAt: new Date().toISOString() }, ...c.items] };
        return c;
      });
    });
    try {
      await api.moveStage(card.id, to);
      loadBoard();
      return true;
    } catch (err) {
      setColumns(snapshot);
      showError(`Could not move to ${STAGE_LABELS[to]}: ${messageOf(err)}`);
      return false;
    }
  }, [columns, loadBoard]);

  const removeCard = useCallback((id: number) => {
    setColumns((cols) => cols.map((c) => ({ ...c, items: c.items.filter((i) => i.id !== id) })));
  }, []);

  return { position, setPosition, columns, isLoading, isBoardLoading, error, boardError, notFound, reload, loadBoard, loadPosition, moveCard, removeCard };
}
