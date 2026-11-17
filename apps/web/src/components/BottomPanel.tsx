import React, { useState } from 'react';
import {
  Terminal,
  AlertTriangle,
  PlayCircle,
  FileText,
  X,
  Maximize2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

interface BottomPanelProps {
  onClose?: () => void;
  terminalLogs?: string[];
  problemsCount?: number;
}

export function BottomPanel({
  onClose,
  terminalLogs = [
    'NEXORA AI Sandbox Environment Ready.',
    'Docker isolated container status: active (Node.js 20 & Python 3.12).',
    'Listening on workspace: c:\\Project\\NEXORA AI\\sandbox-workspaces',
    'No lint or compile diagnostics reported.',
  ],
  problemsCount = 0,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'output' | 'problems' | 'debug'>(
    'terminal'
  );
  const [commandInput, setCommandInput] = useState('');
  const [logs, setLogs] = useState<string[]>(terminalLogs);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    setLogs((prev) => [
      ...prev,
      `$ ${commandInput.trim()}`,
      `[NEXORA Sandbox]: Command executed in isolated workspace.`,
    ]);
    setCommandInput('');
  };

  return (
    <div className="h-56 bg-[#181818] border-t border-[#2d2d2d] flex flex-col select-none text-xs z-30">
      {/* Tab Header */}
      <div className="h-8 bg-[#1f1f1f] border-b border-[#2d2d2d] flex items-center justify-between px-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1 flex items-center gap-1.5 font-medium transition-colors ${
              activeTab === 'terminal'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Terminal
          </button>

          <button
            onClick={() => setActiveTab('problems')}
            className={`px-3 py-1 flex items-center gap-1.5 font-medium transition-colors ${
              activeTab === 'problems'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Problems ({problemsCount})
          </button>

          <button
            onClick={() => setActiveTab('output')}
            className={`px-3 py-1 flex items-center gap-1.5 font-medium transition-colors ${
              activeTab === 'output'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Output
          </button>

          <button
            onClick={() => setActiveTab('debug')}
            className={`px-3 py-1 flex items-center gap-1.5 font-medium transition-colors ${
              activeTab === 'debug'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" /> Debug Console
          </button>
        </div>

        <div className="flex items-center gap-1 text-neutral-400">
          <button
            onClick={() => setLogs([])}
            title="Clear Console"
            className="p-1 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close Panel"
            className="p-1 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] text-neutral-300 space-y-1 bg-[#141414]">
        {activeTab === 'terminal' && (
          <div className="space-y-1">
            {logs.map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap leading-relaxed select-text">
                {log}
              </div>
            ))}
            <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 pt-1">
              <span className="text-cyan-400 font-bold">$</span>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="npm test, python app.py, ls..."
                className="flex-1 bg-transparent border-none text-white focus:outline-none font-mono text-[11px]"
              />
            </form>
          </div>
        )}

        {activeTab === 'problems' && (
          <div className="flex items-center gap-2 text-neutral-400 py-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>No problems have been detected in the current workspace.</span>
          </div>
        )}

        {activeTab === 'output' && (
          <div className="text-neutral-400">
            [Tasks Runner]: Monorepo build and lint tasks idle.
          </div>
        )}

        {activeTab === 'debug' && (
          <div className="text-neutral-400">
            [Debug]: No active debugging sessions. Press F5 to attach debugger.
          </div>
        )}
      </div>
    </div>
  );
}
