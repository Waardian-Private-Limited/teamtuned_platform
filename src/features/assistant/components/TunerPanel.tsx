'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TunerMessage } from './TunerMessage';
import { TunerThinking } from './TunerThinking';
import type { ChatMessage, TurnResponse } from '../types/assistant.types';

interface TunerPanelProps {
  messages: ChatMessage[];
  pending: TurnResponse | null;
  sending: boolean;
  onSend: (text: string) => void;
  onConfirm: (answer: boolean) => void;
  onNewChat: () => void;
}

export function TunerPanel({ messages, pending, sending, onSend, onConfirm, onNewChat }: TunerPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const awaitingConfirmation = pending?.status === 'needs_confirmation';

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const submit = () => {
    if (!draft.trim() || sending || awaitingConfirmation) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="fixed bottom-24 right-5 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-2.5rem)]
        flex-col overflow-hidden rounded-[var(--tt-radius-lg)] border border-line bg-surface
        shadow-[var(--tt-shadow-lg)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-bg-subtle p-0.5 overflow-hidden shadow-xs">
            <img src="/chat-bot-animation.svg" alt="Tuner" className="h-full w-full object-contain pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-fg">Tuner</span>
              <span className="rounded-full bg-[var(--tt-primary)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-on-primary)]">
                Beta
              </span>
            </div>
            <div className="text-[11px] text-fg-subtle">TeamTuned assistant</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          aria-label="New chat"
          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted
            transition-colors hover:bg-bg-subtle hover:text-fg
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-ring)]"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 tt-scroll-hidden">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-line bg-bg-subtle p-1 shadow-xs">
              <img src="/chat-bot-animation.svg" alt="Tuner" className="h-full w-full object-contain pointer-events-none" />
            </div>
            <h4 className="text-sm font-semibold text-fg">Hi, I'm Tuner</h4>
            <p className="mt-1 max-w-[260px] text-xs text-fg-muted leading-relaxed">
              Ask me anything about your departments, roles, sites, policies and payroll setup, or ask me to create, edit or delete them.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <TunerMessage key={m.id} message={m} />
        ))}
        <AnimatePresence>{sending && <TunerThinking key="thinking" />}</AnimatePresence>

        {awaitingConfirmation && (
          <div className="flex justify-start gap-2 pl-0.5">
            <Button variant="primary" className="!h-9 !w-auto px-4 text-sm" onClick={() => onConfirm(true)} disabled={sending}>
              Yes, go ahead
            </Button>
            <Button variant="secondary" className="!h-9 !w-auto px-4 text-sm" onClick={() => onConfirm(false)} disabled={sending}>
              No, cancel
            </Button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2 rounded-[var(--tt-radius-control)] border border-line bg-surface px-3 py-2 focus-within:border-[var(--tt-primary)] focus-within:ring-4 focus-within:ring-[var(--tt-ring)]">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            disabled={awaitingConfirmation}
            placeholder={awaitingConfirmation ? 'Waiting for your confirmation above…' : 'Ask Tuner anything…'}
            className="min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim() || sending || awaitingConfirmation}
            aria-label="Send"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--tt-primary)]
              text-[var(--tt-on-primary)] transition-opacity disabled:opacity-30
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-ring)]"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
