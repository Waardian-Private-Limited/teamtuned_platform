'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { getAssistantConfig, sendTurn, startNewSession } from '../api/assistant.api';
import { messageOf } from '@/lib/api/errors';
import type { ChatMessage, ConfigResponse, TurnResponse } from '../types/assistant.types';

const SESSION_STORAGE_KEY = 'tt_tuner_session_id';

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useAssistant() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<TurnResponse | null>(null); // last needs_confirmation turn
  const [sending, setSending] = useState(false);
  const greeted = useRef(false);

  // Load config once the user is known. Not enabled for this org -> the
  // widget renders nothing (checked by the caller via `config.enabled`).
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let cancelled = false;
    getAssistantConfig()
      .then((res) => {
        if (!cancelled) setConfig(res);
      })
      .catch(() => {
        if (!cancelled) setConfig({ enabled: false });
      })
      .finally(() => {
        if (!cancelled) setConfigLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  // Resume the last session id from this tab, or mint one lazily on first send.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) setSessionId(stored);
  }, []);

  const persistSessionId = useCallback((id: string) => {
    setSessionId(id);
    if (typeof window !== 'undefined') window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  }, []);

  const ensureSessionId = useCallback(async () => {
    if (sessionId) return sessionId;
    const res = await startNewSession();
    persistSessionId(res.sessionId);
    return res.sessionId;
  }, [sessionId, persistSessionId]);

  const greet = useCallback(() => {
    if (greeted.current || !config?.greeting) return;
    greeted.current = true;
    setMessages((prev) => [...prev, { id: uid(), role: 'assistant', text: config.greeting! }]);
  }, [config]);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next) greet();
      return next;
    });
  }, [greet]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setSending(true);
      setMessages((prev) => [...prev, { id: uid(), role: 'user', text: trimmed }]);
      try {
        const sid = await ensureSessionId();
        const res = await sendTurn({ sessionId: sid, text: trimmed });
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', text: res.reply, status: res.status }]);
        setPending(res.status === 'needs_confirmation' ? res : null);
      } catch (err) {
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', text: messageOf(err) }]);
      } finally {
        setSending(false);
      }
    },
    [sending, ensureSessionId]
  );

  const confirm = useCallback(
    async (answer: boolean) => {
      if (sending || !sessionId) return;
      setSending(true);
      try {
        const res = await sendTurn({ sessionId, confirm: answer });
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', text: res.reply, status: res.status }]);
        setPending(res.status === 'needs_confirmation' ? res : null);
      } catch (err) {
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', text: messageOf(err) }]);
      } finally {
        setSending(false);
      }
    },
    [sending, sessionId]
  );

  const startNewChat = useCallback(async () => {
    setMessages([]);
    setPending(null);
    greeted.current = false;
    try {
      const res = await startNewSession();
      persistSessionId(res.sessionId);
    } catch {
      // Session mint failed — next send() will retry via ensureSessionId.
      setSessionId(null);
      if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    greet();
  }, [persistSessionId, greet]);

  return {
    visible: isAuthenticated && configLoaded && !!config?.enabled,
    open,
    toggleOpen,
    messages,
    pending,
    sending,
    send,
    confirm,
    startNewChat,
  };
}
