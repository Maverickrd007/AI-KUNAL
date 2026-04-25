import { create } from 'zustand';

import type { ChatMessage } from '../types';

interface ChatState {
  chatSessionId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  suggestedActions: string[];
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setSuggestedActions: (actions: string[]) => void;
  initSession: (experimentId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chatSessionId: null,
  messages: [],
  isLoading: false,
  suggestedActions: ['Explain this dataset', 'Detect leakage', 'Start cleaning'],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (isLoading) => set({ isLoading }),
  setSuggestedActions: (suggestedActions) => set({ suggestedActions }),
  initSession: (experimentId) => {
    if (!get().chatSessionId) {
      set({ chatSessionId: `${experimentId}-${crypto.randomUUID()}` });
    }
  },
}));
