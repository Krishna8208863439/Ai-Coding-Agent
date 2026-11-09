import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, Badge, Button } from '@nexora/ui';
import { useAuthStore } from '../store/authStore';
import { Terminal as TerminalIcon, Play, Shield, Cpu, RefreshCw, Layers, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SandboxStatus {
  status: string;
  isolation: string;
  cpuLimit: string;
  memoryLimit: string;
  containers: Array<{ name: string; image: string; status: string }>;
}

export function TerminalPage() {
  const { accessToken } = useAuthStore();
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [command, setCommand] = useState('npm test');
  const [logs, setLogs] = useState<string[]>([
    'NEXORA AI Container Sandbox Runner initialized.',
    'Docker Isolation: Active (uid=1001, read-only root, 1.5 CPUs, 1024MB Memory).',
    'Ready for sandboxed execution.',
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [sandboxInfo, setSandboxInfo] = useState<SandboxStatus | null>(null);

  const fetchStatusAndProjects = async () => {
    try {
      const statusRes = await fetch('/api/terminal/status');
      if (statusRes.ok) {
        const data = await statusRes.json();
        setSandboxInfo(data.sandbox);
      }

      if (accessToken) {
        const projRes = await fetch('/api/projects', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (projRes.ok) {
          const data = await projRes.json();
          setProjects(data.projects || []);
          if (data.projects?.length > 0 && !selectedProjectId) {
            setSelectedProjectId(data.projects[0].id);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStatusAndProjects();
  }, [accessToken]);

  const handleExecute = async (cmdToRun?: string) => {
    const finalCmd = cmdToRun || command;
    if (!finalCmd.trim() || !selectedProjectId || !accessToken) return;

    setIsRunning(true);
    setLogs((prev) => [...prev, `$ ${finalCmd}`]);

    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          command: finalCmd,
        }),
      });

      const data = await res.json();
      if (data.result) {
        const { stdout, stderr, exitCode, durationMs } = data.result;
        if (stdout) setLogs((prev) => [...prev, stdout]);
        if (stderr) setLogs((prev) => [...prev, stderr]);
        setLogs((prev) => [
          ...prev,
          `[Process completed with code ${exitCode} in ${durationMs}ms]`,
        ]);
      } else if (data.error) {
        setLogs((prev) => [...prev, `Error: ${data.error}`]);
      }
    } catch (err: unknown) {
      setLogs((prev) => [...prev, `Execution error: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2433] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TerminalIcon className="h-6 w-6 text-indigo-400" />
            Integrated Container Sandbox & Terminal
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Execute applications, run test suites, and install verified dependencies inside isolated Docker runners.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">Docker Sandbox Ready</Badge>
          <Badge variant="outline">Non-Root (1001)</Badge>
        </div>
      </div>

      {/* Resource & Isolation Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#1f2433] bg-[#0d0f17] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 mb-1">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>Process Isolation</span>
          </div>
          <p className="text-xs text-neutral-400">Read-Only Root Filesystem</p>
          <span className="font-mono text-[11px] text-indigo-400 mt-1 block">cgroups v2 + seccomp</span>
        </div>

        <div className="rounded-xl border border-[#1f2433] bg-[#0d0f17] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 mb-1">
            <Cpu className="h-4 w-4 text-indigo-400" />
            <span>Resource Quotas</span>
          </div>
          <p className="text-xs text-neutral-400">1.5 CPU Cores • 1024 MB RAM</p>
          <span className="font-mono text-[11px] text-emerald-400 mt-1 block">15s execution timeout</span>
        </div>

        <div className="rounded-xl border border-[#1f2433] bg-[#0d0f17] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 mb-1">
            <Layers className="h-4 w-4 text-violet-400" />
            <span>Active Target</span>
          </div>
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full mt-1 rounded bg-[#090a0f] border border-[#1f2433] px-2 py-1 text-xs text-white focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Execution Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-neutral-400">Quick Sandbox Presets:</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setCommand('npm test'); handleExecute('npm test'); }}
          disabled={isRunning || !selectedProjectId}
          className="text-xs h-7 gap-1"
        >
          <Play className="h-3 w-3" />
          <span>npm test</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setCommand('npm run build'); handleExecute('npm run build'); }}
          disabled={isRunning || !selectedProjectId}
          className="text-xs h-7 gap-1"
        >
          <Play className="h-3 w-3" />
          <span>npm run build</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setCommand('node -v'); handleExecute('node -v'); }}
          disabled={isRunning || !selectedProjectId}
          className="text-xs h-7 gap-1"
        >
          <Play className="h-3 w-3" />
          <span>node -v</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setCommand('pwd'); handleExecute('pwd'); }}
          disabled={isRunning || !selectedProjectId}
          className="text-xs h-7 gap-1"
        >
          <Play className="h-3 w-3" />
          <span>pwd</span>
        </Button>
      </div>

      {/* Terminal Display */}
      <div className="rounded-xl border border-[#1f2433] bg-[#090a0f] flex flex-col h-96 overflow-hidden shadow-2xl">
        <div className="border-b border-[#1f2433] bg-[#131620] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 font-mono text-xs text-neutral-400">nexora-sandbox-runner@pty0</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLogs([])} className="text-[11px] h-6 px-2 text-neutral-400">
            Clear Console
          </Button>
        </div>

        <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1 text-neutral-300">
          {logs.map((log, idx) => (
            <div key={idx} className="whitespace-pre-wrap leading-relaxed">
              {log}
            </div>
          ))}
          {isRunning && (
            <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
              <span>Executing sandboxed process...</span>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleExecute(); }}
          className="border-t border-[#1f2433] p-3 bg-[#0d0f17] flex gap-2"
        >
          <span className="font-mono text-xs text-indigo-400 py-2 pl-1 select-none">$</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter sandboxed command (e.g. npm test, ls, node -v)..."
            disabled={isRunning}
            className="flex-1 bg-transparent font-mono text-xs text-white placeholder-neutral-500 focus:outline-none"
          />
          <Button variant="primary" size="sm" type="submit" disabled={isRunning} className="gap-1 px-4">
            <Play className="h-3 w-3" />
            <span>Run</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

