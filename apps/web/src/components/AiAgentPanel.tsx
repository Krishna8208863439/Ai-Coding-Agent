import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Wrench,
  ShieldAlert,
  Loader2,
  Activity,
  Workflow,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { useChatStore, ChatMessage, ToolCallItem, ApprovalItem, ModelOption } from '../store/chatStore';
import { useIdeStore } from '../store/ideStore';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';

interface AiAgentPanelProps {
  onClose?: () => void;
  activeRole?: string;
  onSelectRole?: (role: string) => void;
}

const AGENT_ROLES = [
  { id: 'ARCHITECT', name: 'Architect Agent', desc: 'System design, requirements, stack selection', icon: '📐' },
  { id: 'DEVELOPER', name: 'Developer Agent', desc: 'Code writing, implementation, refactoring', icon: '💻' },
  { id: 'DEBUGGER', name: 'Debugger Agent', desc: 'Stack traces, root cause analysis, fixes', icon: '🔍' },
  { id: 'TESTER', name: 'Tester Agent', desc: 'Unit tests, end-to-end coverage, suites', icon: '🧪' },
  { id: 'SECURITY', name: 'Security Agent', desc: 'Vulnerability scan, secret leakage check', icon: '🛡️' },
  { id: 'UI_UX', name: 'UI/UX Agent', desc: 'Design tokens, contrast, responsiveness', icon: '🎨' },
  { id: 'PROJECT_MANAGER', name: 'Project Manager', desc: 'Milestone tracking, approval coordination', icon: '📋' },
];

const MENTION_OPTIONS = [
  { tag: '@workspace', desc: 'Include workspace file tree & structure context' },
  { tag: '@file', desc: 'Reference current editor file or choose a path' },
  { tag: '@terminal', desc: 'Inspect recent terminal output and execution logs' },
  { tag: '@problems', desc: 'Include active syntax and typechecker diagnostics' },
  { tag: '@apis', desc: 'Include configured Universal APIs and available endpoints' },
  { tag: '@agent', desc: 'Delegate sub-tasks to a specialized engineering agent' },
];

const SLASH_COMMANDS = [
  { cmd: '/new', desc: 'Start a clean conversation thread' },
  { cmd: '/clear', desc: 'Clear all messages in the active conversation' },
  { cmd: '/fix', desc: 'Diagnose and propose fixes for open compiler issues' },
  { cmd: '/test', desc: 'Generate test cases for current open file' },
  { cmd: '/plan', desc: 'Create detailed step-by-step implementation plan' },
  { cmd: '/apis', desc: 'List all connected Universal APIs in chat' },
  { cmd: '/call-api', desc: 'Execute a connected Universal API endpoint' },
  { cmd: '/autonomous', desc: 'Toggle 7-agent autonomous chain mode' },
  { cmd: '/model', desc: 'Open the model switch picker' },
  { cmd: '/agents', desc: 'Switch specialized engineering agent role' },
  { cmd: '/help', desc: 'Display all available agent commands and shortcuts' },
];

