import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Square,
  RotateCw,
  Terminal,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Bug,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Flame,
} from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useLayoutStore } from '../store/layoutStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { useAuthStore } from '../store/authStore';

interface DetectedScripts {
  hasScripts: boolean;
  scripts: Record<string, string>;
  runtimes: string[];
}

interface ActiveProcessInfo {
  id: string;
  command: string;
  port: number;
  pid: number | undefined;
  status: 'STARTING' | 'RUNNING' | 'STOPPED' | 'ERROR';
  previewUrl: string;
  logs: string[];
  startedAt: string;
}

interface RunAndDebugSidebarProps {
  onRunScript?: (command: string) => void;
}

export function RunAndDebugSidebar({ onRunScript }: RunAndDebugSidebarProps) {
  const { currentWorkspace } = useWorkspaceStore();
  const { setActiveBottomPanelTab, toggleBottomPanel, isBottomPanelOpen } = useLayoutStore();
  const { addToast } = usePreferencesStore();
  const { accessToken } = useAuthStore();

  const [scriptsData, setScriptsData] = useState<DetectedScripts | null>(null);
  const [activeProcess, setActiveProcess] = useState<ActiveProcessInfo | null>(null);
  const [customCommand, setCustomCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Sections
  const [scriptsCollapsed, setScriptsCollapsed] = useState(false);
  const [processCollapsed, setProcessCollapsed] = useState(false);
  const [watchCollapsed, setWatchCollapsed] = useState(false);
  const [breakpointsCollapsed, setBreakpointsCollapsed] = useState(false);

  // Watch expressions
  const [watchList, setWatchList] = useState<string[]>(['window.location', 'process.env.NODE_ENV']);
  const [newWatchInput, setNewWatchInput] = useState('');
  const [isAddingWatch, setIsAddingWatch] = useState(false);

  // Fetch detected scripts in workspace
  const fetchScripts = useCallback(async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/terminal/scripts?root=${encodeURIComponent(currentWorkspace.rootPath)}`, {
        headers: { Authorization: `Bearer ${accessToken || 'dev'}` },
      });
      if (res.ok) {
        const data = await res.json();
        setScriptsData(data);
      }
    } catch {}
    finally {
      setIsLoading(false);
    }
  }, [currentWorkspace, accessToken]);

  // Poll active running process status
  const checkProcessStatus = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const res = await fetch(`/api/terminal/process?root=${encodeURIComponent(currentWorkspace.rootPath)}`, {
        headers: { Authorization: `Bearer ${accessToken || 'dev'}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveProcess(data.process);
      }
    } catch {}
  }, [currentWorkspace, accessToken]);

  useEffect(() => {
    fetchScripts();
    checkProcessStatus();
    const interval = setInterval(checkProcessStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchScripts, checkProcessStatus]);

  // Start process
  const handleStartProcess = async (commandToRun?: string) => {
    if (!currentWorkspace) return;
    const cmd = commandToRun || customCommand.trim() || 'npm run dev';
    setIsStarting(true);

    try {
      const res = await fetch('/api/terminal/process/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken || 'dev'}`,
        },
        body: JSON.stringify({
          root: currentWorkspace.rootPath,
          command: cmd,
          port: 3000,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveProcess(data.process);
        addToast('Process Started', `${cmd} (PID ${data.process.pid || 'Active'})`, 'success');

        // Automatically open bottom panel to terminal
        setActiveBottomPanelTab('terminal');
        if (!isBottomPanelOpen) toggleBottomPanel();
      } else {
        const err = await res.json();
        addToast('Launch Failed', err.message || 'Cannot start process', 'error');
      }
    } catch (err: any) {
      addToast('Process Error', err.message, 'error');
    } finally {
      setIsStarting(false);
    }
  };

  // Stop process
  const handleStopProcess = async () => {
    if (!currentWorkspace) return;
    try {
      const res = await fetch('/api/terminal/process/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken || 'dev'}`,
        },
        body: JSON.stringify({ root: currentWorkspace.rootPath }),
      });
      if (res.ok) {
        setActiveProcess(null);
        addToast('Process Stopped', 'Active execution process terminated.', 'info');
      }
    } catch (err: any) {
      addToast('Stop Error', err.message, 'error');
    }
  };

  // Restart process
  const handleRestartProcess = async () => {
    await handleStopProcess();
    await handleStartProcess(activeProcess?.command);
  };

  // Open live preview in bottom panel
  const handleOpenLivePreview = () => {
    setActiveBottomPanelTab('preview');
    if (!isBottomPanelOpen) toggleBottomPanel();
  };

  // Watch expression handlers
  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchInput.trim()) return;
    setWatchList([...watchList, newWatchInput.trim()]);
    setNewWatchInput('');
    setIsAddingWatch(false);
  };

  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-500 text-xs select-none">
        <Bug className="w-8 h-8 opacity-40 mb-2 text-cyan-400" />
        <span className="font-semibold text-neutral-300 mb-1">No Folder Open</span>
        <span className="text-[11px] text-neutral-500">Open a workspace folder to run and debug scripts.</span>
      </div>
    );
  }

  const isRunning = activeProcess && activeProcess.status === 'RUNNING';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#181818] text-xs select-none overflow-hidden">
      {/* Header Toolbar */}
      <div className="h-9 px-3 border-b border-[#2b2b2b] flex items-center justify-between text-neutral-400 font-semibold uppercase text-[10px] tracking-wider shrink-0">
        <div className="flex items-center gap-1.5">
          <Bug className="w-3.5 h-3.5 text-cyan-400" />
          <span>Run & Debug</span>
        </div>

        {/* Global Debug Action Controls */}
        <div className="flex items-center gap-1">
          {!isRunning ? (
            <button
              onClick={() => handleStartProcess()}
              disabled={isStarting}
              title="Start Debugging (F5)"
              className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-[#2b2b2b] rounded transition-colors disabled:opacity-40"
            >
              {isStarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
          ) : (
            <>
              <button
                onClick={handleRestartProcess}
                title="Restart Process (Ctrl+Shift+F5)"
                className="p-1 text-amber-400 hover:text-amber-300 hover:bg-[#2b2b2b] rounded transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleStopProcess}
                title="Stop Process (Shift+F5)"
                className="p-1 text-red-400 hover:text-red-300 hover:bg-[#2b2b2b] rounded transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Active Process Status Card */}
        {isRunning && (
          <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/50 rounded space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Running (PID {activeProcess.pid})</span>
              </span>
              <button
                onClick={handleOpenLivePreview}
                className="text-cyan-400 hover:underline flex items-center gap-1 text-[10px]"
              >
                <span>Live Preview</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="text-[10px] font-mono text-neutral-300 truncate">
              {activeProcess.command}
            </div>
            <div className="text-[10px] text-neutral-400 flex items-center justify-between font-mono pt-1 border-t border-emerald-900/40">
              <span>Port: {activeProcess.port}</span>
              <span>Started: {new Date(activeProcess.startedAt).toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* Custom Launch Command Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
            Launch Command
          </label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="e.g. npm run dev, node server.js"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleStartProcess(customCommand);
              }}
              className="flex-1 bg-[#141414] border border-[#333] focus:border-cyan-500 rounded px-2.5 py-1 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none font-mono"
            />
            <button
              onClick={() => handleStartProcess(customCommand)}
              disabled={isStarting}
              title="Run custom command"
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded font-medium transition-colors shrink-0"
            >
              Run
            </button>
          </div>
        </div>

        {/* Detected Workspace Scripts Section */}
        <div>
          <div
            onClick={() => setScriptsCollapsed(!scriptsCollapsed)}
            className="flex items-center justify-between py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-neutral-200 transition-colors"
          >
            <div className="flex items-center gap-1">
              {scriptsCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>Workspace Scripts</span>
              {scriptsData?.runtimes && (
                <span className="text-[9px] text-cyan-400 lowercase font-mono">
                  ({scriptsData.runtimes.join(', ')})
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchScripts();
              }}
              className="hover:text-white"
              title="Refresh scripts"
            >
              <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {!scriptsCollapsed && (
            <div className="mt-1 space-y-1">
              {scriptsData?.scripts && Object.keys(scriptsData.scripts).length > 0 ? (
                Object.entries(scriptsData.scripts).map(([name, cmd]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-1.5 bg-[#202020] hover:bg-[#252526] rounded group transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate flex-1 mr-2">
                      <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-neutral-200 font-mono block text-[11px] truncate">
                          {name}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono block truncate">
                          {cmd}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartProcess(`npm run ${name}`)}
                      title={`Run npm run ${name}`}
                      className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-[#333] rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-2 text-[10px] text-neutral-500 text-center font-mono">
                  No scripts detected in workspace
                </div>
              )}
            </div>
          )}
        </div>

        {/* Watch Expressions */}
        <div>
          <div
            onClick={() => setWatchCollapsed(!watchCollapsed)}
            className="flex items-center justify-between py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-neutral-200 transition-colors"
          >
            <div className="flex items-center gap-1">
              {watchCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>Watch</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingWatch(true);
              }}
              className="hover:text-white"
              title="Add expression"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {!watchCollapsed && (
            <div className="mt-1 space-y-1">
              {isAddingWatch && (
                <form onSubmit={handleAddWatch} className="flex items-center gap-1 mb-1">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Expression to watch"
                    value={newWatchInput}
                    onChange={(e) => setNewWatchInput(e.target.value)}
                    className="flex-1 bg-[#141414] border border-cyan-500 rounded px-1.5 py-0.5 text-[11px] text-neutral-100 font-mono focus:outline-none"
                  />
                  <button type="submit" className="text-[10px] text-cyan-400 hover:text-cyan-300">
                    Add
                  </button>
                </form>
              )}

              {watchList.map((expr, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2 py-1 bg-[#1c1c1c] rounded font-mono text-[11px] text-neutral-300 group"
                >
                  <span className="truncate">{expr}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-500">not available</span>
                    <button
                      onClick={() => setWatchList(watchList.filter((_, i) => i !== idx))}
                      className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Breakpoints */}
        <div>
          <div
            onClick={() => setBreakpointsCollapsed(!breakpointsCollapsed)}
            className="flex items-center justify-between py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-neutral-200 transition-colors"
          >
            <div className="flex items-center gap-1">
              {breakpointsCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>Breakpoints</span>
            </div>
          </div>

          {!breakpointsCollapsed && (
            <div className="mt-1 p-2 bg-[#1c1c1c] rounded text-[11px] text-neutral-500 text-center font-mono">
              No breakpoints set in editor. Click the margin to set breakpoints.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
