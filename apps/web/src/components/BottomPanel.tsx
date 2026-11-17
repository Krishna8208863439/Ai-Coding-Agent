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
  Info,
  Bug,
} from 'lucide-react';
import { useIdeStore } from '../store/ideStore';

interface BottomPanelProps {
  onClose?: () => void;
  terminalLogs?: string[];
  problemsCount?: number;
  onOpenProblemFile?: (file: string) => void;
}

export function BottomPanel({
  onClose,
  terminalLogs = [
    'NEXORA AI Sandbox Environment Ready.',
    'Docker isolated container status: active (Node.js 20 & Python 3.12).',
    'Listening on workspace: c:\\Project\\NEXORA AI\\sandbox-workspaces',
    'TypeScript language service connected (0 compile errors).',
  ],
  onOpenProblemFile,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'output' | 'problems' | 'debug'>(
    'terminal'
  );
  const [commandInput, setCommandInput] = useState('');
  const [logs, setLogs] = useState<string[]>(terminalLogs);
  const { diagnostics } = useIdeStore();

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

  const clearCurrentTab = () => {
    if (activeTab === 'terminal') setLogs([]);
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
            <AlertTriangle className="w-3.5 h-3.5" /> Problems
            <span className="ml-1 px-1.5 py-0.2 bg-[#2a2a2a] rounded-full text-[10px] text-neutral-300">
              {diagnostics.length}
            </span>
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
            <Bug className="w-3.5 h-3.5" /> Debug Console
          </button>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 text-neutral-400">
          <button
            onClick={clearCurrentTab}
            title="Clear Panel"
            className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Panel"
              className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] bg-[#141414] text-neutral-300">
        {activeTab === 'terminal' && (
          <div className="flex flex-col h-full justify-between">
            <div className="space-y-1 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-neutral-300">
                  {log.startsWith('$') ? (
                    <span className="text-cyan-400 font-bold">{log}</span>
                  ) : (
                    log
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={handleCommandSubmit} className="mt-2 flex items-center gap-2">
              <span className="text-cyan-400 font-bold">$</span>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Type terminal command (e.g. npm test, pnpm run build)..."
                className="w-full bg-transparent text-neutral-100 placeholder-neutral-600 focus:outline-none"
              />
            </form>
          </div>
        )}

        {activeTab === 'problems' && (
          <div className="space-y-2">
            {diagnostics.length === 0 ? (
              <div className="text-neutral-500 py-4 text-center font-sans">
                No problems have been detected in the workspace.
              </div>
            ) : (
              diagnostics.map((diag, i) => (
                <div
                  key={i}
                  onClick={() => onOpenProblemFile && onOpenProblemFile(diag.file)}
                  className="flex items-center gap-2 p-1.5 hover:bg-[#202020] rounded cursor-pointer transition-colors"
                >
                  {diag.severity === 'error' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  ) : diag.severity === 'warning' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span className="text-neutral-200">{diag.message}</span>
                  <span className="text-neutral-500 text-[10px]">
                    {diag.file} [{diag.line}, {diag.col}]
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'output' && (
          <div className="space-y-1 text-neutral-400">
            <div>[NEXORA Build Output] Initialized Vite compiler service.</div>
            <div>[NEXORA Build Output] Monaco Language Client: TypeScript / JavaScript v5.9 ready.</div>
            <div>[NEXORA Workspace] Ready for autonomous multi-agent engineering workflows.</div>
          </div>
        )}

        {activeTab === 'debug' && (
          <div className="text-neutral-500 py-4 text-center font-sans">
            Debug session idle. Start debugging via Run menu (F5) to attach runtime traces.
          </div>
        )}
      </div>
    </div>
  );
}
