import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, Button, Badge } from '@nexora/ui';
import { useAuthStore } from '../store/authStore';
import { useChatStore, ChatMessage } from '../store/chatStore';
import {
  Send,
  Square,
  Bot,
  User,
  Copy,
  Check,
  Plus,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

export function AIChat() {
  const { accessToken } = useAuthStore();
  const {
    conversations,
    currentConversationId,
    messages,
    isStreaming,
    selectedModel,
    selectedProvider,
    setConversations,
    setCurrentConversationId,
    setMessages,
    addMessage,
    updateLastMessage,
    setIsStreaming,
    setSelectedModel,
    setSelectedProvider,
    setAbortController,
    abortController,
    resetChat,
  } = useChatStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/chat/conversations', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // ignore
    }
  };

  const loadConversation = async (id: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`/api/chat/conversations/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentConversationId(id);
        setMessages(data.conversation?.messages || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [accessToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputPrompt.trim() || isStreaming) return;

    if (!accessToken) {
      alert('Please log in under Settings before starting AI chats.');
      return;
    }

    const userText = inputPrompt.trim();
    setInputPrompt('');

    // Append user message immediately
    const userMsg: ChatMessage = { role: 'user', content: userText };
    addMessage(userMsg);

    // Prepare assistant placeholder
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
    addMessage(assistantMsg);

    setIsStreaming(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          conversationId: currentConversationId || undefined,
          model: selectedModel,
          provider: selectedProvider,
          content: userText,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        updateLastMessage(`Error: ${err.error || 'Failed to stream response'}`);
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value, { stream: true });
          const lines = chunkText.split('\n').filter((l) => l.trim().startsWith('data: '));

          for (const line of lines) {
            try {
              const data = JSON.parse(line.replace('data: ', '').trim());
              if (data.type === 'start' && data.conversationId) {
                setCurrentConversationId(data.conversationId);
              } else if (data.type === 'delta' && data.chunk) {
                updateLastMessage(data.chunk);
              }
            } catch {
              // ignore malformed JSON chunk
            }
          }
        }
      }
      fetchConversations();
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        updateLastMessage('\n[Stream disconnected or network interrupted]');
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl gap-4">
      {/* Conversations Sidebar */}
      <aside className="hidden w-64 flex-col rounded-xl border border-[#1f2433] bg-[#0d0f17] p-3 md:flex">
        <Button
          variant="primary"
          size="sm"
          onClick={resetChat}
          className="mb-3 w-full gap-2 justify-start"
        >
          <Plus className="h-4 w-4" />
          <span>New Conversation</span>
        </Button>

        <div className="flex-1 space-y-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-3 text-center text-xs text-neutral-500">No previous chats</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                  currentConversationId === c.id
                    ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                    : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-white'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.title || 'Untitled Session'}</span>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-[#1f2433] pt-3 text-[11px] text-neutral-500">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Secret Masking Active</span>
          </div>
        </div>
      </aside>

      {/* Main Chat View */}
      <div className="flex flex-1 flex-col rounded-xl border border-[#1f2433] bg-[#0d0f17]">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-[#1f2433] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">NEXORA AI Streaming Assistant</h2>
              <p className="text-[11px] text-neutral-400">Real-time code generation and architectural synthesis</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="rounded-lg border border-[#1f2433] bg-[#090a0f] px-2.5 py-1 text-xs text-neutral-300 focus:outline-none"
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic Claude</option>
              <option value="groq">Groq</option>
              <option value="ollama">Ollama</option>
            </select>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="rounded-lg border border-[#1f2433] bg-[#090a0f] px-2.5 py-1 text-xs text-neutral-300 focus:outline-none"
            >
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet</option>
              <option value="llama-3.3-70b-versatile">llama-3.3-70b</option>
            </select>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-2xl bg-indigo-600/10 p-4 text-indigo-400 mb-3">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-base font-semibold text-white">What would you like to build today?</h3>
              <p className="max-w-md text-xs text-neutral-400 mt-1">
                Enter any software requirements. NEXORA AI generates full architecture plans, code files, and sandbox execution scripts.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={i}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`group relative max-w-2xl rounded-xl p-3.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white'
                        : 'border border-[#1f2433] bg-[#131620] text-neutral-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans font-normal">{msg.content || (isStreaming ? 'Thinking...' : '')}</div>

                    {!isUser && msg.content && (
                      <button
                        onClick={() => handleCopy(msg.content, i)}
                        className="absolute right-2 top-2 rounded p-1 text-neutral-400 opacity-0 hover:bg-neutral-800 hover:text-white group-hover:opacity-100 transition-opacity"
                        title="Copy message"
                      >
                        {copiedIndex === i ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>

                  {isUser && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300 mt-0.5">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-[#1f2433] p-4 bg-[#090a0f]/50">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask anything or describe a full-stack project..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={isStreaming}
              className="flex-1 rounded-lg border border-[#1f2433] bg-[#0d0f17] px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            />

            {isStreaming ? (
              <Button variant="danger" size="md" type="button" onClick={handleStop} className="gap-1.5 px-4">
                <Square className="h-3.5 w-3.5" />
                <span>Stop</span>
              </Button>
            ) : (
              <Button variant="primary" size="md" type="submit" disabled={!inputPrompt.trim()} className="gap-1.5 px-4">
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

