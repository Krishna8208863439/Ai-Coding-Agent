import { create } from 'zustand';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed?: number;
  timestamp?: string;
  toolCalls?: Array<{
    name: string;
    status: 'running' | 'success' | 'failed';
    output?: string;
  }>;
  approvalRequired?: {
    id: string;
    action: string;
    target: string;
    risk: 'low' | 'medium' | 'high';
  };
}

export interface ConversationSummary {
  id: string;
  title: string;
  modelId: string;
  provider: string;
  updatedAt: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  providerType: string;
  badge?: string;
}

interface ChatState {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  selectedModel: string;
  selectedProvider: string;
  selectedRole: string;
  abortController: AbortController | null;
  attachments: string[];
  searchQuery: string;
  isMaximized: boolean;

  setConversations: (c: ConversationSummary[]) => void;
  setCurrentConversationId: (id: string | null) => void;
  setMessages: (m: ChatMessage[]) => void;
  addMessage: (m: ChatMessage) => void;
  updateLastMessage: (chunk: string) => void;
  setIsStreaming: (b: boolean) => void;
  setSelectedModel: (m: string) => void;
  setSelectedProvider: (p: string) => void;
  setSelectedRole: (r: string) => void;
  setAbortController: (c: AbortController | null) => void;
  addAttachment: (att: string) => void;
  removeAttachment: (att: string) => void;
  clearAttachments: () => void;
  setSearchQuery: (q: string) => void;
  toggleMaximized: () => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isStreaming: false,
  selectedModel: 'gemini-2.0-flash',
  selectedProvider: 'gemini',
  selectedRole: 'ARCHITECT',
  abortController: null,
  attachments: [],
  searchQuery: '',
  isMaximized: false,

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
  setSelectedRole: (selectedRole) => set({ selectedRole }),
  setAbortController: (abortController) => set({ abortController }),
  addAttachment: (att) =>
    set((s) => ({
      attachments: s.attachments.includes(att) ? s.attachments : [...s.attachments, att],
    })),
  removeAttachment: (att) =>
    set((s) => ({
      attachments: s.attachments.filter((a) => a !== att),
    })),
  clearAttachments: () => set({ attachments: [] }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleMaximized: () => set((s) => ({ isMaximized: !s.isMaximized })),
  resetChat: () =>
    set({
      currentConversationId: null,
      messages: [],
      isStreaming: false,
      attachments: [],
    }),
}));
