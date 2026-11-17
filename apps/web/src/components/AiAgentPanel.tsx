import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  Square,
  Copy,
  Check,
  Plus,
  Search,
  MoreVertical,
  Maximize2,
  Minimize2,
  X,
  Code2,
  Paperclip,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode,
  Folder,
  Terminal,
  HelpCircle,
  Play,
  RotateCcw,
  Trash2,
  ChevronDown,
  Layers,
  ArrowUp,
  SlidersHorizontal,
} from 'lucide-react';
import { useChatStore, ChatMessage } from '../store/chatStore';
import { useIdeStore } from '../store/ideStore';
import { useAuthStore } from '../store/authStore';

interface AiAgentPanelProps {
  onClose?: () => void;
  activeRole?: string;
  onSelectRole?: (role: string) => void;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 3.8 Flash Low', provider: 'gemini', badge: 'Fast & Smart' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', badge: 'High Reasoning' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', badge: 'Omni' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', badge: 'Efficient' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', badge: 'Top Coding' },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'groq', badge: 'Ultra Fast' },
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek', badge: 'Open Weights' },
];

const AGENT_ROLES = [
  { id: 'ARCHITECT', name: 'Architect Agent', desc: 'System design, requirements, stack selection' },
  { id: 'DEVELOPER', name: 'Developer Agent', desc: 'Code writing, implementation, refactoring' },
  { id: 'DEBUGGER', name: 'Debugger Agent', desc: 'Stack traces, root cause analysis, fixes' },
  { id: 'TESTER', name: 'Tester Agent', desc: 'Unit tests, end-to-end coverage, suites' },
  { id: 'SECURITY', name: 'Security Agent', desc: 'Vulnerability scan, secret leakage check' },
  { id: 'UI_UX', name: 'UI/UX Agent', desc: 'Design tokens, contrast, responsiveness' },
  { id: 'PROJECT_MANAGER', name: 'Project Manager', desc: 'Milestone tracking, approval coordination' },
];

const MENTION_OPTIONS = [
  { tag: '@workspace', desc: 'Include workspace file tree & structure context' },
  { tag: '@file', desc: 'Reference current editor file or choose a path' },
  { tag: '@terminal', desc: 'Inspect recent terminal output and execution logs' },
  { tag: '@problems', desc: 'Include active syntax and typechecker diagnostics' },
  { tag: '@agent', desc: 'Delegate sub-tasks to a specialized engineering agent' },
];

const SLASH_COMMANDS = [
  { cmd: '/new', desc: 'Start a clean conversation thread' },
  { cmd: '/clear', desc: 'Clear all messages in the active conversation' },
  { cmd: '/fix', desc: 'Diagnose and propose fixes for open compiler issues' },
  { cmd: '/test', desc: 'Generate test cases for current open file' },
  { cmd: '/plan', desc: 'Create detailed step-by-step implementation plan' },
  { cmd: '/model', desc: 'Open the model switch picker' },
  { cmd: '/agents', desc: 'Switch specialized engineering agent role' },
  { cmd: '/help', desc: 'Display all available agent commands and shortcuts' },
];