export function AiAgentPanel({ onClose, activeRole, onSelectRole }: AiAgentPanelProps) {
  const { accessToken } = useAuthStore();
  const { activeTabPath, openTabs, updateTabContent, currentProjectId, diagnostics } = useIdeStore();
  const { currentWorkspace, fileTree } = useWorkspaceStore();
  const {
    conversations,
    currentConversationId,
    messages,
    isStreaming,
    selectedModel,
    selectedProvider,
    selectedRole,
    executionMode,
    recentActivities,
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
    setExecutionMode,
    addActivityEvent,
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
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalItem[]>([]);

  // Live model list (fetched from /api/providers/models)
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ─── Fetch live models from connected providers ──────────────────────────
  const fetchModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const res = await fetch('/api/providers/models', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawModels: Array<{
        id: string;
        name: string;
        provider: string;
        badge?: string;
        isSimulated?: boolean;
      }> = data.models || [];

      const mapped: ModelOption[] = rawModels.map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        providerType: m.provider,
        badge: m.isSimulated ? '⚠ SIMULATED' : (m.badge || m.provider.toUpperCase()),
      }));

      setAvailableModels(mapped);

      // Auto-select first non-simulated model if current is not in list
      if (mapped.length > 0) {
        const live = mapped.filter((m) => !m.badge?.includes('SIMULATED'));
        const target = live.length > 0 ? live[0] : mapped[0];
        const inList = mapped.some((m) => m.id === selectedModel);
        if (!inList) {
          setSelectedModel(target.id);
          setSelectedProvider(target.providerType);
        }
      }
    } catch (err: any) {
      setModelsError(err.message || 'Failed to load models');
    } finally {
      setModelsLoading(false);
    }
  }, [accessToken, selectedModel]);

  // Load models + initial data on mount
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Sync active role with parent
  useEffect(() => {
    if (activeRole) setSelectedRole(activeRole);
  }, [activeRole]);

  // Load conversations and pending approvals on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!accessToken) return;
      try {
        const [convRes, appRes] = await Promise.all([
          fetch('/api/chat/conversations', { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch('/api/agents/approvals', { headers: { Authorization: `Bearer ${accessToken}` } }),
        ]);

        if (convRes.ok) {
          const data = await convRes.json();
          setConversations(data.conversations || []);
        }

        if (appRes.ok) {
          const data = await appRes.json();
          if (data.approvals) {
            setPendingApprovals(
              data.approvals.map((a: any) => ({
                id: a.id,
                action: a.actionType,
                target: a.details?.tool || a.details?.input?.path || 'Action',
                risk: a.actionType === 'FILE_DELETE' ? 'high' : 'medium',
                tool: a.details?.tool,
                details: a.details,
                status: 'pending',
              }))
            );
          }
        }
      } catch {}
    };
    fetchInitialData();
  }, [accessToken]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, recentActivities]);

  // ─── Resolve attachment content to real data ─────────────────────────────
  const resolveAttachmentContext = async (attachmentKeys: string[]): Promise<string[]> => {
    const resolved: string[] = [];
    for (const key of attachmentKeys) {
      try {
        if (key === 'workspace-tree') {
          const root = currentWorkspace?.rootPath;
          if (root) {
            const res = await fetch(
              `/api/fs/tree?root=${encodeURIComponent(root)}&path=`,
              { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} }
            );
            if (res.ok) {
              const data = await res.json();
              const lines = (data.entries || []).map((e: any) =>
                `${e.isDir ? '📁' : '📄'} ${e.path}`
              );
              resolved.push(`[Workspace Tree: ${root}]\n${lines.join('\n')}`);
              continue;
            }
          }
          // Fallback: use in-memory tree
          const lines = fileTree.slice(0, 80).map((n) => `${n.isDir ? '📁' : '📄'} ${n.path}`);
          resolved.push(`[Workspace Tree]\n${lines.join('\n')}`);
        } else if (key === 'terminal-logs') {
          const res = await fetch('/api/terminal/sessions', {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            const sessions = data.sessions || [];
            const logs = sessions
              .slice(0, 3)
              .map((s: any) => `[Session ${s.id}] Exit:${s.exitCode ?? 'running'}\n${(s.recentOutput || []).join('\n')}`)
              .join('\n---\n');
            resolved.push(`[Recent Terminal Logs]\n${logs || 'No recent terminal output.'}`);
          } else {
            resolved.push('[Terminal Logs: unavailable]');
          }
        } else if (key === '@problems') {
          const diags = diagnostics || [];
          if (diags.length === 0) {
            resolved.push('[Diagnostics: No active problems]');
          } else {
            const lines = diags.slice(0, 30).map((d: any) => `${d.severity} ${d.file}:${d.line} — ${d.message}`);
            resolved.push(`[Active Problems (${diags.length})]\n${lines.join('\n')}`);
          }
        } else if (key.startsWith('@')) {
          resolved.push(`[Mention: ${key}]`);
        } else {
          // Treat as a file path
          const root = currentWorkspace?.rootPath;
          if (root) {
            const res = await fetch(
              `/api/fs/read?root=${encodeURIComponent(root)}&path=${encodeURIComponent(key)}`,
              { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} }
            );
            if (res.ok) {
              const data = await res.json();
              resolved.push(`[File: ${key}]\n\`\`\`\n${(data.content || '').slice(0, 4000)}\n\`\`\``);
              continue;
            }
          }
          // Try active tab content
          const tab = openTabs.find((t) => t.path === key);
          if (tab?.content) {
            resolved.push(`[File: ${key}]\n\`\`\`\n${tab.content.slice(0, 4000)}\n\`\`\``);
          } else {
            resolved.push(`[File: ${key}]`);
          }
        }
      } catch {
        resolved.push(`[Context: ${key}]`);
      }
    }
    return resolved;
  };

  // ─── Handle Input typing and @ / triggers ────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputPrompt(val);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }

    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
      setMentionQuery(val.slice(lastAt).toLowerCase());
      setSlashQuery(null);
    } else {
      setMentionQuery(null);
    }

    const lastSlash = val.lastIndexOf('/');
    if (lastSlash !== -1 && (lastSlash === 0 || val[lastSlash - 1] === ' ')) {
      setSlashQuery(val.slice(lastSlash).toLowerCase());
      setMentionQuery(null);
    } else {
      setSlashQuery(null);
    }
  };

  // ─── Execute Slash Command ────────────────────────────────────────────────
  const applySlashCommand = (cmd: string) => {
    setSlashQuery(null);
    if (cmd === '/new') {
      handleNewConversation();
      return;
    }
    if (cmd === '/clear') {
      setMessages([]);
      setInputPrompt('');
      return;
    }
    if (cmd === '/autonomous') {
      setExecutionMode(executionMode === 'autonomous' ? 'single' : 'autonomous');
      setInputPrompt('');
      return;
    }
    if (cmd === '/apis') {
      (async () => {
        try {
          const res = await fetch('/api/universal-apis', {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            const apis = data.apis || [];
            const listStr = apis.length
              ? apis.map((a: any) => `- **${a.name}** (\`${a.baseUrl}\`) — Status: \`${a.status}\`, Endpoints: ${a.endpoints?.length || 0}`).join('\n')
              : 'No external APIs configured yet. Open **Universal API Manager** to add one.';
            addMessage({
              role: 'system',
              content: `🔌 **Connected Universal APIs (${apis.length}):**\n\n${listStr}`,
            });
          }
        } catch {
          addMessage({ role: 'system', content: 'Failed to retrieve connected APIs.' });
        }
      })();
      setInputPrompt('');
      return;
    }
    if (cmd === '/call-api') {
      setInputPrompt('@apis /call-api [API_ID] GET /endpoint');
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
    if (cmd === '/fix') {
      // Set role DEBUGGER and populate with diagnostics context
      setSelectedRole('DEBUGGER');
      if (onSelectRole) onSelectRole('DEBUGGER');
      addAttachment('@problems');
      setInputPrompt('Inspect the active compiler errors and diagnostics. For each issue, identify the root cause and propose the minimal correct fix with before/after code.');
      return;
    }
    if (cmd === '/test') {
      // Set role TESTER, attach active file
      setSelectedRole('TESTER');
      if (onSelectRole) onSelectRole('TESTER');
      if (activeTabPath) addAttachment(activeTabPath);
      setInputPrompt('Generate a comprehensive unit test suite for the attached file. Cover edge cases, error boundaries, and happy paths. Use the same test framework already in this project.');
      return;
    }
    if (cmd === '/plan') {
      // Set role ARCHITECT
      setSelectedRole('ARCHITECT');
      if (onSelectRole) onSelectRole('ARCHITECT');
      addAttachment('workspace-tree');
      setInputPrompt('Analyze the workspace structure and produce a detailed step-by-step implementation plan with component boundaries, data flows, API contracts, and task breakdown.');
      return;
    }
    if (cmd === '/help') {
      addMessage({
        role: 'system',
        content: `**NEXORA AI Command Reference:**\n\n- \`/new\`: Start a new conversation\n- \`/clear\`: Clear chat history\n- \`/autonomous\`: Toggle 7-agent chain mode\n- \`/fix\`: Propose compiler & lint error fixes (sets DEBUGGER role)\n- \`/test\`: Generate unit test suite (sets TESTER role)\n- \`/plan\`: Formulate architecture plan (sets ARCHITECT role)\n- \`/model\`: Switch LLM model\n- \`/agents\`: Switch engineering role\n- \`/apis\`: List connected Universal APIs\n- \`@workspace\`: Attach file tree\n- \`@file\`: Attach current file\n- \`@terminal\`: Attach recent terminal logs\n- \`@problems\`: Attach active diagnostics`,
      });
      setInputPrompt('');
      return;
    }

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
    } else if (tag === '@problems') {
      addAttachment('@problems');
    } else {
      addAttachment(tag);
    }

    const lastAt = inputPrompt.lastIndexOf('@');
    if (lastAt !== -1) {
      setInputPrompt(inputPrompt.slice(0, lastAt).trim());
    }
  };

  // Human Approval Resolution
  const handleApprovalDecision = async (approvalId: string, decision: 'APPROVE' | 'REJECT') => {
    if (!accessToken) return;
    try {
      const res = await fetch(`/api/agents/approvals/${approvalId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ decision }),
      });

      if (res.ok) {
        setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));
        addMessage({
          role: 'system',
          content: `🛡️ Human decision recorded: **${decision}** for approval \`${approvalId}\`. Agent execution resuming.`,
        });
      }
    } catch {}
  };

  // ─── New Conversation (creates backend record) ────────────────────────────
  const handleNewConversation = async () => {
    try {
      if (accessToken) {
        const res = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: 'New Conversation',
            modelId: selectedModel,
            provider: selectedProvider,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          resetChat();
          setCurrentConversationId(data.conversation.id);
          // Refresh conversation list
          const listRes = await fetch('/api/chat/conversations', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            setConversations(listData.conversations || []);
          }
          return;
        }
      }
    } catch {}
    // Fallback: just reset locally
    resetChat();
  };

  // ─── Welcome Tile Actions ─────────────────────────────────────────────────
  const handleWelcomeTile = async (
    role: string,
    prompt: string,
    extraAttachments?: string[]
  ) => {
    setSelectedRole(role);
    if (onSelectRole) onSelectRole(role);
    if (extraAttachments) {
      for (const att of extraAttachments) addAttachment(att);
    }
    // Trigger send with this prompt directly
    await sendMessage(prompt);
  };

  // ─── Core send logic (extracted so welcome tiles can call it) ────────────
  const sendMessage = async (promptText: string) => {
    if (!promptText.trim() || isStreaming) return;

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

    setIsStreaming(true);
    const controller = new AbortController();
    setAbortController(controller);

    // Resolve attachment content to real context strings
    let resolvedContext: string[] = [];
    if (attachments.length > 0) {
      try {
        resolvedContext = await resolveAttachmentContext(attachments);
      } catch {}
      clearAttachments();
    }

    // Build full prompt with context
    let fullPrompt = promptText;
    if (resolvedContext.length > 0) {
      fullPrompt = `${promptText}\n\n---\n**Attached Context:**\n\n${resolvedContext.join('\n\n')}`;
    }

    // If autonomous chain is active, run the full 7-agent engine
    if (executionMode === 'autonomous' && currentProjectId) {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: `🚀 **Initiating Autonomous 7-Agent Sequence**\n\n- Mode: **Autonomous Full Pipeline**\n- Project ID: \`${currentProjectId}\`\n- Architecture Chain: \`Architect → Developer → Tester → Debugger → Security → UI/UX → PM\`\n\n`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentRole: 'ARCHITECT',
      };
      addMessage(assistantMessage);

      try {
        const res = await fetch('/api/agents/runs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            projectId: currentProjectId,
            prompt: fullPrompt,
            agentRole: selectedRole,
            mode: 'autonomous',
            model: selectedModel,
            provider: selectedProvider,
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Agent run failed with status ${res.status}`);

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
                  const ev = JSON.parse(line.slice(6));
                  addActivityEvent(ev);

                  if (ev.type === 'agent_switch') {
                    updateLastMessage(`\n\n### 🤖 Agent: ${ev.agentName} (\`${ev.agent}\`)\n`);
                  } else if (ev.type === 'tool_complete') {
                    updateLastMessage(`\n- **[${ev.tool}]** ${ev.thought}\n  \`\`\`\n  ${(ev.output || '').slice(0, 150)}\n  \`\`\``);
                  } else if (ev.type === 'approval') {
                    setPendingApprovals((prev) => [
                      ...prev,
                      {
                        id: ev.approvalId,
                        action: ev.actionType,
                        target: ev.tool || 'Resource',
                        risk: ev.actionType === 'FILE_DELETE' ? 'high' : 'medium',
                        tool: ev.tool,
                        details: ev.details,
                        status: 'pending',
                      },
                    ]);
                  } else if (ev.type === 'run_complete') {
                    updateLastMessage(`\n\n✅ **Autonomous Sequence Completed** (${ev.stepCount} steps executed across 7 agents).`);
                  }
                } catch {}
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          updateLastMessage(`\n\n*[Autonomous execution interrupted: ${err.message}]*`);
        }
      } finally {
        setIsStreaming(false);
        setAbortController(null);
      }
      return;
    }

    // Standard streaming chat flow
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      agentRole: selectedRole,
    };
    addMessage(assistantMessage);

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
          content: fullPrompt,
          agentRole: selectedRole,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);

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

  // Send handler (called from textarea send button)
  const handleSend = async () => {
    await sendMessage(inputPrompt);
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

  // ─── Clear conversation (clears on backend if conversation exists) ─────
  const handleClearMessages = async () => {
    setMessages([]);
    if (currentConversationId && accessToken) {
      try {
        await fetch(`/api/chat/conversations/${currentConversationId}/clear`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch {}
    }
  };

  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const currentModel = availableModels.find((m) => m.id === selectedModel);
  const currentModelName = currentModel?.name || selectedModel || 'Select Model';

  return (
    <aside
      className={`h-full bg-[#171717] border-l border-[#2e2e2e] flex flex-col justify-between transition-all duration-200 z-30 select-none ${
        isMaximized ? 'w-[750px]' : 'w-[430px]'
      }`}
    >
      {/* 1. TOP HEADER */}
      <div className="h-11 bg-[#191919] border-b border-[#2e2e2e] px-3 flex items-center justify-between text-neutral-300">
        <div className="flex items-center gap-1.5">
          {/* Agent Role Badge */}
          <button
            onClick={() => setShowAgentPicker((prev) => !prev)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#222] hover:bg-[#2a2a2a] border border-[#333] text-xs font-medium text-neutral-200 transition-colors"
            title="Switch engineering agent role"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>{AGENT_ROLES.find((r) => r.id === selectedRole)?.icon} {selectedRole}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {/* Autonomous Mode Toggle */}
          <button
            onClick={() => setExecutionMode(executionMode === 'autonomous' ? 'single' : 'autonomous')}
            title={executionMode === 'autonomous' ? 'Autonomous chain active — click to switch to Single agent' : 'Single agent active — click to enable 7-agent autonomous chain'}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              executionMode === 'autonomous'
                ? 'bg-cyan-950/60 border-cyan-700/70 text-cyan-300'
                : 'bg-[#222] border-[#333] text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Workflow className="w-3 h-3 text-cyan-400" />
            <span>{executionMode === 'autonomous' ? '7-Agent Chain' : 'Single'}</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Activity Feed Toggle */}
          <button
            onClick={() => setShowActivityFeed((prev) => !prev)}
            title="Toggle Agent Activity Timeline"
            className={`p-1.5 rounded hover:bg-[#262626] text-neutral-400 hover:text-neutral-200 transition-colors ${
              showActivityFeed ? 'bg-[#2a2a2a] text-cyan-400' : ''
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => setShowSearchInput((prev) => !prev)}
            title="Search conversation history"
            className={`p-1.5 rounded hover:bg-[#262626] text-neutral-400 hover:text-neutral-200 transition-colors ${
              showSearchInput ? 'bg-[#2a2a2a] text-cyan-400' : ''
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* New Chat Button — creates backend record */}
          <button
            onClick={handleNewConversation}
            title="New Conversation (creates persistent thread)"
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

          {/* Options Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu((prev) => !prev)}
              title="More options"
              className="p-1.5 rounded hover:bg-[#262626] text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showOptionsMenu && (
              <div className="absolute right-0 top-8 w-52 bg-[#202020] border border-[#333] rounded-lg shadow-xl py-1 text-xs z-50">
                <button
                  onClick={() => { handleNewConversation(); setShowOptionsMenu(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2a2a2a] flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> New Conversation
                </button>
                <button
                  onClick={() => { handleClearMessages(); setShowOptionsMenu(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2a2a2a] text-red-400 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Messages
                </button>
                <div className="border-t border-[#303030] my-1" />
                <button
                  onClick={() => { setShowModelPicker(true); setShowOptionsMenu(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2a2a2a] flex items-center gap-2"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Switch Model
                </button>
                <button
                  onClick={() => { fetchModels(); setShowOptionsMenu(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2a2a2a] flex items-center gap-2 text-cyan-400"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Models
                </button>
                {onClose && (
                  <button
                    onClick={() => { setShowOptionsMenu(false); onClose(); }}
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

      {/* Search Input Bar */}
      {showSearchInput && (
        <div className="p-2 border-b border-[#2e2e2e] bg-[#1a1a1a]">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search chat messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-[#141414] border border-[#303030] rounded pl-8 pr-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      )}

      {/* Human Approval Required Banner */}
      {pendingApprovals.length > 0 && (
        <div className="p-2.5 bg-amber-950/40 border-b border-amber-800/60 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-amber-300 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Human Approval Required ({pendingApprovals.length})</span>
          </div>
          {pendingApprovals.map((app) => (
            <div key={app.id} className="p-2 bg-[#1a1510] border border-amber-900/50 rounded flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="font-mono text-[10px] text-amber-400">{app.action}</span>
                <span className="text-neutral-300 text-[11px] block truncate">{app.target}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleApprovalDecision(app.id, 'APPROVE')}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-medium"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleApprovalDecision(app.id, 'REJECT')}
                  className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-medium"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity Timeline Overlay */}
      {showActivityFeed && recentActivities.length > 0 && (
        <div className="p-2 border-b border-[#2c2c2c] bg-[#161616] max-h-48 overflow-y-auto space-y-1 text-[11px]">
          <div className="flex items-center justify-between pb-1 text-[10px] font-semibold text-neutral-400 uppercase">
            <span>Agent Activity Stream</span>
            <span className="text-cyan-400">{recentActivities.length} events</span>
          </div>
          {recentActivities.map((act, i) => (
            <div key={i} className="p-1.5 rounded bg-[#1c1c1c] border border-[#282828] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 truncate">
                <Bot className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="font-semibold text-neutral-200">{act.agent || 'SYSTEM'}</span>
                <span className="text-neutral-400 truncate">{act.tool || act.thought || act.type}</span>
              </div>
              <span className="text-[9px] font-mono text-neutral-500 shrink-0">
                {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'now'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Activity Timeline empty state */}
      {showActivityFeed && recentActivities.length === 0 && (
        <div className="p-3 border-b border-[#2c2c2c] bg-[#161616] text-[11px] text-neutral-500 text-center">
          No agent activity yet. Start an autonomous run to see events here.
        </div>
      )}

      {/* 2. CONVERSATION FEED (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {displayedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <Sparkles className="w-8 h-8 mb-3 text-cyan-400 opacity-60" />
            <h4 className="text-sm font-semibold text-neutral-300 mb-1">
              NEXORA Autonomous Agent System
            </h4>
            <p className="text-xs text-neutral-400 max-w-xs mb-4">
              7 specialized agents (Architect, Developer, Tester, Debugger, Security, UI/UX, PM). Ready for autonomous full-lifecycle development.
            </p>
            <div className="grid grid-cols-2 gap-2 text-left w-full max-w-sm">
              <button
                onClick={() =>
                  handleWelcomeTile(
                    'ARCHITECT',
                    'Analyze the workspace structure and produce a detailed step-by-step implementation plan with component boundaries, data flows, API contracts, and task breakdown.',
                    ['workspace-tree']
                  )
                }
                disabled={isStreaming}
                className="p-2 bg-[#1f1f1f] hover:bg-[#252525] border border-[#2e2e2e] rounded text-[11px] text-neutral-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                📐 Plan Fullstack Flow
              </button>
              <button
                onClick={() =>
                  handleWelcomeTile(
                    'DEBUGGER',
                    'Inspect the active compiler errors and diagnostics. For each issue, identify the root cause and propose the minimal correct fix with before/after code.',
                    ['@problems', activeTabPath || 'workspace-tree']
                  )
                }
                disabled={isStreaming}
                className="p-2 bg-[#1f1f1f] hover:bg-[#252525] border border-[#2e2e2e] rounded text-[11px] text-neutral-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                🛠️ Fix Type Errors
              </button>
              <button
                onClick={() =>
                  handleWelcomeTile(
                    'TESTER',
                    'Generate a comprehensive unit test suite for the attached file. Cover edge cases, error boundaries, and happy paths. Use the same test framework already in this project.',
                    activeTabPath ? [activeTabPath] : []
                  )
                }
                disabled={isStreaming}
                className="p-2 bg-[#1f1f1f] hover:bg-[#252525] border border-[#2e2e2e] rounded text-[11px] text-neutral-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                🧪 Generate Unit Tests
              </button>
              <button
                onClick={() =>
                  handleWelcomeTile(
                    'SECURITY',
                    'Perform a thorough security audit of this workspace. Check for hardcoded secrets, injection vectors, insecure dependencies, authentication flaws, and OWASP Top-10 vulnerabilities.',
                    ['workspace-tree']
                  )
                }
                disabled={isStreaming}
                className="p-2 bg-[#1f1f1f] hover:bg-[#252525] border border-[#2e2e2e] rounded text-[11px] text-neutral-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                🛡️ Security Audit
              </button>
            </div>
          </div>
        ) : (
          displayedMessages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';
            return (
              <div
                key={idx}
                className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'}`}
              >
                {/* Author & Timestamp */}
                <div className="flex items-center gap-2 mb-1 px-1 text-[10px] text-neutral-500">
                  <span className="font-semibold text-neutral-400">
                    {isUser ? 'You' : isSystem ? '⚙ System' : `${msg.agentRole || selectedRole} Agent`}
                  </span>
                  <span>{msg.timestamp || 'Just now'}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[95%] rounded-lg p-3 relative leading-relaxed ${
                    isUser
                      ? 'bg-[#262626] text-neutral-100 border border-[#333]'
                      : isSystem
                      ? 'bg-[#1a1f1a] text-neutral-300 border border-[#2a3a2a] w-full'
                      : 'bg-[#1b1b1b] text-neutral-200 border border-[#282828] w-full'
                  }`}
                >
                  {/* Content with Code block formatting */}
                  <div className="whitespace-pre-wrap break-words font-sans">
                    {msg.content.includes('```') ? (
                      msg.content.split('```').map((part, pIdx) => {
                        if (pIdx % 2 === 1) {
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
              {att.length > 24 ? `...${att.slice(-20)}` : att}
              <button onClick={() => removeAttachment(att)} className="hover:text-red-400">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 5. SMART MESSAGE INPUT BOX */}
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
            placeholder={
              executionMode === 'autonomous'
                ? 'Autonomous chain active. Enter requirement to run all 7 agents...'
                : 'Ask anything, @ to mention context, / for actions...'
            }
            className="w-full bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none resize-none min-h-[44px]"
          />

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-[#292929] text-xs">
            <div className="flex items-center gap-1.5">
              {/* Attachment Button (+) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAttachMenu((prev) => !prev)}
                  title="Add context or file attachment"
                  className="p-1 rounded hover:bg-[#2c2c2c] text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>

                {showAttachMenu && (
                  <div className="absolute left-0 bottom-8 w-52 bg-[#222] border border-[#333] rounded-lg shadow-xl py-1 text-xs z-50">
                    <button
                      onClick={() => {
                        if (activeTabPath) addAttachment(activeTabPath);
                        else addMessage({ role: 'system', content: 'No active editor file open.' });
                        setShowAttachMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#2b2b2b] flex items-center gap-2 text-neutral-200"
                    >
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" /> Current File
                      {activeTabPath && <span className="text-neutral-500 truncate text-[9px] ml-auto">{activeTabPath.split(/[\\/]/).pop()}</span>}
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
                    <button
                      onClick={() => {
                        addAttachment('@problems');
                        setShowAttachMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#2b2b2b] flex items-center gap-2 text-neutral-200"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Active Diagnostics
                    </button>
                  </div>
                )}
              </div>

              {/* Model Selector Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModelPicker((prev) => !prev)}
                  className="px-2 py-0.5 rounded bg-[#282828] hover:bg-[#303030] text-[11px] text-neutral-300 font-medium flex items-center gap-1 transition-colors max-w-[150px] truncate"
                  title={currentModelName}
                >
                  {modelsLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                  ) : modelsError ? (
                    <WifiOff className="w-3 h-3 text-red-400" />
                  ) : null}
                  <span className="truncate">{currentModelName}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                </button>

                {showModelPicker && (
                  <div className="absolute left-0 bottom-8 w-72 bg-[#222] border border-[#333] rounded-lg shadow-xl p-1 text-xs z-50 max-h-64 overflow-y-auto">
                    <div className="px-2 py-1 text-[10px] text-neutral-400 font-semibold uppercase flex items-center justify-between">
                      <span>Select LLM Provider &amp; Model</span>
                      <button
                        onClick={fetchModels}
                        disabled={modelsLoading}
                        title="Refresh model list from connected providers"
                        className="text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${modelsLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {modelsError && (
                      <div className="px-2 py-1.5 text-red-400 text-[10px] flex items-center gap-1">
                        <WifiOff className="w-3 h-3" /> {modelsError}
                      </div>
                    )}

                    {availableModels.length === 0 && !modelsLoading && (
                      <div className="px-2 py-2 text-neutral-500 text-[11px]">
                        No providers connected. Add an API key in <strong>AI Providers</strong>.
                      </div>
                    )}

                    {availableModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setSelectedProvider(m.providerType);
                          setShowModelPicker(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition-colors ${
                          selectedModel === m.id
                            ? 'bg-cyan-950/60 text-cyan-300'
                            : 'hover:bg-[#2c2c2c] text-neutral-200'
                        }`}
                      >
                        <span className="truncate">{m.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 ml-2 ${
                            m.badge?.includes('SIMULATED')
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-[#181818] text-neutral-400'
                          }`}
                        >
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

      {/* Agent Selector Dropdown */}
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
                    <span className="flex items-center gap-1.5">
                      <span>{r.icon}</span> {r.name}
                    </span>
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
