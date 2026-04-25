import { FormEvent, useEffect, useState } from 'react';
import { Send } from 'lucide-react';

import { sendChatMessage } from '../../lib/api';
import { useChatStore } from '../../store/chatStore';
import { useSessionStore } from '../../store/sessionStore';
import type { ChatMessage as ChatMessageType } from '../../types';
import { ActionChip } from './ActionChip';
import { ChatMessage } from './ChatMessage';

function userMessage(content: string): ChatMessageType {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  };
}

export function ChatPanel() {
  const [input, setInput] = useState('');
  const activeExperimentId = useSessionStore((state) => state.activeExperimentId);
  const {
    chatSessionId,
    messages,
    isLoading,
    suggestedActions,
    addMessage,
    initSession,
    setLoading,
    setSuggestedActions,
  } = useChatStore();

  useEffect(() => {
    initSession(activeExperimentId ?? 'global');
  }, [activeExperimentId, initSession]);

  useEffect(() => {
    if (messages.some((message) => message.content.toLowerCase().includes('action result'))) {
      setSuggestedActions(['Why did the winner win?', 'Show feature importance', 'Generate report']);
    }
  }, [messages, setSuggestedActions]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || !chatSessionId) {
      return;
    }
    setInput('');
    addMessage(userMessage(text));
    setLoading(true);
    try {
      const response = await sendChatMessage(chatSessionId, text, activeExperimentId);
      addMessage(response);
    } catch (error) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Astra could not answer that request.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded border border-border bg-canvas-secondary">
      <div className="border-b border-border bg-white p-5">
        <h2 className="text-lg font-semibold text-text-primary">Chat with Astra</h2>
        <p className="mt-1 text-sm text-text-secondary">Ask about the current experiment or trigger a confirmed action.</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="rounded border border-border bg-white p-8 text-center text-sm text-text-secondary">
            Ask which feature matters most, why a model won, or try a retraining action.
          </div>
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}
        {isLoading && <div className="h-16 skeleton" />}
      </div>

      <div className="border-t border-border bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestedActions.slice(0, 3).map((action) => (
            <ActionChip key={action} label={action} isProcessing={isLoading} onClick={() => setInput(action)} />
          ))}
        </div>
        <form onSubmit={(event) => void submit(event)} className="flex gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="flex-1 rounded border border-border px-3 py-2 text-sm outline-none focus:border-accent"
            placeholder="Ask Astra..."
          />
          <button
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={16} strokeWidth={1.5} />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
