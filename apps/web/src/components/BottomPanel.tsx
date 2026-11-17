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
} from 'lucide-react';
import { useIdeStore } from '../store/ideStore';
import { useAuthStore } from '../store/authStore';

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
    'TypeScript language service connected (0 compile errors).',
  ],
  onOpenProblemFile,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'output' | 'problems' | 'debug' | 'preview'>('terminal');
  const [commandInput, setCommandInput] = useState('');
  const [logs, setLogs] = useState<string[]>(terminalLogs);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewUrl, setPreviewUrl] = useState('http://localhost:3000');
  const [isAppRunning, setIsAppRunning] = useState(false);
  const [appPort, setAppPort] = useState(3000);
  const [isLoadingApp, setIsLoadingApp] = useState(false);

  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { diagnostics, currentProjectId } = useIdeStore();
  const { accessToken } = useAuthStore();

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Check running process status on mount or project switch
  useEffect(() => {
    if (!currentProjectId || !accessToken) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/terminal/process/${currentProjectId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
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
  }, [currentProjectId, accessToken]);

  // Execute terminal command via real sandbox backend
  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || isExecuting) return;

    const cmd = commandInput.trim();
    setCommandInput('');
    setLogs((prev) => [...prev, `$ ${cmd}`]);
    setIsExecuting(true);

    if (!currentProjectId) {
      setLogs((prev) => [...prev, '[Sandbox Warning]: No active workspace selected. Select a project in the Activity Bar.']);
      setIsExecuting(false);
      return;
    }

    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ projectId: currentProjectId, command: cmd }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setLogs((prev) => [...prev, `[Sandbox Error ${res.status}]: ${errData.error || res.statusText}`]);
      } else {
        const data = await res.json();
        const output = data.result?.stdout || data.result?.stderr || `Exit code: ${data.result?.exitCode ?? 0}`;
        setLogs((prev) => [...prev, output]);
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `[Execution Network Error]: ${err.message}`]);
    } finally {
      setIsExecuting(false);
    }
  };

  // Start Live Preview Process
  const handleStartApp = async () => {
    if (!currentProjectId) {
      setLogs((prev) => [...prev, '[Preview Error]: Open a project first before launching live preview.']);
      return;
    }

    setIsLoadingApp(true);
    try {
      const res = await fetch('/api/terminal/process/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          command: 'npm run dev',
          port: appPort,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsAppRunning(true);
        setPreviewUrl(data.process.previewUrl);
        setLogs((prev) => [
          ...prev,
          `🚀 [Application Runner]: Launched "${data.process.command}" on port ${data.process.port}`,
          `🌐 [Live Preview]: Accessible at ${data.process.previewUrl}`,
        ]);
        setActiveTab('preview');
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `[Runner Error]: Failed to start application: ${err.message}`]);
    } finally {
      setIsLoadingApp(false);
    }
  };

  // Stop Live Preview Process
  const handleStopApp = async () => {
    if (!currentProjectId) return;
    setIsLoadingApp(true);
    try {
      const res = await fetch(`/api/terminal/process/${currentProjectId}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setIsAppRunning(false);
        setLogs((prev) => [...prev, `🛑 [Application Runner]: Development server stopped.`]);
      }
    } catch {}
    finally {
      setIsLoadingApp(false);
    }
  };

  const handleRefreshPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const clearCurrentTab = () => {
    if (activeTab === 'terminal') setLogs([]);
  };

  return (
    <div className="h-64 bg-[#181818] border-t border-[#2d2d2d] flex flex-col select-none text-xs z-30">
      {/* 1. Header Toolbar */}
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
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 flex items-center gap-1.5 font-medium transition-colors ${
              activeTab === 'preview'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Live Preview
            {isAppRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
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

        {/* Process start/stop and action controls */}
        <div className="flex items-center gap-2">
          {/* App execution button */}
          {isAppRunning ? (
            <button
              onClick={handleStopApp}
              disabled={isLoadingApp}
              className="px-2 py-0.5 rounded bg-red-950/60 border border-red-800/80 hover:bg-red-900/80 text-red-300 flex items-center gap-1 text-[11px] transition-colors"
            >
              {isLoadingApp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3 fill-current" />}
              <span>Stop App</span>
            </button>
          ) : (
            <button
              onClick={handleStartApp}
              disabled={isLoadingApp}
              className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/80 hover:bg-emerald-900/80 text-emerald-300 flex items-center gap-1 text-[11px] transition-colors"
            >
              {isLoadingApp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
              <span>Run App</span>
            </button>
          )}

          <div className="h-3 w-[1px] bg-[#333]" />

          <button
            onClick={clearCurrentTab}
            title="Clear Panel"
            className="p-1 hover:text-white hover:bg-[#2b2b2b] text-neutral-400 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Panel"
              className="p-1 hover:text-white hover:bg-[#2b2b2b] text-neutral-400 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Tab Contents */}
      <div className="flex-1 overflow-hidden bg-[#141414] text-neutral-300">
        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
          <div className="flex flex-col h-full justify-between p-3 font-mono text-[11px]">
            <div className="space-y-1 overflow-y-auto flex-1 pr-1">
              {logs.map((log, i) => (
                <div key={i} className="text-neutral-300 whitespace-pre-wrap break-all">
                  {log.startsWith('$') ? (
                    <span className="text-cyan-400 font-bold">{log}</span>
                  ) : (
                    log
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            <form onSubmit={handleCommandSubmit} className="mt-2 pt-2 border-t border-[#222] flex items-center gap-2">
              <span className="text-cyan-400 font-bold">$</span>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                disabled={isExecuting}
                placeholder="Type command (e.g. npm test, ls, node index.js)..."
                className="w-full bg-transparent text-neutral-100 placeholder-neutral-600 focus:outline-none"
              />
              {isExecuting && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />}
            </form>
          </div>
        )}

        {/* Live Preview Tab */}
        {activeTab === 'preview' && (
          <div className="flex flex-col h-full bg-[#111]">
            {/* Preview Toolbar */}
            <div className="h-8 bg-[#1a1a1a] border-b border-[#2a2a2a] px-3 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-neutral-400 bg-[#141414] px-2 py-0.5 rounded border border-[#2e2e2e]">
                  {previewUrl}
                </span>
                <button
                  onClick={handleRefreshPreview}
                  title="Reload preview"
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[#252525]"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open in new window"
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[#252525]"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Viewport Width Controls */}
              <div className="flex items-center gap-1 bg-[#141414] p-0.5 rounded border border-[#2e2e2e]">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  title="Desktop (100%)"
                  className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-[#292929] text-cyan-400' : 'text-neutral-500'}`}
                >
                  <Laptop className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  title="Tablet (768px)"
                  className={`p-1 rounded ${previewDevice === 'tablet' ? 'bg-[#292929] text-cyan-400' : 'text-neutral-500'}`}
                >
                  <Tablet className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  title="Mobile (375px)"
                  className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-[#292929] text-cyan-400' : 'text-neutral-500'}`}
                >
                  <Smartphone className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Preview Display Area */}
            <div className="flex-1 bg-[#0d0d0d] flex items-center justify-center overflow-auto p-2">
              {isAppRunning ? (
                <div
                  className={`h-full bg-white transition-all shadow-2xl rounded overflow-hidden ${
                    previewDevice === 'mobile'
                      ? 'w-[375px]'
                      : previewDevice === 'tablet'
                      ? 'w-[768px]'
                      : 'w-full'
                  }`}
                >
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title="Live App Preview"
                    className="w-full h-full border-none bg-white"
                  />
                </div>
              ) : (
                <div className="text-center p-6 text-neutral-500 space-y-2">
                  <Globe className="w-8 h-8 mx-auto text-neutral-600" />
                  <p className="font-semibold text-neutral-400 text-xs">Development Server Not Running</p>
                  <p className="text-[11px] max-w-xs text-neutral-500">
                    Click "Run App" above to launch the application in the sandboxed runner and preview your changes live.
                  </p>
                  <button
                    onClick={handleStartApp}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium"
                  >
                    Start Dev Server
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Problems Tab */}
        {activeTab === 'problems' && (
          <div className="p-3 space-y-2 font-mono text-[11px]">
            {diagnostics.length === 0 ? (
              <div className="text-neutral-500 py-4 text-center font-sans">
                No problems have been detected in the workspace.
              </div>
            ) : (
              diagnostics.map((d, i) => (
                <div
                  key={i}
                  onClick={() => onOpenProblemFile && onOpenProblemFile(d.file)}
                  className="p-2 rounded bg-[#1e1e1e] border border-[#2a2a2a] hover:bg-[#252525] cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-neutral-200">{d.message}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {d.file}:{d.line}:{d.col}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Output Tab */}
        {activeTab === 'output' && (
          <div className="p-3 font-mono text-[11px] space-y-1">
            <div className="text-neutral-400 font-semibold">[Workspace Diagnostic Service]</div>
            <div className="text-neutral-500">Watching files for changes...</div>
            <div className="text-emerald-400">✓ Language Server Protocol (LSP) active: TypeScript v5.7</div>
          </div>
        )}

        {/* Debug Console */}
        {activeTab === 'debug' && (
          <div className="p-3 font-mono text-[11px] text-neutral-500">
            Debug session not active. Launch debugger via Run & Debug menu.
          </div>
        )}
      </div>
    </div>
  );
}
