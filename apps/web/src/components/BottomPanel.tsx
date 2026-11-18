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
    'NEXORA AI Workspace Sandbox Environment Ready.',
    'Execution sandbox: Active host workspace isolation.',
    'Docker status: NOT_INSTALLED (Local runtime execution).',
    'Language runtime: Node.js 22.23.2.',
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
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [currentProjectId, accessToken]);

  const handleRunCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || isExecuting) return;

    const cmd = commandInput.trim();
    setLogs((prev) => [...prev, `$ ${cmd}`]);
    setCommandInput('');
    setIsExecuting(true);

    try {
      if (!currentProjectId || !accessToken) {
        setLogs((prev) => [
          ...prev,
          '[Error]: No project workspace active or missing authentication.',
        ]);
        return;
      }

      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ projectId: currentProjectId, command: cmd }),
      });

      const data = await res.json();
      if (res.ok && data.result) {
        if (data.result.stdout) {
          setLogs((prev) => [...prev, data.result.stdout.trim()]);
        }
        if (data.result.stderr) {
          setLogs((prev) => [...prev, `[stderr]: ${data.result.stderr.trim()}`]);
        }
        setLogs((prev) => [
          ...prev,
          `[Process exited with code ${data.result.exitCode} (${data.result.durationMs}ms)]`,
        ]);
      } else {
        setLogs((prev) => [...prev, `[Execution error]: ${data.error || 'Command failed'}`]);
      }
    } catch (err: unknown) {
      setLogs((prev) => [
        ...prev,
        `[Terminal error]: ${err instanceof Error ? err.message : String(err)}`,
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStartApp = async () => {
    if (!currentProjectId || !accessToken) return;
    setIsLoadingApp(true);
    setLogs((prev) => [...prev, `$ npm run dev (Starting preview server on port ${appPort})...`]);

    try {
      const res = await fetch('/api/terminal/process/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          command: 'npm run dev',
          port: appPort,
        }),
      });

      const data = await res.json();
      if (res.ok && data.process) {
        setIsAppRunning(true);
        setPreviewUrl(data.process.previewUrl);
        setLogs((prev) => [
          ...prev,
          `[Live Preview]: Application running at ${data.process.previewUrl}`,
        ]);
      } else {
        setLogs((prev) => [...prev, `[Process error]: ${data.error || 'Failed to start process'}`]);
      }
    } catch (err: unknown) {
      setLogs((prev) => [
        ...prev,
        `[Process error]: ${err instanceof Error ? err.message : String(err)}`,
      ]);
    } finally {
      setIsLoadingApp(false);
    }
  };

  const handleStopApp = async () => {
    if (!currentProjectId || !accessToken) return;
    try {
      await fetch(`/api/terminal/process/${currentProjectId}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setIsAppRunning(false);
      setLogs((prev) => [...prev, '[Live Preview]: Dev server stopped.']);
    } catch {}
  };

  const handleClearLogs = () => {
    setLogs([]);
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
                ? 'border-indigo-500 bg-[#1e1e1e] text-white'
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
                ? 'border-indigo-500 bg-[#1e1e1e] text-white'
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
                ? 'border-indigo-500 bg-[#1e1e1e] text-white'
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
                ? 'border-indigo-500 bg-[#1e1e1e] text-white'
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
                ? 'border-indigo-500 bg-[#1e1e1e] text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Debug Console</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'terminal' && (
            <button
              onClick={handleClearLogs}
              title="Clear Terminal"
              className="p-1 hover:bg-[#333333] rounded text-neutral-400 hover:text-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
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
        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
          <div className="h-full flex flex-col p-2 font-mono text-[11px] leading-relaxed select-text">
            <div className="flex-1 overflow-y-auto space-y-1">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`${
                    log.startsWith('$')
                      ? 'text-indigo-400 font-semibold'
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
                disabled={isExecuting}
                placeholder="npm test, python app.py, ls, node -v..."
                className="flex-1 bg-transparent border-none outline-none text-neutral-100 placeholder-neutral-500 font-mono text-xs"
              />
              {isExecuting && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
            </form>
          </div>
        )}

        {/* Live Preview Tab */}
        {activeTab === 'preview' && (
          <div className="h-full flex flex-col bg-[#141414]">
            {/* Toolbar */}
            <div className="h-9 border-b border-[#2d2d2d] bg-[#1a1a1a] flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                {!isAppRunning ? (
                  <button
                    onClick={handleStartApp}
                    disabled={isLoadingApp}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition-colors"
                  >
                    {isLoadingApp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>Start Dev Server</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopApp}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-medium transition-colors"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop Server</span>
                  </button>
                )}

                <div className="flex items-center gap-1 border border-[#333] rounded px-2 py-0.5 text-xs text-neutral-300 bg-[#111]">
                  <span>{previewUrl}</span>
                </div>
              </div>

              {/* Responsive Device Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-[#333] text-white' : 'text-neutral-400 hover:text-white'}`}
                  title="Desktop View"
                >
                  <Laptop className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1 rounded ${previewDevice === 'tablet' ? 'bg-[#333] text-white' : 'text-neutral-400 hover:text-white'}`}
                  title="Tablet View (768px)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-[#333] text-white' : 'text-neutral-400 hover:text-white'}`}
                  title="Mobile View (375px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Iframe Preview Container */}
            <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center p-2 overflow-auto">
              {isAppRunning ? (
                <div
                  className={`h-full bg-white transition-all duration-200 shadow-xl overflow-hidden rounded-md border border-[#333] ${
                    previewDevice === 'desktop'
                      ? 'w-full'
                      : previewDevice === 'tablet'
                      ? 'w-[768px]'
                      : 'w-[375px]'
                  }`}
                >
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title="Live Preview"
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                </div>
              ) : (
                <div className="text-center text-neutral-500 text-xs">
                  <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Local dev server is not running.</p>
                  <p className="text-[10px] text-neutral-600 mt-1">Click "Start Dev Server" to launch preview on port {appPort}.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Problems Tab */}
        {activeTab === 'problems' && (
          <div className="h-full overflow-y-auto p-3 text-xs">
            {diagnostics.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>No problems detected in workspace files.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {diagnostics.map((diag, index) => (
                  <div
                    key={index}
                    onClick={() => onOpenProblemFile && onOpenProblemFile(diag.file)}
                    className="flex items-start gap-2 p-1.5 hover:bg-[#2a2a2a] rounded cursor-pointer transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-neutral-200">{diag.message}</div>
                      <div className="text-[10px] text-neutral-500">
                        {diag.file} [{diag.line}:{diag.col}]
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Output Tab */}
        {activeTab === 'output' && (
          <div className="h-full p-3 font-mono text-xs text-neutral-400 overflow-y-auto">
            <p className="text-neutral-500">// TypeScript language server & build logs</p>
            <p className="mt-1 text-emerald-400">[Info]: Language server initialized for project workspace.</p>
          </div>
        )}

        {/* Debug Console Tab */}
        {activeTab === 'debug' && (
          <div className="h-full p-3 font-mono text-xs text-neutral-400 overflow-y-auto">
            <p className="text-neutral-500">// Debug adapter session ready</p>
            <p className="mt-1 text-neutral-400">Type expressions to evaluate in active context.</p>
          </div>
        )}
      </div>
    </div>
  );
}
