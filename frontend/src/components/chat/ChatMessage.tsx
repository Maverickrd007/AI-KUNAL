import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';

import type { ChatMessage as ChatMessageType } from '../../types';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-accent text-white">
          <Bot size={16} strokeWidth={1.5} />
        </div>
      )}
      <div
        className={[
          'max-w-[74%] rounded border p-3 text-sm leading-6',
          isUser ? 'border-accent bg-accent text-white' : 'border-border bg-white text-text-primary shadow-card',
        ].join(' ')}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.action && (
          <div className="mt-3 rounded bg-canvas-secondary p-2 text-xs text-text-secondary">
            Action: {message.action.type} - {message.action.status}
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-text-secondary">
          <User size={16} strokeWidth={1.5} />
        </div>
      )}
    </motion.div>
  );
}
