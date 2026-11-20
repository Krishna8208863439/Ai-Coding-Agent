import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  AlertTriangle,
  FileText,
  X,
  Trash2,
  Bug,
  Play,
  Square,
  Globe,
  RotateCw,
  ExternalLink,
  Laptop,
  Tablet,
  Smartphone,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { useIdeStore } from '../store/ideStore';
import { useAuthStore } from '../store/authStore';
import { useLayoutStore } from '../store/layoutStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { usePreferencesStore } from '../store/preferencesStore';

interface BottomPanelProps {
  onClose?: () => void;
  terminalLogs?: string[];
  problemsCount?: number;
  onOpenProblemFile?: (file: string) => void;
}

interface TerminalSession {
  id: string;
  name: string;
  logs: string[];
}

export function BottomPanel({
  onClose,
  terminalLogs = [
    'NEXORA AI Workspace Shell Ready.',
    'Local runtime execution sandbox.',
  ],
  onOpenProblemFile,
}: BottomPanelProps) {
  const { diagnostics, currentProjectId } = useIdeStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { accessToken } = useAuthStore();
  const { addToast } = usePreferencesStore();
  const { activeBottomPanelTab: activeTab, setActiveBottomPanelTab: setActiveTab } = useLayoutStore();

  // Multi-terminal sessions
  const [sessions, setSessions] = useState<TerminalSession[]>([
    { id: 'term-1', name: '1: bash', logs: [...terminalLogs] },
  ]);
  const [activeSessionId, setActiveSessionId] = useState('term-1');

  // Input & Execution
  const [commandInput, setCommandInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  // Live Preview
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewUrl, setPreviewUrl] = useState('http://localhost:3000');
  const [isAppRunning, setIsAppRunning] = useState(false);
  const [appPort, setAppPort] = useState(3000);
  const [isLoadingApp, setIsLoadingApp] = useState(false);

  // Debug Console evaluate
  const [debugInput, setDebugInput] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([
    'NEXORA Debugger connected to Node.js v22.23.2 runtime.',
  ]);

  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.logs]);

  // Append log to active session
  const appendLog = (log: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, logs: [...s.logs, log] } : s))
    );
  };

  // Check running process status on mount or project/workspace switch
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const rootParam = currentWorkspace ? `root=${encodeURIComponent(currentWorkspace.rootPath)}` : '';
        const projParam = currentProjectId ? `projectId=${encodeURIComponent(currentProjectId)}` : '';
        const query = rootParam || projParam;
        if (!query) return;

        const res = await fetch(`/api/terminal/process?${query}`, {
          headers: { Authorization: `Bearer ${accessToken || 'dev'}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.process && data.process.status === 'RUNNING') {
            setIsAppRunning(true);
            setAppPort(data.process.port);
            setPreviewUrl(data.process.previewUrl);
          } else {
            setIsAppRunning(false);
          }
        }
      } catch {}
    };

    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [currentProjectId, currentWorkspace, accessToken]);

  // Listen for global custom events from Phase 3 commands
  useEffect(() => {
    const handleNewTerminal = () => {
      const newId = `term-${Date.now()}`;
      const count = sessions.length + 1;
      setSessions((prev) => [
        ...prev,
        { id: newId, name: `${count}: bash`, logs: [`Session ${count} initialized.`] },
      ]);
      setActiveSessionId(newId);
    };

    const handleClearTerminal = () => {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, logs: [] } : s))
      );
    };

    const handleRunText = (e: any) => {
      const text = e.detail?.text || window.getSelection()?.toString();
      if (text) {
        handleExecuteString(text);
      }
    };

    const handleRunStart = () => {
      handleStartApp();
    };

    const handleRunStop = () => {
      handleStopApp();
    };

    window.addEventListener('nexora:terminal:new', handleNewTerminal);
    window.addEventListener('nexora:terminal:clear', handleClearTerminal);
    window.addEventListener('nexora:terminal:runSelectedText', handleRunText);
    window.addEventListener('nexora:run:start', handleRunStart);
    window.addEventListener('nexora:run:stop', handleRunStop);
    window.addEventListener('nexora:debug:start', handleRunStart);

    return () => {
      window.removeEventListener('nexora:terminal:new', handleNewTerminal);
      window.removeEventListener('nexora:terminal:clear', handleClearTerminal);
      window.removeEventListener('nexora:terminal:runSelectedText', handleRunText);
      window.removeEventListener('nexora:run:start', handleRunStart);
      window.removeEventListener('nexora:run:stop', handleRunStop);
      window.removeEventListener('nexora:debug:start', handleRunStart);
    };
  }, [sessions, activeSessionId, currentWorkspace]);

  // Execute terminal command string
  const handleExecuteString = async (cmdString: string) => {
    const cmd = cmdString.trim();
    if (!cmd) return;

    appendLog(`$ ${cmd}`);
    setHistory((prev) => [...prev, cmd]);
    setHistoryIndex(null);
    setIsExecuting(true);

    try {
      const payload: any = { command: cmd };
      if (currentWorkspace) {
        payload.root = currentWorkspace.rootPath;
      } else if (currentProjectId) {
        payload.projectId = currentProjectId;
      } else {
        appendLog('[Error]: No folder or project workspace active. Please open a folder.');
        return;
      }

      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken || 'dev'}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.result) {
        if (data.result.stdout) {
          appendLog(data.result.stdout.trim());
        }
        if (data.result.stderr) {
          appendLog(`[stderr]: ${data.result.stderr.trim()}`);
        }
        appendLog(`[Process exited with code ${data.result.exitCode} (${data.result.durationMs}ms)]`);
      } else {
        appendLog(`[Execution error]: ${data.message || data.error || 'Command failed'}`);
      }
    } catch (err: unknown) {
      appendLog(`[Terminal error]: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || isExecuting) return;
    const cmd = commandInput.trim();
    setCommandInput('');
    await handleExecuteString(cmd);
  };

  // Keyboard navigation for command history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCommandInput(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(null);
        setCommandInput('');
      } else {
        setHistoryIndex(nextIndex);
        setCommandInput(history[nextIndex]);
      }
    }
  };

  // App Dev Server Process Control
  const handleStartApp = async () => {
    setIsLoadingApp(true);
    try {
      const payload: any = { command: 'npm run dev', port: appPort };
      if (currentWorkspace) payload.root = currentWorkspace.rootPath;
      else if (currentProjectId) payload.projectId = currentProjectId;
      else return;

      const res = await fetch('/api/terminal/process/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken || 'dev'}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.process) {
        setIsAppRunning(true);
        setPreviewUrl(data.process.previewUrl);
        appendLog(`[Live Preview]: Application running at ${data.process.previewUrl}`);
      } else {
        appendLog(`[Process error]: ${data.message || data.error || 'Failed to start process'}`);
      }
    } catch (err: any) {
      appendLog(`[Process error]: ${err.message}`);
    } finally {
      setIsLoadingApp(false);
    }
  };

  const handleStopApp = async () => {
    try {
      const payload: any = {};
      if (currentWorkspace) payload.root = currentWorkspace.rootPath;
      else if (currentProjectId) payload.projectId = currentProjectId;
      else return;

      await fetch('/api/terminal/process/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken || 'dev'}`,
        },
        body: JSON.stringify(payload),
      });
      setIsAppRunning(false);
      appendLog('[Live Preview]: Dev server stopped.');
    } catch {}
  };

  // Debug Console evaluate
  const handleDebugEvaluate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debugInput.trim()) return;
    const expr = debugInput.trim();
    setDebugLogs((prev) => [...prev, `> ${expr}`]);
    setDebugInput('');

    try {
      // Evaluate safe expression
      // eslint-disable-next-line no-eval
      const result = eval(expr);
      setDebugLogs((prev) => [...prev, String(result)]);
    } catch (err: any) {
      setDebugLogs((prev) => [...prev, `Uncaught ${err.message}`]);
    }
  };

  return (
    <div className="h-64 border-t border-[#1e1e1e] bg-[#1e1e1e] text-neutral-300 flex flex-col z-40 select-none">
      {/* Tab Navigation Header */}
      <div className="h-9 border-b border-[#2d2d2d] bg-[#252526] flex items-center justify-between px-3">
        <div className="flex items-center gap-1 h-full">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 px-3 h-full text-xs font-medium border-t-2 transition-colors ${
              activeTab === 'terminal'
                ? 'border-cyan-500 bg-[#1e1e1e] text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-3 h-full text-xs font-medium border-t-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-cyan-500 bg-[#1e1e1e] text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Live Preview</span>
            {isAppRunning && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          <button
            onClick={() => setActiveTab('problems')}
            className={`flex items-center gap-2 px-3 h-full text-xs font-medium border-t-2 transition-colors ${
              activeTab === 'problems'
                ? 'border-cyan-500 bg-[#1e1e1e] text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Problems ({diagnostics.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center gap-2 px-3 h-full text-xs font-medium border-t-2 transition-colors ${
              activeTab === 'output'
                ? 'border-cyan-500 bg-[#1e1e1e] text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Output</span>
          </button>

          <button
            onClick={() => setActiveTab('debug')}
            className={`flex items-center gap-2 px-3 h-full text-xs font-medium border-t-2 transition-colors ${
              activeTab === 'debug'
                ? 'border-cyan-500 bg-[#1e1e1e] text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Debug Console</span>
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {activeTab === 'terminal' && (
            <>
              {/* Terminal session pills */}
              <div className="flex items-center gap-1 mr-2">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      s.id === activeSessionId
                        ? 'bg-[#333] text-cyan-400 font-semibold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const newId = `term-${Date.now()}`;
                    const count = sessions.length + 1;
                    setSessions((prev) => [
                      ...prev,
                      { id: newId, name: `${count}: bash`, logs: [`Session ${count} ready.`] },
                    ]);
                    setActiveSessionId(newId);
                  }}
                  title="New Terminal"
                  className="p-1 hover:bg-[#333] rounded text-neutral-400 hover:text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => {
                  setSessions((prev) =>
                    prev.map((s) => (s.id === activeSessionId ? { ...s, logs: [] } : s))
                  );
                }}
                title="Clear Terminal"
                className="p-1 hover:bg-[#333333] rounded text-neutral-400 hover:text-white"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {onClose && (
            <button
              onClick={onClose}
              title="Close Panel"
              className="p-1 hover:bg-[#333333] rounded text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 overflow-hidden relative">
        {/* 1. Terminal Tab */}
        {activeTab === 'terminal' && (
          <div className="h-full flex flex-col p-2 font-mono text-[11px] leading-relaxed select-text">
            <div className="flex-1 overflow-y-auto space-y-1">
              {activeSession.logs.map((log, index) => (
                <div
                  key={index}
                  className={`${
                    log.startsWith('$')
                      ? 'text-cyan-400 font-semibold'
                      : log.startsWith('[Error]') || log.startsWith('[stderr]')
                      ? 'text-rose-400'
                      : log.startsWith('[Process')
                      ? 'text-emerald-400'
                      : 'text-neutral-300'
                  }`}
                >
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            <form onSubmit={handleRunCommand} className="mt-2 flex items-center gap-2 border-t border-[#2d2d2d] pt-1">
              <span className="text-emerald-400 font-bold">$</span>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isExecuting}
                placeholder="npm test, git status, dir, node -v..."
                className="flex-1 bg-transparent border-none outline-none text-neutral-100 placeholder-neutral-500 font-mono text-xs"
              />
              {isExecuting && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
            </form>
          </div>
        )}

        {/* 2. Live Preview Tab */}
        {activeTab === 'preview' && (
          <div className="h-full flex flex-col bg-[#141414]">
            {/* Toolbar */}
            <div className="h-8 border-b border-[#2d2d2d] bg-[#1a1a1a] flex items-center justify-between px-3 text-xs">
              <div className="flex items-center gap-2">
                {isAppRunning ? (
                  <button
                    onClick={handleStopApp}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 text-xs font-medium"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartApp}
                    disabled={isLoadingApp}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-xs font-medium disabled:opacity-50"
                  >
                    {isLoadingApp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>Start Server</span>
                  </button>
                )}

                <div className="h-4 w-[1px] bg-neutral-700" />

                <div className="flex items-center gap-1 bg-[#141414] px-2 py-0.5 rounded border border-[#2d2d2d] text-neutral-400 font-mono text-[10px]">
                  <span>{previewUrl}</span>
                </div>

                <button
                  onClick={() => {
                    if (iframeRef.current) {
                      iframeRef.current.src = previewUrl;
                    }
                  }}
                  title="Reload Preview"
                  className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              </div>

              {/* Responsive Device Modes */}
              <div className="flex items-center gap-1 bg-[#141414] p-0.5 rounded border border-[#2d2d2d]">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-[#2a2a2a] text-white' : 'text-neutral-500 hover:text-white'}`}
                  title="Desktop View"
                >
                  <Laptop className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1 rounded ${previewDevice === 'tablet' ? 'bg-[#2a2a2a] text-white' : 'text-neutral-500 hover:text-white'}`}
                  title="Tablet View (768px)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-[#2a2a2a] text-white' : 'text-neutral-500 hover:text-white'}`}
                  title="Mobile View (375px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Iframe Viewport */}
            <div className="flex-1 flex items-center justify-center p-2 overflow-auto bg-[#0d0f17]">
              {isAppRunning ? (
                <div
                  className="h-full bg-white rounded shadow-2xl transition-all duration-200 overflow-hidden"
                  style={{
                    width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '375px',
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title="NEXORA Application Sandbox Live Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              ) : (
                <div className="text-center text-neutral-500">
                  <Globe className="w-8 h-8 opacity-30 mx-auto mb-2 text-cyan-400" />
                  <p className="text-xs">Dev server is not currently running.</p>
                  <button
                    onClick={handleStartApp}
                    className="mt-2 text-[11px] text-cyan-400 hover:underline"
                  >
                    Start Dev Server (npm run dev)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Problems Tab */}
        {activeTab === 'problems' && (
          <div className="h-full overflow-y-auto p-2 font-mono text-[11px]">
            {diagnostics.length === 0 ? (
              <div className="h-full flex items-center justify-center text-neutral-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                <span>No problems detected in workspace.</span>
              </div>
            ) : (
              <div className="space-y-1">
                {diagnostics.map((diag, index) => (
                  <div
                    key={index}
                    onClick={() => onOpenProblemFile?.(diag.file)}
                    className="flex items-center gap-2 p-1.5 hover:bg-[#252526] rounded cursor-pointer group"
                  >
                    {diag.severity === 'error' ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className="text-neutral-200 flex-1 truncate">{diag.message}</span>
                    <span className="text-neutral-500 text-[10px]">
                      {diag.file}:{diag.line}:{diag.col}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Output Tab */}
        {activeTab === 'output' && (
          <div className="h-full p-2 font-mono text-[11px] text-neutral-300 overflow-y-auto space-y-1 select-text">
            <div className="text-neutral-500">[NEXORA Core Daemon]: Operational on 127.0.0.1:4000</div>
            <div className="text-neutral-500">[Workspace Path]: {currentWorkspace?.rootPath || 'None'}</div>
            <div className="text-neutral-500">[Vite Frontend]: http://localhost:5173</div>
            {sessions.flatMap((s) => s.logs).slice(-20).map((l, i) => (
              <div key={i} className="text-neutral-400 truncate">{l}</div>
            ))}
          </div>
        )}

        {/* 5. Debug Console Tab */}
        {activeTab === 'debug' && (
          <div className="h-full flex flex-col p-2 font-mono text-[11px] select-text">
            <div className="flex-1 overflow-y-auto space-y-1">
              {debugLogs.map((l, i) => (
                <div key={i} className={l.startsWith('>') ? 'text-cyan-400 font-semibold' : 'text-neutral-300'}>
                  {l}
                </div>
              ))}
            </div>
            <form onSubmit={handleDebugEvaluate} className="flex items-center gap-2 border-t border-[#2d2d2d] pt-1">
              <span className="text-cyan-400 font-bold">&gt;</span>
              <input
                type="text"
                placeholder="Evaluate expression..."
                value={debugInput}
                onChange={(e) => setDebugInput(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-neutral-100 placeholder-neutral-500 font-mono text-xs"
              />
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
