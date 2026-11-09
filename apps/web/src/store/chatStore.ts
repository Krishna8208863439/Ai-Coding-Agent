import { create } from 'zustand';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed?: number;
}

export interface ConversationSummary {
  id: string;
  title: string;
  modelId: string;
  provider: string;
  updatedAt: string;
}

interface ChatState {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  selectedModel: string;
  selectedProvider: string;
  abortController: AbortController | null;

  setConversations: (c: ConversationSummary[]) => void;
  setCurrentConversationId: (id: string | null) => void;
  setMessages: (m: ChatMessage[]) => void;
  addMessage: (m: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  setIsStreaming: (b: boolean) => void;
  setSelectedModel: (m: string) => void;
  setSelectedProvider: (p: string) => void;
  setAbortController: (c: AbortController | null) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isStreaming: false,
  selectedModel: 'gemini-2.0-flash',
  selectedProvider: 'gemini',
  abortController: null,

  setConversations: (conversations) => set({ conversations }),
  setCurrentConversationId: (currentConversationId) => set({ currentConversationId }),
  setMessages: (messages) => set({ messages }),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  updateLastMessage: (chunk) =>
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        if (last.role === 'assistant') {
          msgs[msgs.length - 1] = {
            ...last,
            content: last.content + chunk,
          };
        }
      }
      return { messages: msgs };
    }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
  setAbortController: (abortController) => set({ abortController }),
  resetChat: () => set({ currentConversationId: null, messages: [], isStreaming: false }),
}));