export function AiAgentPanel({ onClose, activeRole, onSelectRole }: AiAgentPanelProps) {
  const { accessToken } = useAuthStore();
  const { activeTabPath, openTabs, updateTabContent } = useIdeStore();
  const {
    conversations,
    currentConversationId,
    messages,
    isStreaming,
    selectedModel,
    selectedProvider,
    selectedRole,
    attachments,
    searchQuery,
    isMaximized,
    setConversations,
    setCurrentConversationId,
    setMessages,
    addMessage,
    updateLastMessage,
    setIsStreaming,
    setSelectedModel,
    setSelectedProvider,
    setSelectedRole,
    setAbortController,
    addAttachment,
    removeAttachment,
    clearAttachments,
    setSearchQuery,
    toggleMaximized,
    resetChat,
  } = useChatStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync active role with parent
  useEffect(() => {
    if (activeRole) setSelectedRole(activeRole);
  }, [activeRole]);

  // Load conversations on mount
  useEffect(() => {
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
      } catch {}
    };
    fetchConversations();
  }, [accessToken]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Handle Input typing and @ / triggers
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputPrompt(val);

    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }

    // Check for @ mentions
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
      const q = val.slice(lastAt).toLowerCase();
      setMentionQuery(q);
      setSlashQuery(null);
    } else {
      setMentionQuery(null);
    }

    // Check for / commands
    const lastSlash = val.lastIndexOf('/');
    if (lastSlash !== -1 && (lastSlash === 0 || val[lastSlash - 1] === ' ')) {
      const q = val.slice(lastSlash).toLowerCase();
      setSlashQuery(q);
      setMentionQuery(null);
    } else {
      setSlashQuery(null);
    }
  };

  // Execute Slash Command
  const applySlashCommand = (cmd: string) => {
    setSlashQuery(null);
    if (cmd === '/new') {
      resetChat();
      setInputPrompt('');
      return;
    }
    if (cmd === '/clear') {
      setMessages([]);
      setInputPrompt('');
      return;
    }
    if (cmd === '/model') {
      setShowModelPicker(true);
      setInputPrompt('');
      return;
    }
    if (cmd === '/agents') {
      setShowAgentPicker(true);
      setInputPrompt('');
      return;
    }
    if (cmd === '/help') {
      addMessage({
        role: 'system',
        content: `**NEXORA AI Command Reference:**\n\n- \`/new\`: Start a new conversation\n- \`/clear\`: Clear chat history\n- \`/fix\`: Propose compiler & lint error fixes\n- \`/test\`: Generate unit test suite\n- \`/plan\`: Formulate architecture plan\n- \`/model\`: Switch LLM model\n- \`/agents\`: Switch engineering role`,
      });
      setInputPrompt('');
      return;
    }

    // Otherwise insert command into prompt
    setInputPrompt(`${cmd} `);
  };

  // Apply Mention
  const applyMention = (tag: string) => {
    setMentionQuery(null);
    if (tag === '@file' && activeTabPath) {
      addAttachment(activeTabPath);
    } else if (tag === '@workspace') {
      addAttachment('workspace-tree');
    } else if (tag === '@terminal') {
      addAttachment('terminal-logs');
    } else {
      addAttachment(tag);
    }

    // Remove the trailing @ from prompt
    const lastAt = inputPrompt.lastIndexOf('@');
    if (lastAt !== -1) {
      setInputPrompt(inputPrompt.slice(0, lastAt).trim());
    }
  };

  // Send Message
  const handleSend = async () => {
    if (!inputPrompt.trim() || isStreaming) return;

    const promptText = inputPrompt;
    setInputPrompt('');
    setMentionQuery(null);
    setSlashQuery(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    addMessage(userMessage);

    // Initial empty assistant message for streaming
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    addMessage(assistantMessage);

    setIsStreaming(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          conversationId: currentConversationId || undefined,
          model: selectedModel,
          provider: selectedProvider,
          content: promptText,
          agentRole: selectedRole,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === 'start' && event.conversationId) {
                  setCurrentConversationId(event.conversationId);
                } else if (event.type === 'delta' && event.chunk) {
                  updateLastMessage(event.chunk);
                } else if (event.type === 'done') {
                  // Completed
                }
              } catch {}
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        updateLastMessage(`\n\n*[Execution interrupted: ${err.message}]*`);
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  // Stop Generation
  const handleStop = () => {
    const { abortController } = useChatStore.getState();
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
    }
  };

  // Copy Content
  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Insert Code into Monaco Editor
  const handleInsertCode = (code: string) => {
    if (activeTabPath) {
      const active = openTabs.find((t) => t.path === activeTabPath);
      const newContent = `${active?.content || ''}\n\n${code}`;
      updateTabContent(activeTabPath, newContent);
    }
  };

  // Filter messages by search query if search is open
  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const currentModelName =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name || 'Gemini 3.8 Flash Low';

  return (
    <aside
      className={`h-full bg-[#171717] border-l border-[#2e2e2e] flex flex-col justify-between transition-all duration-200 z-30 select-none ${
        isMaximized ? 'w-[750px]' : 'w-[420px]'
      }`}
    >
      {/* 1. TOP HEADER */}
      <div className="h-11 bg-[#191919] border-b border-[#2e2e2e] px-3 flex items-center justify-between text-neutral-300">
        <div className="flex items-center gap-2">
          {/* Agent Role Badge */}
          <button
            onClick={() => setShowAgentPicker((prev) => !prev)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#222] hover:bg-[#2a2a2a] border border-[#333] text-xs font-medium text-neutral-200 transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>{selectedRole}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Search Toggle */}
          <button
            onClick={() => setShowSearchInput((prev) => !prev)}
            title="Search conversation"
            className={`p-1.5 rounded hover:bg-[#262626] text-neutral-400 hover:text-neutral-200 transition-colors ${
              showSearchInput ? 'bg-[#2a2a2a] text-cyan-400' : ''
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* New Chat Button */}
          <button
            onClick={() => resetChat()}
            title="New Conversation"
            className="p-1.5 rounded hover:bg-[#262626] text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Minimize */}
          <button
            onClick={toggleMaximized}
            title={isMaximized ? 'Restore standard width' : 'Maximize panel'}
            className="p-1.5 rounded hover:bg-[#262626] text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Three-Dot Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu((prev) => !prev)}
              title="More options"
              className="p-1.5 rounded hover:bg-[#262626] text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showOptionsMenu && (
              <div className="absolute right-0 top-8 w-48 bg-[#202020] border border-[#333] rounded-lg shadow-xl py-1 text-xs z-50">
                <button
                  onClick={() => {
                    resetChat();
                    setShowOptionsMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2a2a2a] flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> New Conversation
                </button>
                <button
                  onClick={() => {
                    setMessages([]);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2a2a2a] text-red-400 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Messages
                </button>
                <div className="border-t border-[#303030] my-1" />
                <button
                  onClick={() => {
                    setShowModelPicker(true);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2a2a2a] flex items-center gap-2"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Switch Model
                </button>
                {onClose && (
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#2a2a2a] flex items-center gap-2 text-neutral-400"
                  >
                    <X className="w-3.5 h-3.5" /> Close Panel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Input Bar (Conditional) */}
      {showSearchInput && (
        <div className="p-2 border-b border-[#2e2e2e] bg-[#1a1a1a]">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search chat messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141414] border border-[#303030] rounded pl-8 pr-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      )}

      {/* 2. CONVERSATION FEED (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {displayedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <Sparkles className="w-8 h-8 mb-3 text-cyan-400 opacity-60" />
            <h4 className="text-sm font-semibold text-neutral-300 mb-1">
              NEXORA Autonomous Agent
            </h4>
            <p className="text-xs text-neutral-400 max-w-xs mb-4">
              Type a prompt or mention code context. I can write modules, run tests, diagnose bugs, and push directly to GitHub.
            </p>
            <div className="grid grid-cols-2 gap-2 text-left w-full max-w-sm">
              <button
                onClick={() => setInputPrompt('/plan Create an end-to-end authentication flow')}
                className="p-2 bg-[#1f1f1f] hover:bg-[#252525] border border-[#2e2e2e] rounded text-[11px] text-neutral-300 transition-colors"
              >
                📐 Plan Auth Flow
              </button>
              <button
                onClick={() => setInputPrompt('/fix Inspect and fix TypeScript compilation errors')}
                className="p-2 bg-[#1f1f1f] hover:bg-[#252525] border border-[#2e2e2e] rounded text-[11px] text-neutral-300 transition-colors"
              >
                🛠️ Fix Type Errors
              </button>
              <button
                onClick={() => setInputPrompt('/test Generate unit test suite for active file')}
                className="p-2 bg-[#1f1f1f] hover:bg-[#252525] border border-[#2e2e2e] rounded text-[11px] text-neutral-300 transition-colors"
              >
                🧪 Generate Unit Tests
              </button>
              <button
                onClick={() => setInputPrompt('@workspace Summarize project architecture')}
                className="p-2 bg-[#1f1f1f] hover:bg-[#252525] border border-[#2e2e2e] rounded text-[11px] text-neutral-300 transition-colors"
              >
                🌐 Analyze Workspace
              </button>
            </div>
          </div>
        ) : (
          displayedMessages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'}`}
              >
                {/* Author & Timestamp */}
                <div className="flex items-center gap-2 mb-1 px-1 text-[10px] text-neutral-500">
                  <span className="font-semibold text-neutral-400">
                    {isUser ? 'You' : `${selectedRole} Agent`}
                  </span>
                  <span>{msg.timestamp || 'Just now'}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[95%] rounded-lg p-3 relative leading-relaxed ${
                    isUser
                      ? 'bg-[#262626] text-neutral-100 border border-[#333]'
                      : 'bg-[#1b1b1b] text-neutral-200 border border-[#282828] w-full'
                  }`}
                >
                  {/* Content with Code block formatting */}
                  <div className="whitespace-pre-wrap break-words font-sans">
                    {msg.content.includes('```') ? (
                      msg.content.split('```').map((part, pIdx) => {
                        if (pIdx % 2 === 1) {
                          // Code block
                          const firstLineEnd = part.indexOf('\n');
                          const lang = firstLineEnd !== -1 ? part.slice(0, firstLineEnd).trim() : '';
                          const code = firstLineEnd !== -1 ? part.slice(firstLineEnd + 1) : part;

                          return (
                            <div
                              key={pIdx}
                              className="my-2 bg-[#121212] border border-[#2c2c2c] rounded overflow-hidden font-mono text-[11px]"
                            >
                              <div className="px-3 py-1 bg-[#1a1a1a] border-b border-[#292929] flex items-center justify-between text-neutral-400 text-[10px]">
                                <span>{lang || 'code'}</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleInsertCode(code)}
                                    title="Insert into active editor"
                                    className="hover:text-cyan-400 flex items-center gap-1"
                                  >
                                    <Code2 className="w-3 h-3" /> Insert
                                  </button>
                                  <button
                                    onClick={() => handleCopy(code, idx * 100 + pIdx)}
                                    title="Copy code"
                                    className="hover:text-cyan-400 flex items-center gap-1"
                                  >
                                    {copiedIndex === idx * 100 + pIdx ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <pre className="p-3 overflow-x-auto text-neutral-300">{code}</pre>
                            </div>
                          );
                        }
                        return <span key={pIdx}>{part}</span>;
                      })
                    ) : (
                      <span>{msg.content}</span>
                    )}
                  </div>

                  {/* Copy Button on Assistant Bubble */}
                  {!isUser && (
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      title="Copy message"
                      className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 text-neutral-400 hover:text-white rounded transition-opacity"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. FLOATING SUGGESTIONS MENU */}
      {mentionQuery !== null && (
        <div className="mx-3 mb-1 bg-[#202020] border border-[#333] rounded-lg shadow-xl p-1 text-xs max-h-48 overflow-y-auto">
          <div className="px-2 py-1 text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
            Context Mentions
          </div>
          {MENTION_OPTIONS.map((opt) => (
            <button
              key={opt.tag}
              onClick={() => applyMention(opt.tag)}
              className="w-full text-left px-2 py-1.5 hover:bg-[#2b2b2b] rounded flex items-center justify-between text-neutral-200"
            >
              <span className="font-mono text-cyan-400 font-semibold">{opt.tag}</span>
              <span className="text-neutral-500 text-[11px]">{opt.desc}</span>
            </button>
          ))}
        </div>
      )}

      {slashQuery !== null && (
        <div className="mx-3 mb-1 bg-[#202020] border border-[#333] rounded-lg shadow-xl p-1 text-xs max-h-48 overflow-y-auto">
          <div className="px-2 py-1 text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
            Slash Commands
          </div>
          {SLASH_COMMANDS.map((opt) => (
            <button
              key={opt.cmd}
              onClick={() => applySlashCommand(opt.cmd)}
              className="w-full text-left px-2 py-1.5 hover:bg-[#2b2b2b] rounded flex items-center justify-between text-neutral-200"
            >
              <span className="font-mono text-cyan-400 font-semibold">{opt.cmd}</span>
              <span className="text-neutral-500 text-[11px]">{opt.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* 4. ATTACHMENT CHIPS */}
      {attachments.length > 0 && (
        <div className="px-3 py-1 flex items-center gap-1.5 flex-wrap">
          {attachments.map((att) => (
            <span
              key={att}
              className="px-2 py-0.5 rounded bg-[#242424] border border-[#383838] text-[10px] text-cyan-300 font-mono flex items-center gap-1"
            >
              <FileCode className="w-3 h-3 text-cyan-400" />
              {att}
              <button onClick={() => removeAttachment(att)} className="hover:text-red-400">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 5. SMART MESSAGE INPUT BOX (Fixed Bottom matching screenshot) */}
      <div className="p-3 bg-[#171717] border-t border-[#2a2a2a]">
        <div className="bg-[#202020] border border-[#303030] focus-within:border-neutral-500 rounded-xl p-2.5 transition-colors shadow-inner flex flex-col justify-between">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputPrompt}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything, @ to mention, / for actions..."
            className="w-full bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none resize-none min-h-[44px]"
          />

          {/* Bottom Toolbar within Input Container */}
          <div className="flex items-center justify-between pt-2 border-t border-[#292929] text-xs">
            <div className="flex items-center gap-1.5">
              {/* Attachment Button (+) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAttachMenu((prev) => !prev)}
                  title="Add context or file (+)"
                  className="p-1 rounded hover:bg-[#2c2c2c] text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {showAttachMenu && (
                  <div className="absolute left-0 bottom-8 w-48 bg-[#222] border border-[#333] rounded-lg shadow-xl py-1 text-xs z-50">
                    <button
                      onClick={() => {
                        if (activeTabPath) addAttachment(activeTabPath);
                        setShowAttachMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#2b2b2b] flex items-center gap-2 text-neutral-200"
                    >
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" /> Current File
                    </button>
                    <button
                      onClick={() => {
                        addAttachment('workspace-tree');
                        setShowAttachMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#2b2b2b] flex items-center gap-2 text-neutral-200"
                    >
                      <Folder className="w-3.5 h-3.5 text-cyan-400" /> Full Workspace Tree
                    </button>
                    <button
                      onClick={() => {
                        addAttachment('terminal-logs');
                        setShowAttachMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#2b2b2b] flex items-center gap-2 text-neutral-200"
                    >
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Recent Terminal Logs
                    </button>
                  </div>
                )}
              </div>

              {/* Model Selector Pill (e.g. Gemini 3.8 Flash Low) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModelPicker((prev) => !prev)}
                  className="px-2 py-0.5 rounded bg-[#282828] hover:bg-[#303030] text-[11px] text-neutral-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <span>{currentModelName}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-neutral-400" />
                </button>

                {showModelPicker && (
                  <div className="absolute left-0 bottom-8 w-60 bg-[#222] border border-[#333] rounded-lg shadow-xl p-1 text-xs z-50">
                    <div className="px-2 py-1 text-[10px] text-neutral-400 font-semibold uppercase">
                      Select LLM Provider & Model
                    </div>
                    {AVAILABLE_MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setSelectedProvider(m.provider);
                          setShowModelPicker(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition-colors ${
                          selectedModel === m.id
                            ? 'bg-cyan-950/60 text-cyan-300'
                            : 'hover:bg-[#2c2c2c] text-neutral-200'
                        }`}
                      >
                        <span className="truncate">{m.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#181818] text-neutral-400 font-mono">
                          {m.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Send / Stop Generation Button */}
            <div>
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  title="Stop generation"
                  className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputPrompt.trim()}
                  title="Send prompt (Enter)"
                  className={`p-1.5 rounded-md transition-colors ${
                    inputPrompt.trim()
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      : 'bg-[#292929] text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Selector Dropdown (Conditional) */}
      {showAgentPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1c1c1c] border border-[#303030] rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-2">
              <h3 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-cyan-400" /> Select Engineering Agent
              </h3>
              <button onClick={() => setShowAgentPicker(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {AGENT_ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRole(r.id);
                    if (onSelectRole) onSelectRole(r.id);
                    setShowAgentPicker(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                    selectedRole === r.id
                      ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-200'
                      : 'bg-[#161616] border-[#292929] hover:bg-[#202020] text-neutral-300'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>{r.name}</span>
                    {selectedRole === r.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
