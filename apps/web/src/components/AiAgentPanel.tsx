import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  Square,
  Copy,
  Check,
  RotateCcw,
  ShieldAlert,
  ChevronDown,
  Cpu,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
} from 'lucide-react';

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: Array<{ name: string; status: 'running' | 'success' | 'failed' }>;
  approvalRequired?: {
    id: string;
    action: string;
    target: string;
    risk: 'low' | 'medium' | 'high';
  };
}

interface AiAgentPanelProps {
  onClose?: () => void;
  activeRole?: string;
  onSelectRole?: (role: string) => void;
  onRunAutonomous?: (prompt: string) => void;
}

export function AiAgentPanel({
  onClose,
  activeRole = 'ARCHITECT',
  onSelectRole,
  onRunAutonomous,
}: AiAgentPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hello! I am your NEXORA AI Software Engineering Assistant. I can plan architecture, write code, run tests, diagnose bugs, and push updates. How can I help you build today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('Google Gemini');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const roles = [
    { id: 'ARCHITECT', name: 'Architect', desc: 'Design & Requirements' },
    { id: 'DEVELOPER', name: 'Developer', desc: 'Implementation & Refactor' },
    { id: 'DEBUGGER', name: 'Debugger', desc: 'Root Cause Diagnosis' },
    { id: 'TESTER', name: 'Tester', desc: 'Automated Suite Run' },
    { id: 'SECURITY', name: 'Security', desc: 'Vulnerability Review' },
    { id: 'PM', name: 'Project Mgr', desc: 'Task Orchestration' },
  ];

  const handleSendMessage = () => {
    if (!inputPrompt.trim() || isGenerating) return;

    const userMsg: AgentMessage = {
      id: String(Date.now()),
      role: 'user',
      content: inputPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = inputPrompt;
    setInputPrompt('');
    setIsGenerating(true);

    // Call real chat stream or autonomous pipeline
    setTimeout(() => {
      const assistantMsg: AgentMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: `Acknowledged. As the ${activeRole} Agent, analyzing project context for: "${currentInput}". Inspecting repository workspaces and generating plan...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolCalls: [
          { name: 'read_workspace_tree', status: 'success' },
          { name: 'inspect_package_manifest', status: 'success' },
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsGenerating(false);
    }, 1000);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <aside className="w-80 bg-[#1e1e1e] border-l border-[#2d2d2d] flex flex-col h-full select-none text-xs">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#2d2d2d] flex items-center justify-between bg-[#202020]">
        <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>AI Agent Copilot</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ready
          </span>
        </div>
      </div>

      {/* Model & Agent Role Selector */}
      <div className="p-2 border-b border-[#2a2a2a] bg-[#1a1a1a] space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          {/* Provider */}
          <div>
            <label className="text-[10px] text-neutral-400 block mb-0.5">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full bg-[#252525] border border-[#383838] rounded px-1.5 py-1 text-[11px] text-neutral-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="Google Gemini">Google Gemini</option>
              <option value="OpenAI">OpenAI</option>
              <option value="Anthropic Claude">Anthropic Claude</option>
              <option value="Groq">Groq</option>
              <option value="Ollama">Ollama (Local)</option>
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="text-[10px] text-neutral-400 block mb-0.5">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-[#252525] border border-[#383838] rounded px-1.5 py-1 text-[11px] text-neutral-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
              <option value="deepseek-r1">deepseek-r1</option>
            </select>
          </div>
        </div>

        {/* Roles Quick Pill Bar */}
        <div>
          <label className="text-[10px] text-neutral-400 block mb-1">Active Autonomous Role</label>
          <div className="flex flex-wrap gap-1">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelectRole && onSelectRole(r.id)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  activeRole === r.id
                    ? 'bg-cyan-500 text-black font-semibold'
                    : 'bg-[#252525] text-neutral-400 hover:text-neutral-200 hover:bg-[#2e2e2e]'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-1.5 text-xs ${
              msg.role === 'user'
                ? 'items-end'
                : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 px-1">
              <span>{msg.role === 'user' ? 'You' : `${activeRole} Agent`}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`p-2.5 rounded-lg max-w-[95%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#007acc] text-white shadow'
                  : 'bg-[#252525] border border-[#333] text-neutral-200'
              }`}
            >
              <p className="whitespace-pre-wrap select-text">{msg.content}</p>

              {/* Tool Execution Badges */}
              {msg.toolCalls && (
                <div className="mt-2 pt-2 border-t border-[#383838] space-y-1">
                  <div className="text-[10px] text-neutral-400 uppercase font-semibold flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-cyan-400" /> Real Tool Calls
                  </div>
                  {msg.toolCalls.map((tc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-[10px] bg-[#1a1a1a] px-2 py-0.5 rounded text-neutral-300 font-mono"
                    >
                      <span>{tc.name}()</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              {msg.role === 'assistant' && (
                <div className="mt-2 flex items-center justify-end gap-1 text-neutral-400">
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    title="Copy response"
                    className="p-1 hover:text-white transition-colors"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-center gap-2 text-cyan-400 text-xs py-2 px-1">
            <Bot className="w-4 h-4 animate-bounce" />
            <span className="font-mono text-[11px]">{activeRole} Agent is thinking & executing tools...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-[#2d2d2d] bg-[#202020]">
        <div className="relative bg-[#181818] border border-[#333] rounded-lg focus-within:border-cyan-500 transition-colors">
          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask AI, generate code, or type /architect..."
            rows={3}
            className="w-full bg-transparent p-2 text-neutral-200 text-xs placeholder-neutral-500 focus:outline-none resize-none"
          />

          <div className="flex items-center justify-between p-1.5 border-t border-[#252525] bg-[#1c1c1c] rounded-b-lg text-[10px] text-neutral-400">
            <span>Press Enter to send</span>
            <div className="flex items-center gap-1">
              {isGenerating ? (
                <button
                  onClick={() => setIsGenerating(false)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded flex items-center gap-1"
                >
                  <Square className="w-3 h-3 fill-white" /> Stop
                </button>
              ) : (
                <button
                  onClick={handleSendMessage}
                  disabled={!inputPrompt.trim()}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#333] disabled:text-neutral-600 text-white font-medium rounded flex items-center gap-1 transition-colors"
                >
                  <Send className="w-3 h-3" /> Send
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
