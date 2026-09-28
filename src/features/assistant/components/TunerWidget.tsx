'use client';

import { AnimatePresence } from 'framer-motion';
import { useAssistant } from '../hooks/useAssistant';
import { TunerLauncher } from './TunerLauncher';
import { TunerPanel } from './TunerPanel';

// Mounted once in the root layout (inside AuthProvider) — every authenticated
// page gets it. Renders nothing until the user's org has Tuner enabled
// (checked server-side via /assistant/config, gated by the `allowed_features`
// 'TUNER' code — see src/modules/assistant/presentation/controllers/AssistantController.js).
export function TunerWidget() {
  const { visible, open, toggleOpen, messages, pending, sending, send, confirm, startNewChat } = useAssistant();

  if (!visible) return null;

  return (
    <>
      <TunerLauncher open={open} onClick={toggleOpen} />
      <AnimatePresence>
        {open && (
          <TunerPanel
            messages={messages}
            pending={pending}
            sending={sending}
            onSend={send}
            onConfirm={confirm}
            onNewChat={startNewChat}
          />
        )}
      </AnimatePresence>
    </>
  );
}
